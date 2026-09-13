import {
  type GameState,
  type Player,
  type GameSettings,
  type TurnPhase,
  type TradeOffer,
  type Trade,
  type Card,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  JAIL_FINE,
  VACATION_INDEX,
} from "@monopoly/shared";
import { cloneMap } from "../maps/index.js";
import { rollDice, isDoubles } from "./dice.js";
import { calculateRent } from "./calculateRent.js";
import { initDecks, drawCard, discardCard } from "./cards.js";
import {
  buyProperty,
  buildHouse,
  sellHouse,
  mortgage,
  unmortgage,
} from "./economy.js";
import { validateTrade, executeTrade } from "./trade.js";
import { startAuction, placeBid, resolveAuction } from "./auction.js";
import {
  currentPlayer,
  playerById,
  tileAt,
  log,
  moveBy,
  moveTo,
  sendToJail,
  charge,
  bankrupt,
  activePlayers,
  checkWinCondition,
} from "./util.js";

/**
 * One Game = one room's GameState + the turn state machine (README §5).
 * Every intent is validated against (currentPlayerId, turnPhase) before any
 * mutation. All handlers are synchronous end-to-end — no awaits mid-mutation.
 */
export class Game {
  state: GameState;
  private seatCounter = 0;
  private tradeCounter = 0;

  constructor(roomCode: string, hostName: string, hostSocketId: string) {
    const settings: GameSettings = { ...DEFAULT_SETTINGS };
    this.state = {
      roomCode,
      status: "lobby",
      hostId: "",
      map: null,
      players: [],
      board: [],
      currentPlayerIndex: 0,
      turnPhase: "WAITING_FOR_ROLL",
      dice: [1, 1],
      doublesCount: 0,
      vacationPot: 0,
      decks: { surprise: [], treasure: [], discard: { surprise: [], treasure: [] } },
      pendingCard: null,
      trades: [],
      activeAuction: null,
      log: [],
      logSeq: 0,
      settings,
      winnerId: null,
    };
    const host = this.makePlayer(hostName, hostSocketId, true);
    this.state.players.push(host);
    this.state.hostId = host.id;
    log(this.state, `${host.name} created the room.`);
  }

  // ── Lobby ──────────────────────────────────────────────────────────────
  private makePlayer(name: string, socketId: string, isHost: boolean): Player {
    const id = `p${++this.seatCounter}`;
    return {
      id,
      name: name.trim().slice(0, 20) || `Player ${this.seatCounter}`,
      socketId,
      connected: true,
      money: this.state?.settings.startingCash ?? DEFAULT_SETTINGS.startingCash,
      position: 0,
      properties: [],
      inJail: false,
      jailTurns: 0,
      pardonCards: 0,
      isBankrupt: false,
      isBot: false,
      color: PLAYER_COLORS[this.state?.players.length ?? 0] ?? "#888",
      isHost,
    };
  }

  addPlayer(name: string, socketId: string): { playerId: string } | { error: string } {
    if (this.state.status !== "lobby") return { error: "Game already started." };
    if (this.state.players.length >= this.state.settings.maxPlayers)
      return { error: "Room is full." };
    const player = this.makePlayer(name, socketId, false);
    this.state.players.push(player);
    log(this.state, `${player.name} joined.`);
    return { playerId: player.id };
  }

  reconnect(playerId: string, socketId: string): boolean {
    const p = playerById(this.state, playerId);
    if (!p) return false;
    p.socketId = socketId;
    p.connected = true;
    log(this.state, `${p.name} reconnected.`);
    return true;
  }

  disconnect(socketId: string): void {
    const p = this.state.players.find((x) => x.socketId === socketId);
    if (!p) return;
    p.connected = false;
    // In the lobby, a disconnect removes the seat entirely.
    if (this.state.status === "lobby") {
      this.state.players = this.state.players.filter((x) => x.id !== p.id);
      if (p.isHost && this.state.players.length > 0) {
        this.state.players[0].isHost = true;
        this.state.hostId = this.state.players[0].id;
      }
    } else {
      log(this.state, `${p.name} disconnected.`);
    }
  }

  isEmpty(): boolean {
    return this.state.players.length === 0 || this.state.players.every((p) => !p.connected);
  }

  updateSettings(playerId: string, partial: Partial<GameSettings>): string | null {
    if (this.state.status !== "lobby") return "Settings are locked once the game starts.";
    if (playerId !== this.state.hostId) return "Only the host can change settings.";
    // Settings are immutable once in_progress (README §10).
    this.state.settings = { ...this.state.settings, ...partial };
    return null;
  }

  start(playerId: string): string | null {
    if (this.state.status !== "lobby") return "Game already started.";
    if (playerId !== this.state.hostId) return "Only the host can start the game.";
    if (this.state.players.length < 2) return "Need at least 2 players to start.";

    const map = cloneMap(this.state.settings.boardMapId);
    if (!map) return "Selected board map not found.";
    this.state.map = map;
    this.state.board = map.tiles.map((t) => ({
      id: t.id,
      owner: null,
      houses: 0,
      hotel: false,
      mortgaged: false,
    }));

    for (const p of this.state.players) {
      p.money = this.state.settings.startingCash;
      p.position = 0;
      p.properties = [];
      p.inJail = false;
      p.jailTurns = 0;
      p.pardonCards = 0;
      p.isBankrupt = false;
    }

    if (this.state.settings.randomizeTurnOrder) {
      shuffleInPlace(this.state.players);
    }
    this.state.players.forEach((p, i) => (p.color = PLAYER_COLORS[i] ?? p.color));

    initDecks(this.state);
    this.state.status = "in_progress";
    this.state.currentPlayerIndex = 0;
    this.state.turnPhase = "WAITING_FOR_ROLL";
    this.state.doublesCount = 0;
    this.state.vacationPot = 0;
    this.state.winnerId = null;
    log(this.state, `Game started on ${map.name}.`);
    log(this.state, `${currentPlayer(this.state).name}'s turn.`);
    return null;
  }

  // ── Turn state machine helpers ───────────────────────────────────────────
  private setPhase(phase: TurnPhase): void {
    if (this.state.status === "in_progress") this.state.turnPhase = phase;
  }

  private requireTurn(playerId: string, ...phases: TurnPhase[]): string | null {
    if (this.state.status !== "in_progress") return "Game is not in progress.";
    if (currentPlayer(this.state).id !== playerId) return "It's not your turn.";
    if (!phases.includes(this.state.turnPhase)) return "You can't do that right now.";
    return null;
  }

  private diceSum(): number {
    return this.state.dice[0] + this.state.dice[1];
  }

  private advanceTurn(): void {
    this.state.doublesCount = 0;
    const n = this.state.players.length;
    let idx = this.state.currentPlayerIndex;
    for (let i = 0; i < n; i++) {
      idx = (idx + 1) % n;
      if (!this.state.players[idx].isBankrupt) break;
    }
    this.state.currentPlayerIndex = idx;
    this.setPhase("WAITING_FOR_ROLL");
    if (this.state.status === "in_progress") {
      log(this.state, `${currentPlayer(this.state).name}'s turn.`);
    }
  }

  // ── Rolling & movement ────────────────────────────────────────────────────
  roll(playerId: string): string | null {
    const err = this.requireTurn(playerId, "WAITING_FOR_ROLL");
    if (err) return err;
    const p = currentPlayer(this.state);
    if (p.inJail) return "You're in prison — pay the fine, use a Pardon, or roll for doubles.";

    const dice = rollDice();
    this.state.dice = dice;

    if (isDoubles(dice)) {
      this.state.doublesCount += 1;
      log(this.state, `${p.name} rolled ${dice[0]} + ${dice[1]} (doubles!).`);
      if (this.state.doublesCount === 3) {
        log(this.state, `${p.name} rolled three doubles in a row!`);
        sendToJail(this.state, p);
        this.setPhase("AWAITING_END_TURN");
        return null;
      }
    } else {
      this.state.doublesCount = 0;
      log(this.state, `${p.name} rolled ${dice[0]} + ${dice[1]}.`);
    }

    moveBy(this.state, p, this.diceSum());
    this.resolveLanding(p);
    return null;
  }

  /** Land the player on their current tile and drive the resulting phase. */
  private resolveLanding(p: Player): void {
    if (this.state.status !== "in_progress") return;
    const tile = tileAt(this.state, p.position);
    const bt = this.state.board[p.position];

    switch (tile.type) {
      case "corner": {
        if (tile.subtype === "goto_jail") {
          sendToJail(this.state, p);
        } else if (tile.subtype === "vacation") {
          if (this.state.settings.vacationCash && this.state.vacationPot > 0) {
            p.money += this.state.vacationPot;
            log(
              this.state,
              `${p.name} landed on Vacation and collected ${this.state.map!.currency}${this.state.vacationPot}.`
            );
            this.state.vacationPot = 0;
          }
        }
        this.setPhase("AWAITING_END_TURN");
        break;
      }
      case "property":
      case "railroad":
      case "utility": {
        if (bt.owner === null && tile.price !== undefined) {
          this.setPhase("AWAITING_BUY");
        } else if (bt.owner === p.id) {
          this.setPhase("AWAITING_END_TURN");
        } else {
          const rent = calculateRent(this.state, p.position, this.diceSum());
          if (rent > 0 && bt.owner) {
            const owner = playerById(this.state, bt.owner)!;
            log(
              this.state,
              `${p.name} pays ${this.state.map!.currency}${rent} rent to ${owner.name} for ${tile.name}.`
            );
            charge(this.state, p, rent, owner.id);
          }
          this.setPhase("AWAITING_END_TURN");
        }
        break;
      }
      case "tax": {
        const amount = tile.amount ?? 0;
        log(this.state, `${p.name} pays ${this.state.map!.currency}${amount} in ${tile.name}.`);
        charge(this.state, p, amount, null, true);
        this.setPhase("AWAITING_END_TURN");
        break;
      }
      case "surprise":
      case "treasure": {
        const deck = tile.type;
        const card = drawCard(this.state, deck);
        this.state.pendingCard = { deck, card };
        log(this.state, `${p.name} drew a ${deck === "surprise" ? "Surprise" : "Treasure"} card: "${card.text}"`);
        this.applyCardEffect(p, deck, card);
        discardCard(this.state, deck, card);
        break;
      }
    }
  }

  private applyCardEffect(p: Player, deck: "surprise" | "treasure", card: Card): void {
    const eff = card.effect;
    const cur = this.state.map!.currency;
    switch (eff.type) {
      case "collect":
        p.money += eff.amount;
        this.setPhase("AWAITING_END_TURN");
        break;
      case "pay":
        charge(this.state, p, eff.amount, null, true);
        this.setPhase("AWAITING_END_TURN");
        break;
      case "pardon":
        p.pardonCards += 1;
        this.setPhase("AWAITING_END_TURN");
        break;
      case "goto_jail":
        sendToJail(this.state, p);
        this.setPhase("AWAITING_END_TURN");
        break;
      case "move":
        moveTo(this.state, p, eff.target, true);
        this.resolveLanding(p);
        break;
      case "move_relative": {
        if (eff.steps >= 0) {
          moveBy(this.state, p, eff.steps);
        } else {
          p.position = (p.position + eff.steps + 40) % 40;
        }
        this.resolveLanding(p);
        break;
      }
      case "collect_from_each": {
        for (const other of activePlayers(this.state)) {
          if (other.id === p.id) continue;
          charge(this.state, other, eff.amount, p.id);
        }
        this.setPhase("AWAITING_END_TURN");
        break;
      }
      case "pay_each": {
        for (const other of activePlayers(this.state)) {
          if (other.id === p.id || p.isBankrupt) continue;
          charge(this.state, p, eff.amount, other.id);
        }
        this.setPhase("AWAITING_END_TURN");
        break;
      }
    }
    void cur;
  }

  acknowledgeCard(playerId: string): string | null {
    if (currentPlayer(this.state).id !== playerId) return "It's not your turn.";
    this.state.pendingCard = null;
    return null;
  }

  // ── Buying / auction ──────────────────────────────────────────────────────
  buy(playerId: string): string | null {
    const err = this.requireTurn(playerId, "AWAITING_BUY");
    if (err) return err;
    const p = currentPlayer(this.state);
    const e = buyProperty(this.state, p, p.position);
    if (e) return e;
    this.setPhase("AWAITING_END_TURN");
    return null;
  }

  declineBuy(playerId: string): string | null {
    const err = this.requireTurn(playerId, "AWAITING_BUY");
    if (err) return err;
    const p = currentPlayer(this.state);
    if (this.state.settings.auctions) {
      startAuction(this.state, p.position);
    } else {
      this.setPhase("AWAITING_END_TURN");
    }
    return null;
  }

  auctionBid(playerId: string, amount: number): string | null {
    if (this.state.turnPhase !== "AUCTION") return "No auction in progress.";
    return placeBid(this.state, playerId, Math.floor(amount));
  }

  /**
   * Resolve the auction now — invoked by the server-side countdown timer when
   * `activeAuction.endsAt` passes. Awards the tile to the last/high bidder.
   */
  auctionResolve(): void {
    if (this.state.turnPhase !== "AUCTION" || !this.state.activeAuction) return;
    resolveAuction(this.state);
    this.setPhase("AWAITING_END_TURN");
  }

  // ── End turn ──────────────────────────────────────────────────────────────
  endTurn(playerId: string): string | null {
    const err = this.requireTurn(playerId, "AWAITING_END_TURN");
    if (err) return err;
    const p = currentPlayer(this.state);
    const rollAgain =
      isDoubles(this.state.dice) &&
      this.state.doublesCount > 0 &&
      this.state.doublesCount < 3 &&
      !p.inJail &&
      !p.isBankrupt;
    if (rollAgain) {
      log(this.state, `${p.name} rolled doubles — rolls again.`);
      this.setPhase("WAITING_FOR_ROLL");
      // The "Roll again (doubles!)" button is a single click: roll right away
      // instead of parking the player on another "Roll dice" prompt.
      this.roll(playerId);
      return null;
    }
    this.advanceTurn();
    return null;
  }

  // ── Jail ──────────────────────────────────────────────────────────────────
  jailPay(playerId: string): string | null {
    const err = this.requireTurn(playerId, "WAITING_FOR_ROLL");
    if (err) return err;
    const p = currentPlayer(this.state);
    if (!p.inJail) return "You're not in prison.";
    if (p.money < JAIL_FINE) return "Not enough money to pay the fine.";
    charge(this.state, p, JAIL_FINE, null, true);
    p.inJail = false;
    p.jailTurns = 0;
    log(this.state, `${p.name} paid the ${this.state.map!.currency}${JAIL_FINE} fine and left prison.`);
    // Buying your way out costs you the turn — no roll this round.
    this.setPhase("AWAITING_END_TURN");
    return null;
  }

  jailCard(playerId: string): string | null {
    const err = this.requireTurn(playerId, "WAITING_FOR_ROLL");
    if (err) return err;
    const p = currentPlayer(this.state);
    if (!p.inJail) return "You're not in prison.";
    if (p.pardonCards <= 0) return "You don't have a Pardon card.";
    p.pardonCards -= 1;
    p.inJail = false;
    p.jailTurns = 0;
    log(this.state, `${p.name} used a Pardon card and left prison.`);
    // Same as paying the fine: you're out, but the turn is spent.
    this.setPhase("AWAITING_END_TURN");
    return null;
  }

  jailRoll(playerId: string): string | null {
    const err = this.requireTurn(playerId, "WAITING_FOR_ROLL");
    if (err) return err;
    const p = currentPlayer(this.state);
    if (!p.inJail) return "You're not in prison.";

    const dice = rollDice();
    this.state.dice = dice;
    if (isDoubles(dice)) {
      p.inJail = false;
      p.jailTurns = 0;
      log(this.state, `${p.name} rolled ${dice[0]} + ${dice[1]} and broke out of prison!`);
      moveBy(this.state, p, this.diceSum());
      this.resolveLanding(p);
    } else {
      p.jailTurns += 1;
      if (p.jailTurns >= 3) {
        log(this.state, `${p.name} failed to roll doubles 3 times and must pay the fine.`);
        charge(this.state, p, JAIL_FINE, null, true);
        if (p.isBankrupt) return null;
        p.inJail = false;
        p.jailTurns = 0;
        moveBy(this.state, p, this.diceSum());
        this.resolveLanding(p);
      } else {
        log(this.state, `${p.name} rolled ${dice[0]} + ${dice[1]} — still in prison.`);
        this.setPhase("AWAITING_END_TURN");
      }
    }
    return null;
  }

  // ── Building / mortgaging (allowed on your own turn) ───────────────────────
  private canManage(playerId: string): string | null {
    if (this.state.status !== "in_progress") return "Game is not in progress.";
    if (currentPlayer(this.state).id !== playerId) return "You can only manage on your turn.";
    if (["AUCTION", "GAME_OVER"].includes(this.state.turnPhase))
      return "You can't manage property right now.";
    return null;
  }

  build(playerId: string, tileId: number): string | null {
    const err = this.canManage(playerId);
    if (err) return err;
    return buildHouse(this.state, currentPlayer(this.state), tileId);
  }

  sell(playerId: string, tileId: number): string | null {
    const err = this.canManage(playerId);
    if (err) return err;
    return sellHouse(this.state, currentPlayer(this.state), tileId);
  }

  // Mortgaging is allowed off-turn (you often need cash to pay rent). Ownership
  // is enforced inside economy.mortgage, so any player may mortgage their own.
  private canMortgage(): string | null {
    if (this.state.status !== "in_progress") return "Game is not in progress.";
    if (["AUCTION", "GAME_OVER"].includes(this.state.turnPhase))
      return "You can't manage property right now.";
    return null;
  }

  mortgage(playerId: string, tileId: number): string | null {
    const err = this.canMortgage();
    if (err) return err;
    const player = playerById(this.state, playerId);
    if (!player) return "Unknown player.";
    return mortgage(this.state, player, tileId);
  }

  unmortgage(playerId: string, tileId: number): string | null {
    const err = this.canMortgage();
    if (err) return err;
    const player = playerById(this.state, playerId);
    if (!player) return "Unknown player.";
    return unmortgage(this.state, player, tileId);
  }

  // ── Trading (independent of turn phase; multiple trades can be on the table) ─
  private static readonly MAX_TRADES = 12;

  tradePropose(playerId: string, offer: TradeOffer): string | null {
    if (this.state.status !== "in_progress") return "Game is not in progress.";
    if (offer.fromId !== playerId) return "You can only propose your own trades.";
    if (this.state.trades.length >= Game.MAX_TRADES) return "Too many trades on the table.";
    const e = validateTrade(this.state, offer);
    if (e) return e;
    const trade: Trade = { ...offer, id: `t${++this.tradeCounter}` };
    this.state.trades.push(trade);
    const to = playerById(this.state, offer.toId)!;
    const from = playerById(this.state, offer.fromId)!;
    log(this.state, `${from.name} created a trade with ${to.name}.`);
    return null;
  }

  tradeAccept(playerId: string, tradeId: string): string | null {
    const trade = this.state.trades.find((t) => t.id === tradeId);
    if (!trade) return "That trade is no longer available.";
    if (trade.toId !== playerId) return "Only the recipient can accept.";
    const e = validateTrade(this.state, trade);
    if (e) {
      this.removeTrade(tradeId);
      return e;
    }
    executeTrade(this.state, trade);
    this.removeTrade(tradeId);
    return null;
  }

  tradeReject(playerId: string, tradeId: string): string | null {
    const trade = this.state.trades.find((t) => t.id === tradeId);
    if (!trade) return "That trade is no longer available.";
    if (trade.toId !== playerId && trade.fromId !== playerId)
      return "You're not part of this trade.";
    const by = playerById(this.state, playerId);
    const label = playerId === trade.fromId ? "cancelled" : "declined";
    const from = playerById(this.state, trade.fromId);
    log(this.state, `${by?.name ?? "A player"} ${label} a trade created by ${from?.name ?? "?"}.`);
    this.removeTrade(tradeId);
    return null;
  }

  private removeTrade(tradeId: string): void {
    this.state.trades = this.state.trades.filter((t) => t.id !== tradeId);
  }

  /** Drop any pending trades that involve a given player (bankrupt/left). */
  private pruneTradesFor(playerId: string): void {
    this.state.trades = this.state.trades.filter(
      (t) => t.fromId !== playerId && t.toId !== playerId
    );
  }

  // ── Concede ────────────────────────────────────────────────────────────────
  declareBankrupt(playerId: string): string | null {
    if (this.state.status !== "in_progress") return "Game is not in progress.";
    const p = playerById(this.state, playerId);
    if (!p || p.isBankrupt) return "You can't do that.";
    const wasCurrent = currentPlayer(this.state).id === playerId;
    this.pruneTradesFor(playerId);
    bankrupt(this.state, p, null);
    if (this.state.status !== "in_progress") return null; // game ended
    if (wasCurrent) this.advanceTurn();
    return null;
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
