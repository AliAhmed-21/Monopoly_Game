import { type GameState } from "@monopoly/shared";
import { playerById, countGroupOwned, ownsFullGroup } from "./util.js";

/**
 * All rent + toggle logic in one place (README §8). Returns what the player
 * landing on `tileIndex` owes the owner. `diceSum` is needed for utilities.
 */
export function calculateRent(state: GameState, tileIndex: number, diceSum: number): number {
  const tile = state.map!.tiles[tileIndex];
  const bt = state.board[tileIndex];
  if (!bt.owner || bt.mortgaged) return 0;

  const owner = playerById(state, bt.owner);
  if (!owner || owner.isBankrupt) return 0;

  // House rule: owners in prison collect no rent.
  if (state.settings.noRentInPrison && owner.inJail) return 0;

  if (tile.type === "railroad") {
    const owned = countGroupOwned(state, owner.id, "airport");
    const ladder = tile.rent ?? [25, 50, 100, 200];
    return ladder[Math.min(owned, ladder.length) - 1] ?? 0;
  }

  if (tile.type === "utility") {
    const owned = countGroupOwned(state, owner.id, "utility");
    const multiplier = owned >= 2 ? 10 : 4;
    return diceSum * multiplier;
  }

  if (tile.type === "property") {
    const rent = tile.rent!;
    if (bt.hotel) return rent[5];
    if (bt.houses > 0) return rent[bt.houses];

    // No houses: base rent, optionally doubled for a full color set.
    let base = rent[0];
    if (state.settings.doubleRentFullSet && tile.group && ownsFullGroup(state, owner.id, tile.group)) {
      base *= 2;
    }
    return base;
  }

  return 0;
}
