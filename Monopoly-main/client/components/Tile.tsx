"use client";

import type { GameState, Tile as TileT } from "@monopoly/shared";
import { playerColor, readableInk, tileKind, tileEdge } from "@/lib/theme";
import { CornerArt, HotelIcon, HouseGlyph, TileGlyph } from "./icons";
import { Flag } from "./Flag";

const GLYPH_COLOR: Record<string, string> = {
  airport: "#8AB4FF",
  water: "#4FD1E0",
  power: "#F2C230",
  tax: "#F0495A",
  surprise: "#9B8CFF",
  treasure: "#34D399",
};

const CORNER_BG: Record<string, string> = {
  start: "linear-gradient(160deg,#2f3a63,#1d2138)",
  jail: "linear-gradient(160deg,#3f2a44,#1d2138)",
  vacation: "linear-gradient(160deg,#2b4460,#1d2138)",
  goto_jail: "linear-gradient(160deg,#43293a,#1d2138)",
};

/**
 * Every edge tile is laid out as if it sat on the TOP row — price/owner band on
 * the OUTER edge, then the name, with the flag hanging off the INNER edge — and
 * the whole stack is rotated into place. One layout covers all four sides.
 *
 * The side columns turn so each reads from ITS OWN side of the board: the left
 * column's letters stand up for a player sitting on the left (tops facing the
 * board's centre), the right column's for a player on the right. That's why the
 * two are mirrored, and why both also `reverse` — rotating the plane that way
 * swings its top edge INWARD, so the stack has to flip to put the price band
 * back on the outer edge. The bottom row stays upright and flips for the same
 * reason.
 */
const LAYOUT: Record<string, { rotate: number; reverse: boolean }> = {
  top: { rotate: 0, reverse: false },
  right: { rotate: -90, reverse: true },
  bottom: { rotate: 0, reverse: true },
  left: { rotate: 90, reverse: true },
  corner: { rotate: 0, reverse: false },
};

/**
 * Where the round flag sits: centred on the tile's INNER edge and pulled half
 * outside it, so it breaks the card's outline the way the reference does. These
 * are tile-space (unrotated) — a circle reads the same at any angle.
 */
const FLAG_POS: Record<string, string> = {
  top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  left: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  right: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  corner: "",
};

/**
 * One size for nearly every tile — a board where each name is set differently
 * reads as noise, so names wrap onto a second line rather than shrinking, and
 * only a word too long to fit the tile's width at all steps down. Measuring the
 * longest WORD (not the whole string) is what keeps "San Francisco" at full
 * size while "Manchester" — which can't break — takes the one step it needs.
 */
function nameScale(name: string): string {
  const longest = Math.max(...name.split(/[\s\-/]+/).map((w) => w.length));
  if (longest <= 9) return "1.05em";
  if (longest <= 11) return "0.9em";
  return "0.78em";
}

export function Tile({
  tile,
  state,
  onSelect,
}: {
  tile: TileT;
  state: GameState;
  onSelect?: (id: number) => void;
}) {
  const bt = state.board[tile.id];
  const kind = tileKind(tile);
  const owner = bt?.owner ? state.players.find((p) => p.id === bt.owner) : null;
  const ownerColor = owner ? playerColor(owner) : null;
  const edge = tileEdge(tile.id);

  // ── Corner tiles: distinct background + larger illustration ──
  if (tile.type === "corner" && tile.subtype) {
    const showPot = tile.subtype === "vacation";
    return (
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden rounded-md ring-1 ring-white/15"
        style={{ background: CORNER_BG[tile.subtype] }}
        title={tile.name}
      >
        <CornerArt subtype={tile.subtype} className="h-[58%] w-[58%]" />
        {showPot && (
          <span className="absolute left-1/2 top-[0.3em] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brass px-[0.5em] py-[0.1em] font-numeric text-[0.95em] font-bold text-parchment-ink shadow ring-1 ring-black/20">
            {state.map?.currency}
            {state.vacationPot.toLocaleString()}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/55 py-[0.24em] text-center font-display text-[0.95em] font-bold uppercase leading-tight tracking-wide text-brass">
          {tile.name}
        </span>
      </div>
    );
  }

  const isProperty = tile.type === "property";
  const detailable =
    tile.type === "property" || tile.type === "railroad" || tile.type === "utility";
  const owned = !!owner && !!ownerColor;
  const houses = bt?.houses ?? 0;
  const { rotate, reverse } = LAYOUT[edge];
  const bandInk = ownerColor ? readableInk(ownerColor) : "#fff";

  // Local-space padding that keeps the name clear of the overhanging flag. A
  // reversed stack (bottom row + both side columns) puts the flag on the plane's
  // other end, so the gap has to move with it.
  const innerPad = isProperty ? (reverse ? "pt-[1.05em]" : "pb-[1.05em]") : "";

  return (
    // Deliberately NOT clipped — the flag has to break the tile's edge. The card
    // below carries its own clip for the background wash and the owner band.
    <div
      className={`tile-face relative h-full w-full ${detailable ? "cursor-pointer" : ""}`}
      title={owner ? `${tile.name} — owned by ${owner.name}` : tile.name}
      onClick={detailable ? () => onSelect?.(tile.id) : undefined}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-md ring-1 ring-inset transition-colors"
        style={{
          // The card itself: a cool navy plate, lit slightly from the top.
          background: "linear-gradient(180deg,#333a5e 0%,#2a3050 45%,#232840 100%)",
          // Owned tiles pick up a hairline in the owner's colour; the band
          // carries the strong statement, so this stays a whisper.
          ["--tw-ring-color" as string]: owned
            ? `${ownerColor}80`
            : "rgba(255,255,255,0.10)",
        }}
      >
        {/* Blurred flag wash — gives each city a whisper of its own colour
            without taking the navy card away from it. A scrim on top keeps the
            name legible over busy flags. */}
        {isProperty && (
          <span className="pointer-events-none absolute inset-0" aria-hidden>
            <Flag
              name={tile.name}
              bare
              className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-[0.17] blur-[0.9em] saturate-150"
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,32,56,0.28),rgba(28,32,56,0.55))]" />
          </span>
        )}

        {/* Rotated content plane — sized to the tile's swapped axes when sideways */}
        <div
          className={rotate === 0 ? "absolute inset-0" : "tile-plane"}
          style={
            rotate === 0 ? undefined : { transform: `translate(-50%,-50%) rotate(${rotate}deg)` }
          }
        >
          <div
            className={`flex h-full w-full items-center ${
              reverse ? "flex-col-reverse" : "flex-col"
            }`}
          >
            {/* Outer edge: ownership band, or the asking price / tax due */}
            {owned ? (
              <span
                className="flex h-[19%] w-full shrink-0 items-center justify-center gap-[0.16em]"
                style={{ backgroundColor: ownerColor!, color: bandInk }}
              >
                {bt.hotel ? (
                  <HotelIcon className="h-[1.15em] w-[1.15em]" />
                ) : houses > 0 ? (
                  <>
                    <HouseGlyph className="h-[1.05em] w-[1.05em]" />
                    <span className="font-numeric text-[0.85em] font-bold leading-none">
                      ×{houses}
                    </span>
                  </>
                ) : null}
              </span>
            ) : (
              <span className="flex h-[19%] w-full shrink-0 items-center justify-center">
                {tile.type === "tax" ? (
                  <span className="rounded-[0.25em] bg-crimson/25 px-[0.42em] py-[0.1em] font-numeric text-[0.86em] font-bold leading-none text-crimson">
                    {tile.amount} {state.map?.currency}
                  </span>
                ) : (
                  tile.price !== undefined && (
                    <span className="rounded-[0.25em] bg-white/[0.16] px-[0.42em] py-[0.1em] font-numeric text-[0.86em] font-semibold leading-none text-slate-100">
                      {tile.price} {state.map?.currency}
                    </span>
                  )
                )}
              </span>
            )}

            {/* Name, plus the type glyph on non-city tiles (sits on the inner
                side, where a city would put its flag). */}
            <div
              className={`flex min-h-0 flex-1 items-center justify-center gap-[0.18em] px-[0.18em] text-center ${innerPad} ${
                reverse ? "flex-col-reverse" : "flex-col"
              }`}
            >
              <span
                className="max-w-full text-balance font-display font-semibold leading-[1.04] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
                style={{ fontSize: nameScale(tile.name) }}
              >
                {tile.name}
              </span>
              {!isProperty && (
                <span
                  className="inline-flex h-[2.05em] w-[2.05em] shrink-0 items-center justify-center"
                  style={{ color: GLYPH_COLOR[kind] ?? "#aab0c2" }}
                >
                  <TileGlyph kind={kind} className="h-full w-full" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The city's flag, straddling the inner edge */}
      {isProperty && (
        <Flag
          name={tile.name}
          className={`absolute z-10 h-[1.9em] w-[1.9em] shadow-[0_2px_5px_rgba(0,0,0,0.55)] ring-[0.12em] ring-[#232840] ${FLAG_POS[edge]}`}
        />
      )}

      {bt?.mortgaged && (
        <span className="absolute bottom-[0.12em] right-[0.2em] z-10 rounded-sm bg-crimson px-[0.22em] font-numeric text-[0.78em] font-bold text-white">
          MTG
        </span>
      )}
    </div>
  );
}
