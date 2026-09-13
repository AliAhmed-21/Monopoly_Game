import { type GameState, type Card } from "@monopoly/shared";

/** Deck helpers: draw from the top, reshuffle discards when empty (README §8). */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Seed the draw piles (shuffled) and empty discards when a game starts. */
export function initDecks(state: GameState): void {
  const map = state.map!;
  state.decks = {
    surprise: shuffle(map.decks.surprise.map((c) => c.id)),
    treasure: shuffle(map.decks.treasure.map((c) => c.id)),
    discard: { surprise: [], treasure: [] },
  };
}

function findCard(state: GameState, deck: "surprise" | "treasure", id: string): Card {
  return state.map!.decks[deck].find((c) => c.id === id)!;
}

/** Draw the top card of a deck, reshuffling the discard pile if needed. */
export function drawCard(state: GameState, deck: "surprise" | "treasure"): Card {
  let pile = state.decks[deck];
  if (pile.length === 0) {
    state.decks[deck] = shuffle(state.decks.discard[deck]);
    state.decks.discard[deck] = [];
    pile = state.decks[deck];
  }
  const id = pile.shift()!;
  return findCard(state, deck, id);
}

/** Send a drawn card to its discard pile (unless it's kept, e.g. a Pardon). */
export function discardCard(
  state: GameState,
  deck: "surprise" | "treasure",
  card: Card
): void {
  if (card.effect.type === "pardon") return; // kept by the player
  state.decks.discard[deck].push(card.id);
}
