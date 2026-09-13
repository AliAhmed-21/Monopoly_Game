"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSocket } from "@/lib/socket";
import {
  cuesForLogLines,
  initSound,
  playCue,
  playJoin,
  playMessage,
  playTradeOffer,
  playYourTurn,
} from "@/lib/sound";
import type {
  GameState,
  Player,
  MapSummary,
  ChatMessage,
  GameSettings,
  TradeOffer,
  Ack,
} from "@monopoly/shared";

const STORAGE_KEY = "monopoly.session";

interface Session {
  roomCode: string;
  playerId: string;
}

interface GameContextValue {
  connected: boolean;
  state: GameState | null;
  myId: string | null;
  me: Player | undefined;
  isMyTurn: boolean;
  isHost: boolean;
  maps: MapSummary[];
  chat: ChatMessage[];
  error: string | null;
  notice: string | null;
  createRoom: (name: string) => Promise<Ack<Session>>;
  joinRoom: (roomCode: string, name: string) => Promise<Ack<Session>>;
  leaveRoom: () => void;
  sendChat: (text: string) => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
  startGame: () => void;
  roll: () => void;
  buy: () => void;
  declineBuy: () => void;
  endTurn: () => void;
  jailPay: () => void;
  jailCard: () => void;
  jailRoll: () => void;
  acknowledgeCard: () => void;
  build: (tileId: number) => void;
  sell: (tileId: number) => void;
  mortgage: (tileId: number) => void;
  unmortgage: (tileId: number) => void;
  bid: (amount: number) => void;
  proposeTrade: (offer: TradeOffer) => void;
  acceptTrade: (tradeId: string) => void;
  rejectTrade: (tradeId: string) => void;
  bankrupt: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kept in refs so the (once-wired) socket handlers read fresh values.
  const myIdRef = useRef<string | null>(null);
  myIdRef.current = myId;
  // Total lines logged as of the last update — new lines drive the sound cues.
  const prevLogSeq = useRef<number | null>(null);
  // Trade ids seen last update — to detect a new trade addressed to me.
  const prevTradeIds = useRef<Set<string> | null>(null);
  // When the game-start fanfare last played, so the turn chime can wait for it.
  const startedAt = useRef(0);

  const showError = useCallbackFn((msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 3500);
  });

  const showNotice = useCallbackFn((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  });

  useEffect(() => {
    initSound();
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      // Attempt to reconnect to a previous session (README §10 resilience).
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const s: Session = JSON.parse(raw);
          socket.emit("room:reconnect", s, (res) => {
            if (res.ok) setMyId(res.data.playerId);
            else localStorage.removeItem(STORAGE_KEY);
          });
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", () => setConnected(false));
    socket.on("state:update", (s) => {
      // Public events (join, start, buy, bid, build, trade outcome) are sounded
      // from the shared log so every client hears the same thing.
      if (prevLogSeq.current !== null && s.logSeq > prevLogSeq.current) {
        const fresh = s.log.slice(Math.max(0, s.log.length - (s.logSeq - prevLogSeq.current)));
        for (const cue of cuesForLogLines(fresh)) {
          if (cue === "start") startedAt.current = Date.now();
          playCue(cue);
        }
      }
      prevLogSeq.current = s.logSeq;

      // Notify me (once) when a new trade lands in my court — no blocking modal.
      const prev = prevTradeIds.current;
      if (prev) {
        for (const t of s.trades) {
          if (!prev.has(t.id) && t.toId === myIdRef.current) {
            const from = s.players.find((p) => p.id === t.fromId);
            showNotice(`${from?.name ?? "A player"} sent you a trade offer`);
            playTradeOffer();
            break;
          }
        }
      }
      prevTradeIds.current = new Set(s.trades.map((t) => t.id));

      setState(s);
    });
    socket.on("maps:list", (m) => setMaps(m));
    socket.on("you:are", (id) => setMyId(id));
    socket.on("error:message", (msg) => showError(msg));
    socket.on("chat:message", (msg) => {
      setChat((prev) => [...prev.slice(-100), msg]);
      if (msg.playerId !== myIdRef.current) playMessage();
    });

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect");
      socket.off("state:update");
      socket.off("maps:list");
      socket.off("you:are");
      socket.off("error:message");
      socket.off("chat:message");
    };
  }, [showError, showNotice]);

  const persist = (s: Session) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

  const createRoom = (name: string): Promise<Ack<Session>> =>
    new Promise((resolve) => {
      getSocket().emit("room:create", { name }, (res) => {
        if (res.ok) {
          persist(res.data);
          setMyId(res.data.playerId);
        }
        resolve(res);
      });
    });

  const joinRoom = (roomCode: string, name: string): Promise<Ack<Session>> =>
    new Promise((resolve) => {
      getSocket().emit("room:join", { roomCode: roomCode.toLowerCase(), name }, (res) => {
        if (res.ok) {
          persist(res.data);
          setMyId(res.data.playerId);
          // Others hear this from my "joined" log line; I'm not diffing yet.
          playJoin();
        }
        resolve(res);
      });
    });

  const leaveRoom = () => {
    getSocket().emit("room:leave");
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
    setMyId(null);
    setChat([]);
  };

  const s = () => getSocket();
  const me = useMemo(
    () => state?.players.find((p) => p.id === myId),
    [state, myId]
  );
  const isMyTurn = useMemo(
    () =>
      !!state &&
      state.status === "in_progress" &&
      state.players[state.currentPlayerIndex]?.id === myId,
    [state, myId]
  );
  const isHost = !!me?.isHost;

  // Chime once when the turn passes to me (rising edge only). On the very first
  // turn of a game, wait for the start fanfare to finish before chiming.
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (isMyTurn && !wasMyTurn.current) {
      const sinceStart = Date.now() - startedAt.current;
      playYourTurn(sinceStart < 1500 ? 1 : 0);
    }
    wasMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  const value: GameContextValue = {
    connected,
    state,
    myId,
    me,
    isMyTurn,
    isHost,
    maps,
    chat,
    error,
    notice,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat: (text) => s().emit("chat:send", { text }),
    updateSettings: (partial) => s().emit("lobby:updateSettings", partial),
    startGame: () => s().emit("lobby:start"),
    roll: () => s().emit("action:roll"),
    buy: () => s().emit("action:buy"),
    declineBuy: () => s().emit("action:declineBuy"),
    endTurn: () => s().emit("action:endTurn"),
    jailPay: () => s().emit("action:jailPay"),
    jailCard: () => s().emit("action:jailCard"),
    jailRoll: () => s().emit("action:jailRoll"),
    acknowledgeCard: () => s().emit("action:acknowledgeCard"),
    build: (tileId) => s().emit("action:buildHouse", { tileId }),
    sell: (tileId) => s().emit("action:sellHouse", { tileId }),
    mortgage: (tileId) => s().emit("action:mortgage", { tileId }),
    unmortgage: (tileId) => s().emit("action:unmortgage", { tileId }),
    bid: (amount) => s().emit("auction:bid", { amount }),
    proposeTrade: (offer) => s().emit("trade:propose", offer),
    acceptTrade: (tradeId) => s().emit("trade:accept", { tradeId }),
    rejectTrade: (tradeId) => s().emit("trade:reject", { tradeId }),
    bankrupt: () => s().emit("action:bankrupt"),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Small stable-callback helper (avoids re-subscribing socket listeners).
function useCallbackFn<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useRef(((...args: any[]) => ref.current(...args)) as T).current;
}
