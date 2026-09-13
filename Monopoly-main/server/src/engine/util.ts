import {
  type GameState,
  type Player,
  type Tile,
  type BoardTile,
  BOARD_SIZE,
  START_INDEX,
  JAIL_INDEX,
  START_SALARY,
} from "@monopoly/shared";

/** Shared engine helpers that mutate GameState in place (single writer, sync). */

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function tileAt(state: GameState, index: number): Tile {
  return state.map!.tiles[index];
}

export function boardTileAt(state: GameState, index: number): BoardTile {
  return state.board[index];
}

export function log(state: GameState, message: string): void {
  state.log.push(message);
  state.logSeq += 1;
  if (state.log.length > 200) state.log.shift();
}

/** How many tiles of a given group the player owns (that exist on the board). */
export function countGroupOwned(state: GameState, playerId: string, group: string): number {
  return state.map!.tiles.filter(
    (t) => t.group === group && state.board[t.id].owner === playerId
  ).length;
}

/** Does the player own every tile in the group (a "full set")? */
export function ownsFullGroup(state: GameState, playerId: string, group: string): boolean {
  const groupTiles = state.map!.tiles.filter((t) => t.group === group);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => state.board[t.id].owner === playerId);
}

/** Move a player forward `steps` tiles, awarding salary if they pass Start. */
export function moveBy(state: GameState, player: Player, steps: number): void {
  const before = player.position;
  let next = (before + steps) % BOARD_SIZE;
  if (next < 0) next += BOARD_SIZE;
  // Passed (or landed back on) Start while moving forward → salary.
  if (steps > 0 && before + steps >= BOARD_SIZE) {
    player.money += START_SALARY;
    log(state, `${player.name} passed Start and collected ${state.map!.currency}${START_SALARY}.`);
  }
  player.position = next;
}

/** Move a player to an absolute tile index (used by cards). */
export function moveTo(
  state: GameState,
  player: Player,
  target: number,
  awardSalary = true
): void {
  const before = player.position;
  if (awardSalary && target < before) {
    player.money += START_SALARY;
    log(state, `${player.name} passed Start and collected ${state.map!.currency}${START_SALARY}.`);
  }
  player.position = target;
}

export function sendToJail(state: GameState, player: Player): void {
  player.position = JAIL_INDEX;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  log(state, `${player.name} was sent to Prison.`);
}

/**
 * Try to raise `needed` extra cash for a player by selling buildings and
 * mortgaging property (auto-liquidation before bankruptcy). Mutates money.
 */
export function autoLiquidate(state: GameState, player: Player, needed: number): void {
  // 1) Sell houses/hotels for half their build cost.
  for (const tileId of player.properties) {
    if (player.money >= needed) return;
    const bt = state.board[tileId];
    const tile = state.map!.tiles[tileId];
    if (!tile.houseCost) continue;
    while (bt.hotel || bt.houses > 0) {
      if (player.money >= needed) return;
      const refund = Math.floor(tile.houseCost / 2);
      if (bt.hotel) bt.hotel = false;
      else bt.houses -= 1;
      player.money += refund;
    }
  }
  // 2) Mortgage un-mortgaged properties for half their price.
  for (const tileId of player.properties) {
    if (player.money >= needed) return;
    const bt = state.board[tileId];
    const tile = state.map!.tiles[tileId];
    if (bt.mortgaged || !tile.price) continue;
    bt.mortgaged = true;
    player.money += Math.floor(tile.price / 2);
    log(state, `${player.name} mortgaged ${tile.name} to raise cash.`);
  }
}

/**
 * Charge a player `amount`, paying `creditorId` (or the bank if null).
 * Auto-liquidates first; if still short, the player goes bankrupt.
 * Returns true if fully paid, false if it triggered bankruptcy.
 */
export function charge(
  state: GameState,
  player: Player,
  amount: number,
  creditorId: string | null,
  toVacationPot = false
): boolean {
  if (player.money < amount) {
    autoLiquidate(state, player, amount);
  }
  if (player.money >= amount) {
    player.money -= amount;
    if (creditorId) {
      const creditor = playerById(state, creditorId);
      if (creditor) creditor.money += amount;
    } else if (toVacationPot && state.settings.vacationCash) {
      state.vacationPot += amount;
    }
    return true;
  }
  // Can't cover it even after liquidating → bankruptcy.
  bankrupt(state, player, creditorId);
  return false;
}

export function pay(state: GameState, player: Player, amount: number): void {
  player.money += amount;
}

/** Declare a player bankrupt; transfer assets to a creditor or back to the bank. */
export function bankrupt(state: GameState, player: Player, creditorId: string | null): void {
  const creditor = creditorId ? playerById(state, creditorId) : null;
  log(
    state,
    `${player.name} went bankrupt${creditor ? ` to ${creditor.name}` : ""}.`
  );

  if (creditor) {
    creditor.money += Math.max(0, player.money);
    for (const tileId of player.properties) {
      state.board[tileId].owner = creditor.id;
      creditor.properties.push(tileId);
    }
    creditor.pardonCards += player.pardonCards;
  } else {
    // Assets return to the bank.
    for (const tileId of player.properties) {
      const bt = state.board[tileId];
      bt.owner = null;
      bt.houses = 0;
      bt.hotel = false;
      bt.mortgaged = false;
    }
  }

  player.money = 0;
  player.properties = [];
  player.pardonCards = 0;
  player.isBankrupt = true;
  player.inJail = false;

  checkWinCondition(state);
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.isBankrupt);
}

/** If only one player remains solvent, end the game. */
export function checkWinCondition(state: GameState): boolean {
  const alive = activePlayers(state);
  if (state.status === "in_progress" && alive.length <= 1) {
    state.status = "finished";
    state.turnPhase = "GAME_OVER";
    state.winnerId = alive[0]?.id ?? null;
    if (alive[0]) log(state, `🏆 ${alive[0].name} wins the game!`);
    return true;
  }
  return false;
}
