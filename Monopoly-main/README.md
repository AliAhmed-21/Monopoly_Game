# 🎲 Monopoly-Style Multiplayer Board Game — Project Plan

A web-based, real-time multiplayer board game inspired by Monopoly, with **swappable board maps** (e.g. *Mr. Worldwide*, *Pakistan*, and more), room-based play with friends, host-configurable house rules, trading, and in-game chat.

> **Current goal:** build a private, friends-only game (join by room code). **Later goal:** open it up for public / random matchmaking — without rearchitecting.

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [State Management Strategy](#5-state-management-strategy)
6. [Board Map System (Multiple Maps)](#6-board-map-system-multiple-maps)
7. [Data Models](#7-data-models)
8. [Game Rules & Mechanics](#8-game-rules--mechanics)
9. [Host Lobby Settings (Toggles)](#9-host-lobby-settings-toggles)
10. [Development Approach](#10-development-approach)
11. [Implementation Plan (Phases)](#11-implementation-plan-phases)
12. [Deployment Plan](#12-deployment-plan)
13. [Suggested Project Structure](#13-suggested-project-structure)
14. [Milestones & Roadmap](#14-milestones--roadmap)
15. [Future Enhancements](#15-future-enhancements)

---

## 1. Project Overview

This is a browser-based multiplayer board game where 2–8 players roll dice, move around a board, buy properties, pay rent, draw cards, trade, and try to bankrupt each other — classic Monopoly gameplay, rebuilt from scratch with modern web tech.

**What makes this project distinct:**

- **Multiple board maps.** The board is *data*, not hardcoded. Each map (a themed set of 40 tiles + rules) is a config file. The game engine is map-agnostic, so adding a new map means adding a data file — no engine changes. Ships with *Mr. Worldwide* (global cities) and *Pakistan* (Karachi, Lahore, Islamabad, etc.), and is built to grow.
- **Private rooms first.** Create a room, share a code/link, friends join. No accounts or matchmaking needed for the MVP.
- **Server-authoritative.** All game logic runs on the server; clients only render state and send intents. This prevents cheating and eliminates whole classes of sync bugs.
- **Host-configurable house rules.** A lobby settings panel toggles rules (double rent, auctions, mortgages, even-build, vacation cash, starting cash, etc.) before the game starts.

---

## 2. Core Features

| Feature | Description |
|---|---|
| **Room-based multiplayer** | Create private rooms; invite friends via code or link. |
| **Multiple board maps** | Host picks a map in the lobby. Each map is a themed 40-tile config. |
| **Real-time sync** | Every player sees dice rolls, moves, purchases, and trades instantly. |
| **Dice & doubles** | Truly random rolls. Doubles → roll again. 3 doubles in a row → jail. |
| **Jail mechanics** | Pay fine, use a *Pardon* card, or roll doubles (up to 3 attempts). |
| **Economy** | Buy properties, pay rent, pay taxes, mortgage, and declare bankruptcy. |
| **Cards** | *Surprise* (Chance) & *Treasure* (Community Chest) decks with varied effects. |
| **Trading** | Players trade properties, cash, and Pardon cards with each other. |
| **In-game chat** | Real-time text chat for everyone in the room. |
| **Host settings** | Toggle house rules and adjust starting cash before the game begins. |

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js (React) + TypeScript** | Great DX, deploys to Vercel, and lets us **share type definitions** between client & server. |
| **Styling / Board** | **CSS Grid + Tailwind** | The board is a square ring — CSS Grid maps tile index → grid cell cleanly. |
| **Real-time engine** | **Socket.io** | Built-in rooms, auto-reconnection, and heartbeats — no need to hand-roll raw WebSockets. |
| **Backend** | **Node.js + Socket.io server** | Single-threaded event loop **serializes state mutations for free** (see §5). Shares TS types with frontend. |
| **Database (later)** | **Redis** (optional), then Postgres for public | In-memory for MVP; Redis for reconnection/restart resilience; Postgres only when going public. |
| **Frontend hosting** | **Vercel** | Purpose-built for Next.js. |
| **Backend hosting** | **A stateful host** (Render / Fly / GCP), or **local + ngrok** | Vercel can't hold long-lived WebSockets — the real-time server runs elsewhere (see §12). |

> **Language note:** Using **TypeScript on both ends** and sharing the data-model types (`GameState`, `Player`, `Tile`, `MapConfig`) is a single decision that prevents a large class of client/server mismatch bugs.

---

## 4. Architecture

The hardest constraint is that **Vercel's serverless functions can't hold long-lived WebSocket connections**. The solution is to **split the frontend from the real-time server** rather than force everything into serverless.

```
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Browser A  │         │  Browser B  │         │  Browser C  │
   │ (phone/PC)  │         │ (phone/PC)  │         │ (phone/PC)  │
   └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
          │                       │                       │
          │   HTTPS (load UI)     │                       │
          └───────────────┬───────┴───────────────────────┘
                          ▼
                 ┌──────────────────┐
                 │   Vercel (UI)    │   ← Next.js frontend only
                 │  Next.js / React │
                 └──────────────────┘
                          │
                          │  WebSocket (WSS) — game traffic
                          ▼
            ┌───────────────────────────────┐
            │   Node.js + Socket.io Server  │   ← runs on a stateful host
            │  ┌─────────────────────────┐  │      (Render / Fly / GCP / local+ngrok)
            │  │  Game Engine (per room) │  │
            │  │  - turn state machine   │  │
            │  │  - dice / movement      │  │
            │  │  - economy / rent       │  │
            │  │  - cards / trades       │  │
            │  │  - loads map config     │  │
            │  └─────────────────────────┘  │
            │  In-memory GameState per room │
            └───────────────┬───────────────┘
                            │ (optional)
                            ▼
                     ┌────────────┐
                     │   Redis    │  ← snapshots for reconnection / restart
                     └────────────┘
```

**Why this design (for a friends-first game):**

- Keeping the whole `GameState` **in memory on one server process** makes correctness almost free — there's exactly one source of truth and one writer.
- The alternative (everything on Vercel + a managed realtime/DB service) forces game state into a database and turns every dice roll into a stateless read-modify-write with locking — *more* moving parts and *more* race conditions, not fewer. Managed services solve "thousands of concurrent users"; we don't have that problem yet.
- The **room code is the access control** for the MVP — no login system required.

---

## 5. State Management Strategy

The core principle is **server-authoritative state**: the client never computes money, position, or dice. It renders what the server sends and only sends *intents* ("I roll", "I buy", "I bid 200").

Three mechanisms keep state race-free:

1. **Single in-memory state object per room.** All of a room's data lives in one `GameState` object. One writer, one source of truth.
2. **The Node event loop serializes mutations.** JavaScript processes one event at a time, so two simultaneous "buy" clicks are handled sequentially — the first wins, the second is rejected because the tile is now owned. This works **as long as action handlers don't `await` in the middle of a read-modify-write** — keep each mutation synchronous end to end.
3. **A turn-phase state machine.** Every room tracks whose turn it is and what phase that turn is in. Every incoming action is validated against `(currentPlayerId, currentPhase)` before anything mutates — this alone eliminates duplicate clicks and out-of-order actions.

```
WAITING_FOR_ROLL ──▶ RESOLVING_MOVE ──▶ AWAITING_ACTION ──▶ AWAITING_END_TURN ──▶ (next player)
                                    │
                                    └──▶ AUCTION ──▶ (back to flow)
                                    └──▶ TRADE   ──▶ (back to flow)
```

**Broadcasting:** after each accepted mutation, the server pushes the update to everyone in the room. Start by broadcasting the whole `GameState` on every change (simple, totally fine for ≤8 players). Optimize to diffs (`{ playerId, moneyDelta, position }`) only if it ever matters.

---

## 6. Board Map System (Multiple Maps)

This is the feature that makes the project reusable. **A map is pure data**; the engine reads it and doesn't care which map it is.

### How it works

- Each map is a config object: **metadata** (id, name, theme, currency symbol) + an array of **40 tiles** + optional **card decks**.
- The host selects a map in the lobby (the "Board map" setting). The chosen map's config is loaded into `GameState.map` when the game starts.
- Because rent, buying, jail, cards, and every rule read from the tile config, **all maps run on the same engine**.

### Tile pattern (shared by every map)

The 40 positions follow the classic layout, so any themed map just fills in the names/prices/groups:

- **Corners (indices 0, 10, 20, 30):** Start, Jail/"In Prison", Vacation (Free Parking), Go To Prison.
- **Properties:** grouped into color sets (used for full-set bonuses & even-build).
- **"Railroads":** themed as **airports** (e.g. TLV, MUC, JFK, CDG).
- **Utilities:** Water Company, Power Company, Gas Company.
- **Taxes:** e.g. Earnings Tax, Premium Tax.
- **Card tiles:** Surprise (Chance) & Treasure (Community Chest).

### Included maps

**🌍 Mr. Worldwide** — global cities (as seen in the app):

| Group | Example tiles |
|---|---|
| Brazil | Salvador $60, Rio $60 |
| Israel | Tel Aviv $100, Haifa $100, Jerusalem $110 |
| India | Mumbai $120, New Delhi $130 |
| Italy | Venice $140, Bologna $140, Milan $160, Rome $160 |
| Germany | Frankfurt $180, Munich $180, Berlin $200 |
| China | Shanghai $240, Beijing $220, Shenzhen $220 |
| France | Paris $260, Toulouse $260 |
| Japan | Tokyo $280, Yokohama $280 |
| UK | London $320, Birmingham $320, Manchester $300, Liverpool $300 |
| USA | New York $400, San Francisco $360, Los Angeles $350 |
| Airports | TLV, MUC, JFK, CDG ($200 each) |
| Utilities | Water, Power, Gas ($150 each) |

**🇵🇰 Pakistan** — proposed themed mapping (a template for how new maps are made):

| Tier / Group | Example tiles |
|---|---|
| Small towns (brown) | e.g. Gwadar, Turbat |
| Mid cities | Peshawar, Quetta, Multan |
| Major cities | Faisalabad, Rawalpindi, Hyderabad |
| Premium (dark blue) | Islamabad, Lahore, Karachi (DHA / Clifton) |
| Airports ("railroads") | Jinnah Intl (KHI), Allama Iqbal (LHE), Islamabad Intl (ISB), Multan Intl (MUX) |
| Utilities | K-Electric, SSGC, WAPDA |
| Taxes | Income Tax, FBR Levy |

> New maps (Classic, Europe, etc.) are added the same way: create a config file with 40 tiles and register it in the map list.

---

## 7. Data Models

High-level shapes (TypeScript-flavored). Shared between client & server.

### `MapConfig` (a board map)

```jsonc
{
  "id": "mr_worldwide",
  "name": "Mr. Worldwide",
  "theme": "global",
  "currency": "$",
  "tiles": [ /* 40 Tile objects, index = board position */ ],
  "decks": {
    "surprise": [ /* Card definitions */ ],
    "treasure": [ /* Card definitions */ ]
  }
}
```

### `GameState` (one per room — the single source of truth)

```jsonc
{
  "roomCode": "uu0vt",
  "status": "lobby",              // lobby | in_progress | finished
  "hostId": "player_1",
  "map": { /* selected MapConfig */ },
  "players": [ /* Player objects, order = turn order */ ],
  "board": [ /* live Tile state, seeded from map.tiles */ ],
  "currentPlayerIndex": 0,
  "turnPhase": "WAITING_FOR_ROLL",
  "dice": [3, 4],
  "doublesCount": 0,             // consecutive doubles this turn (3 → jail)
  "vacationPot": 0,              // Free Parking money pool
  "decks": {
    "surprise": ["card_s1", "card_s3"],   // remaining draw order
    "treasure": ["card_t2"],
    "discard": { "surprise": [], "treasure": [] }
  },
  "activeTrade": null,           // or a Trade object
  "activeAuction": null,         // or an Auction object
  "log": ["Ali rolled 3+4", "Sara bought Clifton"],
  "settings": {
    "boardMapId": "mr_worldwide",
    "doubleRentFullSet": false,
    "vacationCash": false,
    "auctions": false,
    "noRentInPrison": false,
    "mortgageEnabled": false,
    "evenBuild": true,
    "startingCash": 1500,
    "randomizeTurnOrder": true,
    "allowBots": false,
    "loggedInOnly": false,
    "maxPlayers": 8
  }
}
```

### `Player`

```jsonc
{
  "id": "player_1",
  "name": "Ali",
  "socketId": "abc123",          // for reconnection mapping
  "connected": true,
  "money": 1500,
  "position": 0,
  "properties": [12, 14, 16],    // tile indices owned
  "inJail": false,
  "jailTurns": 0,                // failed roll attempts in jail (0–3)
  "pardonCards": 1,              // "get out of jail" cards held
  "isBankrupt": false,
  "isBot": false,
  "color": "#e63946",
  "isHost": true
}
```

### `Tile` (property variant; other types use `type` + minimal fields)

```jsonc
{
  "id": 12,
  "type": "property",            // property | utility | railroad | tax | surprise | treasure | corner
  "name": "Clifton, Karachi",
  "group": "blue",              // color set — for full-set & even-build checks
  "price": 260,
  "rent": [20, 100, 300, 900, 1600],   // base, 1h, 2h, 3h, 4h/hotel
  "houseCost": 150,
  "owner": null,                // playerId or null
  "houses": 0,                  // 0–4
  "hotel": false,
  "mortgaged": false
}
```

> Corner tiles are `type: "corner"` with a `subtype` (`start` / `jail` / `vacation` / `goto_jail`).
> Note `doublesCount` (roll-again mechanic) and `jailTurns` (escape attempts) are **separate** counters.

---

## 8. Game Rules & Mechanics

**Dice & doubles**
- Rolls are generated **server-side** (never trust a client dice value).
- Rolling doubles → move, then roll again.
- **Three doubles in a row → go straight to jail** (no collecting, turn ends).

**Movement & Start**
- Passing Start pays the salary.
- Landing on a tile triggers its effect: buy prompt, pay rent, draw card, pay tax, go to jail, or collect vacation pot.

**Jail** (up to 3 turns to escape)
- Options: **pay the fine**, **use a Pardon card**, or **try to roll doubles**.
- If not out after 3 attempts → must pay/use a card.

**Economy**
- Buy unowned properties; pay rent to owners; pay taxes.
- **Mortgage** for 50% of cost; mortgaged tiles collect no rent; unmortgage costs ~110%.
- **Bankruptcy** when a player can't cover what they owe → assets transfer (to creditor or bank).

**Cards (Surprise / Treasure)**
- Draw from the top of the deck; apply effect; send to discard; reshuffle when empty.
- Keep effects **data-driven** (`{ "type": "move", "target": 24 }`, `{ "type": "collect", "amount": 200 }`, `{ "type": "pardon" }`) so adding cards means editing JSON, not code.

**Trading**
- A player proposes properties + cash + Pardon cards; the other accepts or rejects.
- On accept, the server executes the swap **atomically**.

**Rent calculation** lives in one function — `calculateRent(tile, gameState)` — where every rule toggle is applied (full-set bonus, houses/hotels, prison rule, mortgage). This keeps rule logic in one place.

---

## 9. Host Lobby Settings (Toggles)

All settings write into `GameState.settings` and are **read-only once the game starts**. Each is a small `if (settings.x)` branch in the engine — data-driven, so no code forking for house rules.

| Setting | Effect |
|---|---|
| **Board map** | Which themed board to play (Mr. Worldwide, Pakistan, …). |
| **x2 rent on full-set** | If an owner holds a whole color set, base rent is doubled. |
| **Vacation cash** | Taxes & bank fees accumulate in a pot; landing on Vacation pays it out. |
| **Auction** | If a player declines to buy, the tile goes to auction (highest bidder wins). |
| **Don't collect rent in prison** | Owners in jail collect no rent. |
| **Mortgage** | Mortgage for 50% of cost; no rent while mortgaged. |
| **Even build** | Houses/hotels must be built (and sold) evenly across a color set. |
| **Starting cash** | Seeds each player's starting balance (e.g. 1500). |
| **Randomize turn order** | Shuffles player order at game start. |
| **Max players** | Room capacity (2–8). |
| **Allow bots** | Permit AI players to fill seats. |
| **Only logged-in users** | Restrict joining to authenticated users (for later/public). |

---

## 10. Development Approach

**Build and test everything locally first.** Run both the frontend and the Socket.io server on `localhost`, and simulate multiple players by opening **several browser tabs** — each tab is a "player." This is the fastest possible dev loop and needs no hosting, ngrok, or second device.

> **Do not solve "how do friends connect" until the game works.** That's a deployment step handled at the very end (see §12), and it takes ~20 minutes once there's something to connect to.

**Golden rules while building:**
- Keep action handlers **synchronous** through each read-modify-write (don't `await` mid-mutation).
- Treat `settings` as **immutable** once `status` becomes `in_progress`.
- Build one mechanic at a time and test it across tabs before moving on.

---

## 11. Implementation Plan (Phases)

| Phase | Focus | Definition of done |
|---|---|---|
| **0 — Scaffolding** | Repo with shared `types/`, empty Next.js + empty Node/Socket.io server. | Frontend opens a socket to the server (locally). |
| **1 — Rooms + Chat** | Create/join room by code, player list, in-game chat, host settings panel (UI only). | Two tabs chat in the same room. |
| **2 — Map System + Static Board** | Define map configs (Mr. Worldwide first), render the 40-tile ring from data, draw tokens. | Board renders correctly from a selected map config. |
| **3 — Turn Engine** | Turn-phase state machine, server-side dice, movement, turn advance, doubles + 3-doubles-to-jail. | Players take turns and move; doubles logic verified. |
| **4 — Economy** | Buying, rent, taxes, Start salary, bankruptcy. `calculateRent()` in place. | Landing on tiles has correct money effects. |
| **5 — Jail** | Pay / Pardon / roll-doubles with 3-attempt limit. | All jail exit paths work. |
| **6 — Cards** | Surprise & Treasure decks, data-driven effects, draw/discard/reshuffle. | Cards apply effects correctly and recycle. |
| **7 — Houses / Hotels / Mortgages** | Building, even-build validation, mortgaging rules. | Building + mortgage rules enforced. |
| **8 — Auctions + Trading** | Auction phase; propose/accept/reject trades executed atomically. | A full auction and a full trade complete cleanly. |
| **9 — Wire the Toggles** | Make every host setting actually branch in the engine. | Each toggle visibly changes gameplay. |
| **10 — Resilience + Polish** | Redis snapshots + reconnection, dice animations, win condition, second map (Pakistan). | A friend can drop and rejoin; game has a proper end. |

**Start here:** Phase 1's chat is the proof that rooms + broadcast work. If chat works across tabs, the entire real-time foundation is solid.

---

## 12. Deployment Plan

### During development
Everything on **`localhost`** + multiple browser tabs. No hosting needed.

### To play with friends — two easy options

**Option A — ngrok (fire it up per game night)**
- Run the server on your PC, then `ngrok http 3000` to get a public tunnel URL. Friends open it from anywhere.
- ✅ Zero deployment/config. ❌ Your PC must stay on and awake; the free URL changes each session (just resend the link).
- Best for "we're all playing right now, then I turn it off."

**Option B — deploy the server (so your PC can be off)**

> ⚠️ **Hosting landscape as of mid-2026 — verify current pricing before committing.**

- **Render (recommended for free)** — genuine free tier, **no credit card**; ~512 MB RAM / 0.1 CPU; ~750 free instance-hours per month. Free web services **spin down after ~15 min of inactivity** and take **~30–60s to cold-start** on the next connection. The nuance for a game: **active WebSocket traffic keeps it awake while you play** — the only cost is a ~1-minute wait when the first person joins after idle. Perfectly fine for friends-only sessions.
- **Railway (no longer the free pick)** — dropped its permanent free tier: a one-time ~$5 trial credit (payment info required), then a minimal ~$1/month tier or the **$5/month** Hobby plan. Skip unless you're okay paying ~$5/mo.
- **Others** — Fly.io (small free VM allowances) and a **GCP Cloud Run instance with `min-instances=1`** (so connections aren't dropped) are solid alternatives, especially if you already use GCP.

**Frontend** deploys to **Vercel** in both options; just point it at whichever server URL you're using.

### Going public (later)
Put the *same* server on a paid always-on instance (Render/Fly/GCP), add **Redis** for reconnection + restart resilience, add **Postgres** for accounts/lobby history/stats, and layer a matchmaking service on top. **No rearchitecting** — you swap the server URL and add persistence.

---

## 13. Suggested Project Structure

```
monopoly-game/
├── shared/                     # shared TypeScript types (single source of truth)
│   └── types.ts                # GameState, Player, Tile, MapConfig, Card, ...
│
├── server/                     # Node.js + Socket.io game server
│   ├── index.ts                # socket setup, room registry
│   ├── engine/
│   │   ├── stateMachine.ts     # turn phases
│   │   ├── dice.ts             # server-side rolls + doubles
│   │   ├── economy.ts          # buy / rent / tax / bankruptcy
│   │   ├── calculateRent.ts    # all rent + toggle logic in one place
│   │   ├── jail.ts
│   │   ├── cards.ts            # deck draw/discard/effects
│   │   ├── trade.ts
│   │   └── auction.ts
│   ├── rooms.ts                # create/join, room lifecycle
│   └── maps/                   # ← board map configs (data-driven)
│       ├── index.ts            # registry of available maps
│       ├── mrWorldwide.ts
│       └── pakistan.ts
│
├── client/                     # Next.js (React) frontend  → Vercel
│   ├── app/                    # pages/routes (lobby, room, game)
│   ├── components/
│   │   ├── Board.tsx           # renders 40 tiles from map config (CSS Grid)
│   │   ├── Tile.tsx
│   │   ├── Dice.tsx
│   │   ├── PlayerPanel.tsx
│   │   ├── Chat.tsx
│   │   ├── TradeModal.tsx
│   │   └── LobbySettings.tsx
│   ├── hooks/useSocket.ts      # socket connection + state sync
│   └── lib/socket.ts
│
└── README.md
```

---

## 14. Milestones & Roadmap

- **🎯 MVP (Phases 0–4):** Rooms + chat + a working *Mr. Worldwide* board + turns + basic buy/rent. Playable with friends via ngrok.
- **🎯 Full Game (Phases 5–9):** Jail, cards, houses/hotels, mortgages, auctions, trading, and all host toggles working.
- **🎯 Polished Friends Build (Phase 10):** Reconnection, a second map (*Pakistan*), animations, and a proper win condition — deployed to Render free.
- **🚀 Public (future):** Accounts, matchmaking, persistence (Redis + Postgres), more maps, and a paid always-on host.

---

## 15. Future Enhancements

- **More board maps** — Classic, Europe, custom community maps; a possible in-app **map editor**.
- **Bots / AI players** to fill empty seats (the "Allow bots" setting).
- **Spectator mode** and shareable game replays (from the action log).
- **Player accounts, stats, and leaderboards** (for the public version).
- **Sound & richer animations** (dice physics, token movement, money changes).
- **Mobile-first UI polish** and installable PWA.
- **Reconnect-anywhere** using Redis-backed sessions so a dropped player rejoins seamlessly.

---

*This document is the living plan for the project — update it as decisions evolve. Start with Phase 1 (rooms + chat) on `localhost`; it proves the entire real-time foundation.*
