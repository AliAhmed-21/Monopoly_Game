import { type GameState, type TradeOffer } from "@monopoly/shared";
import { log, playerById } from "./util.js";

/** Validate a proposed trade against both players' current holdings. */
export function validateTrade(state: GameState, offer: TradeOffer): string | null {
  const from = playerById(state, offer.fromId);
  const to = playerById(state, offer.toId);
  if (!from || !to) return "Both players must be in the game.";
  if (from.id === to.id) return "You can't trade with yourself.";
  if (from.isBankrupt || to.isBankrupt) return "Can't trade with a bankrupt player.";

  if (from.money < offer.offerCash) return "You don't have that much cash.";
  if (to.money < offer.requestCash) return "They don't have that much cash.";
  if (from.pardonCards < offer.offerPardons) return "You don't have that many Pardon cards.";
  if (to.pardonCards < offer.requestPardons) return "They don't have that many Pardon cards.";

  for (const t of offer.offerProperties) {
    if (state.board[t].owner !== from.id) return "You don't own all offered properties.";
    if (state.board[t].houses > 0 || state.board[t].hotel)
      return "Sell buildings before trading a property.";
  }
  for (const t of offer.requestProperties) {
    if (state.board[t].owner !== to.id) return "They don't own all requested properties.";
    if (state.board[t].houses > 0 || state.board[t].hotel)
      return "Their properties still have buildings.";
  }
  return null;
}

/** Execute the swap atomically (README §8). Assumes validateTrade passed. */
export function executeTrade(state: GameState, offer: TradeOffer): void {
  const from = playerById(state, offer.fromId)!;
  const to = playerById(state, offer.toId)!;

  // Cash
  from.money -= offer.offerCash;
  to.money += offer.offerCash;
  to.money -= offer.requestCash;
  from.money += offer.requestCash;

  // Pardon cards
  from.pardonCards -= offer.offerPardons;
  to.pardonCards += offer.offerPardons;
  to.pardonCards -= offer.requestPardons;
  from.pardonCards += offer.requestPardons;

  // Properties: from → to
  for (const t of offer.offerProperties) {
    state.board[t].owner = to.id;
    from.properties = from.properties.filter((p) => p !== t);
    to.properties.push(t);
  }
  // Properties: to → from
  for (const t of offer.requestProperties) {
    state.board[t].owner = from.id;
    to.properties = to.properties.filter((p) => p !== t);
    from.properties.push(t);
  }

  log(state, `${from.name} and ${to.name} completed a trade.`);
}
