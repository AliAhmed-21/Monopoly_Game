import { type GameState, AUCTION_DURATION_MS } from "@monopoly/shared";
import { activePlayers, log, playerById, tileAt } from "./util.js";

/**
 * Timed auction (README §9). Triggered when a player declines to buy.
 * There is no "pass" — a countdown (`endsAt`) resolves the auction and awards
 * the tile to the last/high bidder. Every valid bid pushes `endsAt` forward.
 */

export function startAuction(state: GameState, tileIndex: number): void {
  state.activeAuction = {
    tileId: tileIndex,
    highestBid: 0,
    highestBidderId: null,
    activeBidderIds: activePlayers(state).map((p) => p.id),
    endsAt: Date.now() + AUCTION_DURATION_MS,
  };
  state.turnPhase = "AUCTION";
  log(state, `${tileAt(state, tileIndex).name} goes up for auction.`);
}

export function placeBid(state: GameState, bidderId: string, amount: number): string | null {
  const a = state.activeAuction;
  if (!a) return "No auction in progress.";
  if (!a.activeBidderIds.includes(bidderId)) return "You're not in this auction.";
  if (amount <= a.highestBid) return "Bid must beat the current high bid.";
  const bidder = playerById(state, bidderId);
  if (!bidder || bidder.money < amount) return "You can't afford that bid.";
  a.highestBid = amount;
  a.highestBidderId = bidderId;
  a.endsAt = Date.now() + AUCTION_DURATION_MS; // reset the countdown
  log(state, `${bidder.name} bid ${state.map!.currency}${amount}.`);
  return null;
}

/**
 * Resolve the auction now (called when the countdown expires): award the tile
 * to the high bidder, or leave it unowned if there were no bids.
 */
export function resolveAuction(state: GameState): void {
  const a = state.activeAuction;
  if (!a) return;
  if (a.highestBidderId) {
    const winner = playerById(state, a.highestBidderId)!;
    winner.money -= a.highestBid;
    state.board[a.tileId].owner = winner.id;
    winner.properties.push(a.tileId);
    log(
      state,
      `${winner.name} won ${tileAt(state, a.tileId).name} at auction for ${state.map!.currency}${a.highestBid}.`
    );
  } else {
    log(state, `No bids — ${tileAt(state, a.tileId).name} stays unowned.`);
  }
  state.activeAuction = null;
}
