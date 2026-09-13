"use client";

import { useEffect, useState } from "react";
import type { GameState, Player } from "@monopoly/shared";
import { JAIL_INDEX } from "@monopoly/shared";
import { playerColor, readableInk, tileCenterPct } from "@/lib/theme";

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** Fan offset (in % of a tile) so tokens sharing a spot stay individually visible. */
function fanOffset(i: number, count: number): { dx: number; dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 };
  const perRow = Math.min(3, count);
  const rows = Math.ceil(count / perRow);
  const col = i % perRow;
  const row = Math.floor(i / perRow);
  const spread = 26; // percent of one token's box
  return {
    dx: (col - (perRow - 1) / 2) * spread,
    dy: (row - (rows - 1) / 2) * spread,
  };
}

// Jail corner: in-jail players sit in the cell (toward the outer corner, behind
// bars); "just visiting" players sit outside it (toward the board interior).
const JAIL_CELL = { dx: 1.9, dy: -1.9 };
const JAIL_VISIT = { dx: -2.7, dy: 2.7 };

export function TokenLayer({ state }: { state: GameState }) {
  const reduce = usePrefersReducedMotion();
  const active = state.players.filter((p) => !p.isBankrupt);

  // Tokens glide straight to their destination tile — the CSS transition on
  // left/top does the travelling, so there is no per-tile hop to animate.
  const glide = reduce
    ? "none"
    : "left 420ms cubic-bezier(0.22,0.61,0.36,1), top 420ms cubic-bezier(0.22,0.61,0.36,1)";

  // Group key: jail splits into caged vs visiting so each group fans on its own.
  const keyOf = (p: Player) => {
    if (p.position === JAIL_INDEX) return p.inJail ? "jail-in" : "jail-out";
    return String(p.position);
  };
  const basePos = (p: Player) => {
    const pos = p.position;
    const c = tileCenterPct(pos);
    if (pos === JAIL_INDEX) {
      const o = p.inJail ? JAIL_CELL : JAIL_VISIT;
      return { x: c.x + o.dx, y: c.y + o.dy };
    }
    return c;
  };

  const groups: Record<string, string[]> = {};
  for (const p of active) (groups[keyOf(p)] ??= []).push(p.id);

  const currentId = state.players[state.currentPlayerIndex]?.id;
  const jailC = tileCenterPct(JAIL_INDEX);
  const cellX = jailC.x + JAIL_CELL.dx;
  const cellY = jailC.y + JAIL_CELL.dy;
  const hasCaged = (groups["jail-in"]?.length ?? 0) > 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Jail cell backdrop (behind the caged tokens) */}
      {hasCaged && (
        <div
          className="absolute rounded-md bg-black/40 ring-1 ring-white/15"
          style={{
            left: `${cellX}%`,
            top: `${cellY}%`,
            width: "8.5%",
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
          aria-hidden
        />
      )}

      {active.map((p) => {
        const { x, y } = basePos(p);
        const group = groups[keyOf(p)] ?? [p.id];
        const idx = group.indexOf(p.id);
        const { dx, dy } = fanOffset(idx, group.length);
        const color = playerColor(p);
        const isCurrent = p.id === currentId;
        return (
          <div
            key={p.id}
            className="absolute grid place-items-center rounded-full font-numeric font-bold"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transition: glide,
              width: "5.4%",
              aspectRatio: "1",
              transform: `translate(-50%, -50%) translate(${dx}%, ${dy}%)`,
              backgroundColor: color,
              color: readableInk(color),
              boxShadow:
                "0 2px 5px rgba(0,0,0,0.55), inset 0 1.5px 1px rgba(255,255,255,0.35), 0 0 0 2px rgba(255,255,255,0.92)",
              zIndex: isCurrent ? 40 : 30 - idx,
              fontSize: "clamp(8px, 1.5vw, 14px)",
              pointerEvents: "auto",
            }}
            title={p.name + (p.inJail ? " (in prison)" : "")}
          >
            {isCurrent && (
              <span
                className="absolute inset-[-4px] rounded-full motion-safe:animate-pulse-ring"
                style={{ boxShadow: "0 0 0 2px rgba(239,182,58,0.9)" }}
                aria-hidden
              />
            )}
            <span className="relative">{p.name[0]?.toUpperCase()}</span>
          </div>
        );
      })}

      {/* Jail bars — drawn in front of the caged tokens */}
      {hasCaged && (
        <div
          className="absolute flex items-stretch justify-between rounded-md px-[3px] py-[2px]"
          style={{
            left: `${cellX}%`,
            top: `${cellY}%`,
            width: "8.5%",
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            zIndex: 45,
          }}
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-[1.5px] rounded-full bg-white/70" />
          ))}
        </div>
      )}
    </div>
  );
}
