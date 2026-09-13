# 🎲 Setup & Run

This repo implements the plan in [README.md](README.md) as a TypeScript monorepo
(npm workspaces): **`shared/`** (types), **`server/`** (Node + Socket.io game
engine), **`client/`** (Next.js UI).

## Prerequisites
- Node.js 18+ (tested on Node 24)
- npm 9+

## Install
```bash
npm install
```
Installs all three workspaces at once (shared types are linked automatically).

## Run locally (the dev loop from README §10)
Start the real-time server **and** the Next.js client together:
```bash
npm run dev
```
- Client UI → http://localhost:3000
- Game server (Socket.io) → http://localhost:3001

Or run them separately:
```bash
npm run dev:server   # game server on :3001
npm run dev:client   # Next.js UI on :3000
```

### Play
1. Open http://localhost:3000, enter a name, **Create a room**.
2. Copy the invite link (or the 5-letter room code).
3. Open **more browser tabs** and join with the code — each tab is a player
   (README §10). Two players minimum to start.
4. Host picks a map + house rules in the lobby, then **Start Game**.

## Environment variables
| Var | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `3001` | Game server port |
| `CLIENT_ORIGIN` | server | `*` | Allowed CORS origin (set to your Vercel URL in prod) |
| `NEXT_PUBLIC_SERVER_URL` | client | `http://localhost:3001` | Server the client connects to |

## Useful scripts
```bash
npm run typecheck          # typecheck server + client
npm run build              # production build of the Next.js client
npm --workspace server start   # run the server without watch
```

## Deploying (README §12)
- **Client** → Vercel. Set `NEXT_PUBLIC_SERVER_URL` to your server's public URL.
- **Server** → a stateful host (Render/Fly/GCP) or `ngrok http 3001` for a game
  night. Set `CLIENT_ORIGIN` to your Vercel domain. Health check: `GET /health`.

## What's implemented
Phases 0–9 of the plan: rooms + chat, data-driven maps (Mr. Worldwide +
Pakistan), server-authoritative turn engine (dice/doubles/3-doubles-to-jail),
economy (buy/rent/tax/salary/bankruptcy with auto-liquidation), jail
(pay/pardon/roll), data-driven cards, houses/hotels + even-build, mortgages,
auctions, atomic trading, and all host toggles. Reconnect-by-session is in
place; Redis persistence (Phase 10) is the next step for restart resilience.
