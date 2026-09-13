import type { Player } from "@monopoly/shared";
import type { ActionIconKind } from "@/components/icons";

export interface ParsedLog {
  player: Player | null;
  /** The sentence with the leading player name stripped (name shown separately). */
  rest: string;
  raw: string;
  kind: ActionIconKind;
  /** Whether this event is "loud" enough to also raise a banner. */
  notable: boolean;
}

/** Classify a log line into an action-icon kind by keyword. */
function classify(line: string): { kind: ActionIconKind; notable: boolean } {
  const l = line.toLowerCase();
  if (l.includes("wins the game")) return { kind: "win", notable: true };
  if (l.includes("bought")) return { kind: "buy", notable: true };
  if (l.includes("drew a") || l.includes("card:")) return { kind: "card", notable: true };
  if (l.includes("bankrupt")) return { kind: "bankrupt", notable: true };
  if (l.includes("sent to prison") || l.includes("broke out") || l.includes("left prison"))
    return { kind: "prison", notable: true };
  if (l.includes("passed start")) return { kind: "start", notable: true };
  if (l.includes("pays") || l.includes("paid") || l.includes("fine") || l.includes("rent"))
    return { kind: "rent", notable: true };
  if (l.includes("built") || l.includes("sold a building")) return { kind: "build", notable: false };
  if (l.includes("trade")) return { kind: "trade", notable: true };
  if (l.includes("mortgage")) return { kind: "mortgage", notable: false };
  if (l.includes("prison") || l.includes("jail")) return { kind: "prison", notable: false };
  if (l.includes("rolled")) return { kind: "roll", notable: false };
  if (l.includes("joined") || l.includes("reconnected") || l.includes("created the room"))
    return { kind: "join", notable: false };
  if (l.includes("auction") || l.includes("bid")) return { kind: "trade", notable: false };
  return { kind: "event", notable: false };
}

/** Parse a raw server log line, resolving the acting player by name prefix. */
export function parseLogLine(raw: string, players: Player[]): ParsedLog {
  // Strip a leading emoji/symbol (e.g. "🏆 Name wins…") before name matching.
  const cleaned = raw.replace(/^[^\p{L}\p{N}]+/u, "");

  // Longest matching name prefix wins (guards against "Sam" vs "Samir").
  let player: Player | null = null;
  for (const p of players) {
    if (cleaned.startsWith(p.name)) {
      if (!player || p.name.length > player.name.length) player = p;
    }
  }

  const rest = player ? cleaned.slice(player.name.length).replace(/^\s+/, "") : cleaned;
  const { kind, notable } = classify(raw);
  return { player, rest, raw, kind, notable };
}
