import type { GameState, Player, Tile } from "@monopoly/shared";
import { PLAYER_COLORS } from "@monopoly/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Property-group swatches — restyled with real visual weight (truck-art enamel).
// Keys are unchanged (README §6) so the engine/data stay untouched.
// ─────────────────────────────────────────────────────────────────────────────
export const GROUP_COLORS: Record<string, string> = {
  brown: "#9A5A34",
  lightblue: "#4FB0D9",
  pink: "#E86AA6",
  orange: "#F2872E",
  red: "#E23B4E",
  yellow: "#F2C230",
  green: "#2FA96B",
  darkblue: "#2E52C8",
  airport: "#6D5BD0",
  utility: "#3E9AA8",
};

// ─────────────────────────────────────────────────────────────────────────────
// Player "skins" — 8 vivid, evenly-spaced truck-art hues, high-contrast on both
// the light parchment tiles and the dark panels. We remap the server-assigned
// color (from shared PLAYER_COLORS, matched by slot) to these — purely visual,
// no game/state change.
// ─────────────────────────────────────────────────────────────────────────────
export const PLAYER_SKINS: string[] = [
  "#E5384D", // rose-red
  "#F0862E", // marigold
  "#F4C430", // mango
  "#2FB865", // parrot green
  "#12B5C9", // peacock
  "#3B6FE0", // cobalt
  "#9B4DE0", // aubergine
  "#EC4899", // rani pink
];

/** Map a player's server color to their designed skin (falls back gracefully). */
export function playerColor(player: Pick<Player, "color">): string {
  const idx = PLAYER_COLORS.indexOf(player.color);
  return idx >= 0 ? PLAYER_SKINS[idx % PLAYER_SKINS.length] : player.color;
}

/** Relative luminance → choose dark or light ink so a label stays legible. */
export function readableInk(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#20160c" : "#ffffff";
}

/** A translucent tint of a player color, for card backgrounds / highlights. */
export function tint(hex: string, alpha = 0.14): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Province identity — every city's "flag". Gives per-tile variety the way
// RichUp leans on country flags. Matched by name substring.
// ─────────────────────────────────────────────────────────────────────────────
export type ProvinceId = "balochistan" | "sindh" | "kpk" | "punjab" | "ict";

export const PROVINCES: Record<
  ProvinceId,
  { label: string; short: string; color: string }
> = {
  balochistan: { label: "Balochistan", short: "BL", color: "#E0A82E" },
  sindh: { label: "Sindh", short: "SD", color: "#17A6B8" },
  kpk: { label: "Khyber Pakhtunkhwa", short: "KP", color: "#2FA96B" },
  punjab: { label: "Punjab", short: "PB", color: "#E0603A" },
  ict: { label: "Islamabad Capital", short: "ICT", color: "#9B4DE0" },
};

const PROVINCE_BY_KEYWORD: [string, ProvinceId][] = [
  ["gwadar", "balochistan"],
  ["turbat", "balochistan"],
  ["quetta", "balochistan"],
  ["peshawar", "kpk"],
  ["abbottabad", "kpk"],
  ["mardan", "kpk"],
  ["sukkur", "sindh"],
  ["hyderabad", "sindh"],
  ["karachi", "sindh"],
  ["khi", "sindh"],
  ["islamabad", "ict"],
  ["isb", "ict"],
];

/** Resolve a city/airport tile name to its province (Punjab is the default heartland). */
export function provinceOf(name: string): ProvinceId {
  const n = name.toLowerCase();
  for (const [kw, prov] of PROVINCE_BY_KEYWORD) {
    if (n.includes(kw)) return prov;
  }
  return "punjab";
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────
export function money(state: GameState | null, amount: number): string {
  const cur = state?.map?.currency ?? "$";
  return `${cur}${amount.toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Board geometry (unchanged — README §4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grid placement (11×11) for a tile index on the classic ring.
 * START (0) sits at the TOP-LEFT and the ring winds clockwise, so Prison (10)
 * lands at the TOP-RIGHT, Vacation (20) bottom-right, Go-To-Prison (30)
 * bottom-left. The token layer derives from this same map, so it follows along.
 */
export function gridPos(i: number): { row: number; col: number } {
  if (i === 0) return { row: 1, col: 1 };
  if (i < 10) return { row: 1, col: 1 + i };
  if (i === 10) return { row: 1, col: 11 };
  if (i < 20) return { row: i - 9, col: 11 };
  if (i === 20) return { row: 11, col: 11 };
  if (i < 30) return { row: 11, col: 31 - i };
  if (i === 30) return { row: 11, col: 1 };
  return { row: 41 - i, col: 1 };
}

/** Which edge a tile is on — used to orient the color bar. */
export function tileEdge(
  i: number
): "bottom" | "left" | "top" | "right" | "corner" {
  if (i === 0 || i === 10 || i === 20 || i === 30) return "corner";
  if (i < 10) return "top";
  if (i < 20) return "right";
  if (i < 30) return "bottom";
  return "left";
}

/**
 * Non-uniform board tracks — the four corner tracks are wider so corner tiles
 * render bigger than the edge tiles (classic Monopoly proportions).
 */
export const BOARD_TRACKS = [1.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.35];
const TRACK_TOTAL = BOARD_TRACKS.reduce((a, b) => a + b, 0);

/** grid-template-columns / -rows value for the board. */
export const boardGridTemplate = BOARD_TRACKS.map((t) => `${t}fr`).join(" ");

function trackCenterPct(oneBased: number): number {
  let before = 0;
  for (let k = 0; k < oneBased - 1; k++) before += BOARD_TRACKS[k];
  return ((before + BOARD_TRACKS[oneBased - 1] / 2) / TRACK_TOTAL) * 100;
}

/** Center point (%) of a tile's cell on the board — for the token layer. */
export function tileCenterPct(i: number): { x: number; y: number } {
  const { row, col } = gridPos(i);
  return { x: trackCenterPct(col), y: trackCenterPct(row) };
}

export type TileKind =
  | "start"
  | "jail"
  | "vacation"
  | "goto_jail"
  | "airport"
  | "water"
  | "power"
  | "tax"
  | "surprise"
  | "treasure"
  | "property";

/** Normalise a tile to a single icon kind (keeps the original icon logic). */
export function tileKind(tile: Tile): TileKind {
  switch (tile.type) {
    case "railroad":
      return "airport";
    case "utility":
      return tile.name.toLowerCase().includes("water") ||
        tile.name.toLowerCase().includes("wapda")
        ? "water"
        : "power";
    case "tax":
      return "tax";
    case "surprise":
      return "surprise";
    case "treasure":
      return "treasure";
    case "corner":
      return (tile.subtype ?? "start") as TileKind;
    default:
      return "property";
  }
}
