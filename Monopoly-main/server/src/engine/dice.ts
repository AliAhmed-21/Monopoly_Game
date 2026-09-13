/** Server-side dice — clients never generate rolls (README §8). */
export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(): [number, number] {
  return [rollDie(), rollDie()];
}

export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}
