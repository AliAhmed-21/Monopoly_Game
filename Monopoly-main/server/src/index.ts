import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessage,
} from "@monopoly/shared";
import { RoomManager } from "./rooms.js";
import { listMaps } from "./maps/index.js";
import type { Game } from "./engine/game.js";

interface SocketData {
  roomCode?: string;
  playerId?: string;
}

const PORT = Number(process.env.PORT ?? 3001);
const ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const httpServer = createServer((req, res) => {
  // Simple health check for hosting platforms (Render/Fly, README §12).
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Monopoly game server is running.");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(
  httpServer,
  { cors: { origin: ORIGIN, methods: ["GET", "POST"] } }
);

const rooms = new RoomManager();

/** Push the full GameState to everyone in a room (README §5 — broadcast). */
function broadcast(game: Game): void {
  io.to(game.state.roomCode).emit("state:update", game.state);
}

// ── Auction countdown timers ──────────────────────────────────────────────────
// The game engine is synchronous and has no reference to `io`, so the auction
// countdown lives here. One pending timer per room; each bid re-arms it.
const auctionTimers = new Map<string, NodeJS.Timeout>();

function clearAuctionTimer(roomCode: string): void {
  const t = auctionTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    auctionTimers.delete(roomCode);
  }
}

/**
 * (Re)schedule the auction resolution to fire at `activeAuction.endsAt`. Call
 * after any intent that may start an auction or move its deadline. If there is
 * no active auction, this just clears any stale timer.
 */
function armAuctionTimer(game: Game): void {
  const code = game.state.roomCode;
  clearAuctionTimer(code);
  const auction = game.state.activeAuction;
  if (!auction) return;
  const delay = Math.max(0, auction.endsAt - Date.now());
  auctionTimers.set(
    code,
    setTimeout(() => {
      auctionTimers.delete(code);
      game.auctionResolve();
      broadcast(game);
    }, delay)
  );
}

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) => {
  socket.emit("maps:list", listMaps());

  const gameForSocket = (): Game | undefined =>
    socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined;

  /** Run an intent: on error tell just this socket, on success broadcast. */
  const run = (fn: (game: Game, playerId: string) => string | null): void => {
    const game = gameForSocket();
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      socket.emit("error:message", "You're not in a game.");
      return;
    }
    const err = fn(game, playerId);
    if (err) socket.emit("error:message", err);
    else broadcast(game);
  };

  // ── Room lifecycle ────────────────────────────────────────────────────────
  socket.on("room:create", ({ name }, cb) => {
    const game = rooms.create(name, socket.id);
    const playerId = game.state.hostId;
    socket.data.roomCode = game.state.roomCode;
    socket.data.playerId = playerId;
    socket.join(game.state.roomCode);
    cb({ ok: true, data: { roomCode: game.state.roomCode, playerId } });
    socket.emit("you:are", playerId);
    broadcast(game);
  });

  socket.on("room:join", ({ roomCode, name }, cb) => {
    const game = rooms.get(roomCode);
    if (!game) return cb({ ok: false, error: "Room not found." });
    const res = game.addPlayer(name, socket.id);
    if ("error" in res) return cb({ ok: false, error: res.error });
    socket.data.roomCode = game.state.roomCode;
    socket.data.playerId = res.playerId;
    socket.join(game.state.roomCode);
    cb({ ok: true, data: { roomCode: game.state.roomCode, playerId: res.playerId } });
    socket.emit("you:are", res.playerId);
    broadcast(game);
  });

  socket.on("room:reconnect", ({ roomCode, playerId }, cb) => {
    const game = rooms.get(roomCode);
    if (!game) return cb({ ok: false, error: "Room not found." });
    if (!game.reconnect(playerId, socket.id))
      return cb({ ok: false, error: "Player not found in room." });
    socket.data.roomCode = game.state.roomCode;
    socket.data.playerId = playerId;
    socket.join(game.state.roomCode);
    cb({ ok: true, data: { roomCode: game.state.roomCode, playerId } });
    socket.emit("you:are", playerId);
    broadcast(game);
  });

  socket.on("room:leave", () => {
    const game = gameForSocket();
    if (!game) return;
    const code = game.state.roomCode;
    game.disconnect(socket.id);
    socket.leave(code);
    broadcast(game);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    rooms.cleanup();
    if (!rooms.get(code)) clearAuctionTimer(code);
  });

  // ── Lobby ─────────────────────────────────────────────────────────────────
  socket.on("lobby:updateSettings", (partial) =>
    run((game, pid) => game.updateSettings(pid, partial))
  );
  socket.on("lobby:start", () => run((game, pid) => game.start(pid)));

  // ── Chat ──────────────────────────────────────────────────────────────────
  socket.on("chat:send", ({ text }) => {
    const game = gameForSocket();
    const pid = socket.data.playerId;
    if (!game || !pid) return;
    const player = game.state.players.find((p) => p.id === pid);
    if (!player) return;
    const clean = String(text ?? "").trim().slice(0, 300);
    if (!clean) return;
    const msg: ChatMessage = {
      playerId: pid,
      playerName: player.name,
      text: clean,
      ts: Date.now(),
    };
    io.to(game.state.roomCode).emit("chat:message", msg);
  });

  // ── Gameplay intents ──────────────────────────────────────────────────────
  socket.on("action:roll", () => run((g, pid) => g.roll(pid)));
  socket.on("action:buy", () => run((g, pid) => g.buy(pid)));
  socket.on("action:declineBuy", () => {
    run((g, pid) => g.declineBuy(pid));
    // declineBuy may have started an auction — arm its countdown.
    const game = gameForSocket();
    if (game) armAuctionTimer(game);
  });
  socket.on("action:endTurn", () => run((g, pid) => g.endTurn(pid)));

  socket.on("action:jailPay", () => run((g, pid) => g.jailPay(pid)));
  socket.on("action:jailCard", () => run((g, pid) => g.jailCard(pid)));
  socket.on("action:jailRoll", () => run((g, pid) => g.jailRoll(pid)));

  socket.on("action:acknowledgeCard", () => run((g, pid) => g.acknowledgeCard(pid)));

  socket.on("action:buildHouse", ({ tileId }) => run((g, pid) => g.build(pid, tileId)));
  socket.on("action:sellHouse", ({ tileId }) => run((g, pid) => g.sell(pid, tileId)));
  socket.on("action:mortgage", ({ tileId }) => run((g, pid) => g.mortgage(pid, tileId)));
  socket.on("action:unmortgage", ({ tileId }) => run((g, pid) => g.unmortgage(pid, tileId)));

  socket.on("auction:bid", ({ amount }) => {
    run((g, pid) => g.auctionBid(pid, amount));
    // A valid bid pushed `endsAt` forward — re-arm the countdown.
    const game = gameForSocket();
    if (game) armAuctionTimer(game);
  });

  socket.on("trade:propose", (offer) => run((g, pid) => g.tradePropose(pid, offer)));
  socket.on("trade:accept", ({ tradeId }) => run((g, pid) => g.tradeAccept(pid, tradeId)));
  socket.on("trade:reject", ({ tradeId }) => run((g, pid) => g.tradeReject(pid, tradeId)));

  socket.on("action:bankrupt", () => run((g, pid) => g.declareBankrupt(pid)));

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const game = gameForSocket();
    if (!game) return;
    const code = game.state.roomCode;
    game.disconnect(socket.id);
    broadcast(game);
    rooms.cleanup();
    if (!rooms.get(code)) clearAuctionTimer(code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎲 Monopoly server listening on http://localhost:${PORT}`);
  console.log(`   Allowed client origin: ${ORIGIN}`);
});
