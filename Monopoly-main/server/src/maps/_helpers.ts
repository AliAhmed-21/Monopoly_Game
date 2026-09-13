import type { Tile, Card } from "@monopoly/shared";

/**
 * Helpers for building board maps from data. Every map follows the classic
 * 40-tile layout (README §6), so a themed map only fills in names/prices/groups.
 */

/** House cost per group tier. */
const HOUSE_COST: Record<string, number> = {
  brown: 50,
  lightblue: 50,
  pink: 100,
  orange: 100,
  red: 150,
  yellow: 150,
  green: 200,
  darkblue: 200,
};

/** Generate a rent ladder [base, 1h, 2h, 3h, 4h, hotel] from a price. */
export function rentLadder(price: number): number[] {
  const base = Math.max(2, Math.round(price * 0.05));
  return [base, base * 5, base * 15, base * 45, base * 70, base * 90];
}

/** A themed property tile. */
export function property(
  id: number,
  name: string,
  group: string,
  price: number
): Tile {
  return {
    id,
    type: "property",
    name,
    group,
    price,
    rent: rentLadder(price),
    houseCost: HOUSE_COST[group] ?? 100,
  };
}

/** An "airport" (railroad) tile. Rent scales with how many the owner holds. */
export function railroad(id: number, name: string, price = 200): Tile {
  return { id, type: "railroad", name, group: "airport", price, rent: [25, 50, 100, 200] };
}

/** A utility tile. Rent = dice roll × multiplier (handled in calculateRent). */
export function utility(id: number, name: string, price = 150): Tile {
  return { id, type: "utility", name, group: "utility", price };
}

export function tax(id: number, name: string, amount: number): Tile {
  return { id, type: "tax", name, amount };
}

export function surprise(id: number, name = "Surprise"): Tile {
  return { id, type: "surprise", name };
}

export function treasure(id: number, name = "Treasure"): Tile {
  return { id, type: "treasure", name };
}

export function corner(
  id: number,
  subtype: "start" | "jail" | "vacation" | "goto_jail",
  name: string
): Tile {
  return { id, type: "corner", subtype, name };
}

/** Card decks shared across maps (effects are data-driven — README §8). */
export function defaultDecks(): { surprise: Card[]; treasure: Card[] } {
  const surprise: Card[] = [
    { id: "s1", text: "Advance to Start. Collect salary.", effect: { type: "move", target: 0 } },
    { id: "s2", text: "Bank pays you a dividend of 50.", effect: { type: "collect", amount: 50 } },
    { id: "s3", text: "Go directly to Prison.", effect: { type: "goto_jail" } },
    { id: "s4", text: "Speeding fine — pay 20.", effect: { type: "pay", amount: 20 } },
    { id: "s5", text: "Get out of Prison free — keep this card.", effect: { type: "pardon" } },
    { id: "s6", text: "Go back 3 spaces.", effect: { type: "move_relative", steps: -3 } },
    { id: "s7", text: "You are elected chairman — pay each player 25.", effect: { type: "pay_each", amount: 25 } },
    { id: "s8", text: "Your building matures — collect 150.", effect: { type: "collect", amount: 150 } },
  ];
  const treasure: Card[] = [
    { id: "t1", text: "Bank error in your favor — collect 200.", effect: { type: "collect", amount: 200 } },
    { id: "t2", text: "Doctor's fee — pay 50.", effect: { type: "pay", amount: 50 } },
    { id: "t3", text: "From sale of stock you get 50.", effect: { type: "collect", amount: 50 } },
    { id: "t4", text: "Get out of Prison free — keep this card.", effect: { type: "pardon" } },
    { id: "t5", text: "It's your birthday — collect 10 from each player.", effect: { type: "collect_from_each", amount: 10 } },
    { id: "t6", text: "Income tax refund — collect 20.", effect: { type: "collect", amount: 20 } },
    { id: "t7", text: "Life insurance matures — collect 100.", effect: { type: "collect", amount: 100 } },
    { id: "t8", text: "Hospital fees — pay 100.", effect: { type: "pay", amount: 100 } },
  ];
  return { surprise, treasure };
}
