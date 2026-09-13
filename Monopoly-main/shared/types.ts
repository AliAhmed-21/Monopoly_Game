/**
 * Shared type definitions — the single source of truth for both client & server.
 * See README §7 (Data Models). Import via the `@monopoly/shared` workspace package.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Board map (pure data — the engine is map-agnostic; README §6)
// ─────────────────────────────────────────────────────────────────────────────

export type TileType =
  | "corner"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "surprise"
  | "treasure";

export type CornerSubtype = "start" | "jail" | "vacation" | "goto_jail";

/** A single board position (index 0–39). Property-ish fields are optional. */
export interface Tile {
  id: number; // board index (0–39)
  type: TileType;
  name: string;
  subtype?: CornerSubtype; // for type === "corner"
  group?: string; // color set id — for full-set & even-build checks
  price?: number; // purchase cost (property / railroad / utility)
  /** Rent ladder for properties: [base, 1house, 2house, 3house, 4house, hotel]. */
  rent?: number[];
  houseCost?: number; // cost per house/hotel (property)
  amount?: number; // fixed amount for tax tiles
}

/** Data-driven card effect (README §8 — keep effects data, not code). */
export type CardEffect =
  | { type: "collect"; amount: number } // gain money from bank
  | { type: "pay"; amount: number } // pay money to bank (or vacation pot)
  | { type: "move"; target: number } // move to absolute tile index
  | { type: "move_relative"; steps: number } // move forward/back N tiles
  | { type: "goto_jail" } // straight to jail
  | { type: "pardon" } // gain a "get out of jail" card
  | { type: "collect_from_each"; amount: number } // each other player pays you
  | { type: "pay_each"; amount: number }; // you pay each other player

export interface Card {
  id: string;
  text: string;
  effect: CardEffect;
}

export interface MapConfig {
  id: string;
  name: string;
  theme: string;
  currency: string;
  tiles: Tile[]; // exactly 40, index = board position
  decks: {
    surprise: Card[];
    treasure: Card[];
  };
}

export interface MapSummary {
  id: string;
  name: string;
  theme: string;
  currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live game state (README §7)
// ─────────────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  socketId: string; // for reconnection mapping
  connected: boolean;
  money: number;
  position: number;
  properties: number[]; // tile indices owned
  inJail: boolean;
  jailTurns: number; // failed roll attempts in jail (0–3)
  pardonCards: number; // "get out of jail" cards held
  isBankrupt: boolean;
  isBot: boolean;
  color: string;
  isHost: boolean;
}

/** Live per-tile ownership/building state, seeded from map.tiles. */
export interface BoardTile {
  id: number;
  owner: string | null; // playerId or null
  houses: number; // 0–4
  hotel: boolean;
  mortgaged: boolean;
}

export type TurnPhase =
  | "WAITING_FOR_ROLL"
  | "RESOLVING_MOVE"
  | "AWAITING_BUY" // landed on unowned purchasable tile
  | "AWAITING_END_TURN"
  | "AUCTION"
  | "TRADE"
  | "GAME_OVER";

export type GameStatus = "lobby" | "in_progress" | "finished";

export interface GameSettings {
  boardMapId: string;
  doubleRentFullSet: boolean;
  vacationCash: boolean;
  auctions: boolean;
  noRentInPrison: boolean;
  mortgageEnabled: boolean;
  evenBuild: boolean;
  startingCash: number;
  randomizeTurnOrder: boolean;
  allowBots: boolean;
  loggedInOnly: boolean;
  maxPlayers: number;
}

export interface TradeOffer {
  fromId: string;
  toId: string;
  offerProperties: number[];
  offerCash: number;
  offerPardons: number;
  requestProperties: number[];
  requestCash: number;
  requestPardons: number;
}

/** A live trade on the table — a TradeOffer with a server-assigned id. */
export interface Trade extends TradeOffer {
  id: string;
}

export interface Auction {
  tileId: number;
  highestBid: number;
  highestBidderId: string | null;
  activeBidderIds: string[]; // players eligible to bid (all active players)
  endsAt: number; // epoch ms — countdown deadline; each bid pushes it forward
}

export interface GameState {
  roomCode: string;
  status: GameStatus;
  hostId: string;
  map: MapConfig | null; // selected map (null in lobby until chosen)
  players: Player[]; // order = turn order
  board: BoardTile[]; // live tile state
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  dice: [number, number];
  doublesCount: number; // consecutive doubles this turn (3 → jail)
  vacationPot: number; // Free Parking pool
  decks: {
    surprise: string[]; // remaining draw order (card ids)
    treasure: string[];
    discard: { surprise: string[]; treasure: string[] };
  };
  pendingCard: { deck: "surprise" | "treasure"; card: Card } | null;
  trades: Trade[]; // all pending trades on the table (concurrent)
  activeAuction: Auction | null;
  log: string[];
  /** Total lines ever logged. The log array is capped, so clients diff on this
   * counter (not on `log.length`) to find which lines are new. */
  logSeq: number;
  settings: GameSettings;
  winnerId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io event contracts (client → server intents, server → client updates)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  ts: number;
}

/** Client → Server events (intents only — client never computes game logic). */
export interface ClientToServerEvents {
  "room:create": (
    payload: { name: string },
    cb: (res: Ack<{ roomCode: string; playerId: string }>) => void
  ) => void;
  "room:join": (
    payload: { roomCode: string; name: string },
    cb: (res: Ack<{ roomCode: string; playerId: string }>) => void
  ) => void;
  "room:reconnect": (
    payload: { roomCode: string; playerId: string },
    cb: (res: Ack<{ roomCode: string; playerId: string }>) => void
  ) => void;
  "room:leave": () => void;

  "lobby:updateSettings": (payload: Partial<GameSettings>) => void;
  "lobby:start": () => void;

  "chat:send": (payload: { text: string }) => void;

  "action:roll": () => void;
  "action:buy": () => void;
  "action:declineBuy": () => void; // triggers auction if enabled
  "action:endTurn": () => void;

  "action:jailPay": () => void;
  "action:jailCard": () => void;
  "action:jailRoll": () => void;

  "action:acknowledgeCard": () => void;

  "action:buildHouse": (payload: { tileId: number }) => void;
  "action:sellHouse": (payload: { tileId: number }) => void;
  "action:mortgage": (payload: { tileId: number }) => void;
  "action:unmortgage": (payload: { tileId: number }) => void;

  "auction:bid": (payload: { amount: number }) => void;

  "trade:propose": (payload: TradeOffer) => void;
  "trade:accept": (payload: { tradeId: string }) => void;
  "trade:reject": (payload: { tradeId: string }) => void;

  "action:bankrupt": () => void;
}

/** Server → Client events. */
export interface ServerToClientEvents {
  "state:update": (state: GameState) => void;
  "chat:message": (msg: ChatMessage) => void;
  "maps:list": (maps: MapSummary[]) => void;
  "error:message": (msg: string) => void;
  "you:are": (playerId: string) => void;
}

/** Generic ack wrapper for request/response style events. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export const DEFAULT_SETTINGS: GameSettings = {
  boardMapId: "classic",
  doubleRentFullSet: false,
  vacationCash: false,
  auctions: false,
  noRentInPrison: false,
  mortgageEnabled: true,
  evenBuild: true,
  startingCash: 1500,
  randomizeTurnOrder: true,
  allowBots: false,
  loggedInOnly: false,
  maxPlayers: 8,
};

export const PLAYER_COLORS = [
  "#e63946",
  "#457b9d",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#9b5de5",
  "#00bbf9",
  "#f15bb5",
];

// Board geometry constants (classic layout)
export const BOARD_SIZE = 40;
export const START_INDEX = 0;
export const JAIL_INDEX = 10;
export const VACATION_INDEX = 20;
export const GOTO_JAIL_INDEX = 30;
export const JAIL_FINE = 50;
export const START_SALARY = 200;

/** Auction countdown window — resets on every bid; on expiry the property goes
 * to the last/high bidder (README §9, timed variant). */
export const AUCTION_DURATION_MS = 8000;
