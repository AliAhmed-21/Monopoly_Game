import { type GameState, type Player } from "@monopoly/shared";
import { log, ownsFullGroup, tileAt } from "./util.js";

/** Buy / build / mortgage logic (README §8). Each returns an error string or null. */

export function buyProperty(state: GameState, player: Player, tileIndex: number): string | null {
  const tile = tileAt(state, tileIndex);
  const bt = state.board[tileIndex];
  if (bt.owner !== null) return "That tile is already owned.";
  if (tile.price === undefined) return "That tile can't be bought.";
  if (player.money < tile.price) return "Not enough money to buy this.";

  player.money -= tile.price;
  bt.owner = player.id;
  player.properties.push(tileIndex);
  log(state, `${player.name} bought ${tile.name} for ${state.map!.currency}${tile.price}.`);
  return null;
}

/** Even-build check: houses across a color set must stay within 1 of each other. */
function evenBuildOk(state: GameState, group: string, tileIndex: number, building: boolean): boolean {
  const groupTiles = state.map!.tiles.filter((t) => t.group === group);
  const levels = groupTiles.map((t) => {
    const b = state.board[t.id];
    return b.hotel ? 5 : b.houses;
  });
  const target = state.board[tileIndex].hotel ? 5 : state.board[tileIndex].houses;
  if (building) {
    // Can only build on the tile(s) with the fewest buildings.
    return target === Math.min(...levels);
  }
  // Selling: can only sell from the tile(s) with the most buildings.
  return target === Math.max(...levels);
}

export function buildHouse(state: GameState, player: Player, tileIndex: number): string | null {
  const tile = tileAt(state, tileIndex);
  const bt = state.board[tileIndex];
  if (tile.type !== "property") return "You can only build on properties.";
  if (bt.owner !== player.id) return "You don't own that.";
  if (!tile.group || !ownsFullGroup(state, player.id, tile.group))
    return "You need the full color set to build.";
  if (bt.mortgaged) return "Can't build on a mortgaged property.";
  if (bt.hotel) return "Already has a hotel.";
  if (state.settings.evenBuild && !evenBuildOk(state, tile.group, tileIndex, true))
    return "Even-build rule: build across the set evenly.";
  const cost = tile.houseCost ?? 0;
  if (player.money < cost) return "Not enough money to build.";

  player.money -= cost;
  if (bt.houses >= 4) {
    bt.houses = 4;
    bt.hotel = true;
    log(state, `${player.name} built a hotel on ${tile.name}.`);
  } else {
    bt.houses += 1;
    log(state, `${player.name} built a house on ${tile.name}.`);
  }
  return null;
}

export function sellHouse(state: GameState, player: Player, tileIndex: number): string | null {
  const tile = tileAt(state, tileIndex);
  const bt = state.board[tileIndex];
  if (bt.owner !== player.id) return "You don't own that.";
  if (!bt.hotel && bt.houses === 0) return "Nothing to sell.";
  if (state.settings.evenBuild && tile.group && !evenBuildOk(state, tile.group, tileIndex, false))
    return "Even-build rule: sell across the set evenly.";

  const refund = Math.floor((tile.houseCost ?? 0) / 2);
  if (bt.hotel) {
    bt.hotel = false;
    bt.houses = 4;
  } else {
    bt.houses -= 1;
  }
  player.money += refund;
  log(state, `${player.name} sold a building on ${tile.name}.`);
  return null;
}

export function mortgage(state: GameState, player: Player, tileIndex: number): string | null {
  if (!state.settings.mortgageEnabled) return "Mortgages are disabled in this game.";
  const tile = tileAt(state, tileIndex);
  const bt = state.board[tileIndex];
  if (bt.owner !== player.id) return "You don't own that.";
  if (bt.mortgaged) return "Already mortgaged.";
  if (bt.hotel || bt.houses > 0) return "Sell buildings before mortgaging.";
  const value = Math.floor((tile.price ?? 0) / 2);
  bt.mortgaged = true;
  player.money += value;
  log(state, `${player.name} mortgaged ${tile.name} for ${state.map!.currency}${value}.`);
  return null;
}

export function unmortgage(state: GameState, player: Player, tileIndex: number): string | null {
  const tile = tileAt(state, tileIndex);
  const bt = state.board[tileIndex];
  if (bt.owner !== player.id) return "You don't own that.";
  if (!bt.mortgaged) return "That isn't mortgaged.";
  const cost = Math.ceil((tile.price ?? 0) * 0.55); // ~110% of the mortgage value
  if (player.money < cost) return "Not enough money to lift the mortgage.";
  player.money -= cost;
  bt.mortgaged = false;
  log(state, `${player.name} lifted the mortgage on ${tile.name}.`);
  return null;
}
