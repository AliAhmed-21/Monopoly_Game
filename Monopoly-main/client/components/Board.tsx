"use client";

import { useState } from "react";
import type { GameState } from "@monopoly/shared";
import { boardGridTemplate, gridPos, playerColor } from "@/lib/theme";
import { parseLogLine } from "@/lib/logParse";
import { Tile } from "./Tile";
import { TokenLayer } from "./TokenLayer";
import { TileDetail } from "./TileDetail";

/** Renders the 40-tile ring from map data on the board within a clean raised bezel. */
export function Board({
  state,
  children,
}: {
  state: GameState;
  children?: React.ReactNode;
}) {
  const [detailId, setDetailId] = useState<number | null>(null);

  if (!state.map) return null;

  const detailTile = detailId !== null ? state.map.tiles[detailId] : null;

  return (
    <div className="w-full max-w-[900px]">
      {/* Clean raised bezel */}
      <div className="board-frame rounded-[1.5rem] p-[5px] shadow-stall ring-1 ring-white/10">
        <div className="board-surface relative overflow-hidden rounded-[1.15rem] bg-felt ring-1 ring-black/50">
          <div
            className="grid aspect-square w-full gap-[3px] p-[3px]"
            style={{
              gridTemplateColumns: boardGridTemplate,
              gridTemplateRows: boardGridTemplate,
            }}
          >
            {state.map.tiles.map((tile) => {
              const { row, col } = gridPos(tile.id);
              return (
                <div
                  key={tile.id}
                  className="tile-scale min-h-0 min-w-0"
                  style={{ gridRow: row, gridColumn: col }}
                >
                  <Tile tile={tile} state={state} onSelect={setDetailId} />
                </div>
              );
            })}

            {/* Center — dice / action controls on a quiet inset panel */}
            <div
              style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}
              className="relative flex flex-col items-center justify-center p-1 sm:p-3"
            >
              <div className="relative z-10 flex w-full flex-col items-center justify-center gap-2 sm:gap-3">
                {children}
              </div>
              <CenterLog state={state} />
            </div>
          </div>

          {/* Player tokens ride above the tiles on their own layer */}
          <TokenLayer state={state} />
        </div>
      </div>

      {detailTile && (
        <TileDetail tile={detailTile} state={state} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

/** How many recent moves the centre feed keeps on screen. */
const CENTER_LOG_LINES = 9;

/**
 * A quiet feed of the latest moves in the board's centre — mirrors the reference
 * layout so players can follow the action without leaving the board. The newest
 * line sits at the TOP at full strength and older ones sink and fade beneath it.
 * Hidden on the smallest boards where there's no room for it.
 */
function CenterLog({ state }: { state: GameState }) {
  // `state.log` is oldest-first, so take the tail and flip it newest-first.
  const start = Math.max(0, state.log.length - CENTER_LOG_LINES);
  const lines = state.log.slice(start).reverse();
  if (lines.length === 0) return null;
  return (
    <div
      // Clear of the bottom row's flags, which straddle the board's inner edge.
      className="pointer-events-none absolute inset-x-6 bottom-4 z-0 hidden flex-col items-center justify-end gap-0.5 sm:flex"
      style={{
        maskImage: "linear-gradient(to bottom, #000 30%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent)",
      }}
      aria-hidden
    >
      {lines.map((line, i) => {
        const p = parseLogLine(line, state.players);
        const color = p.player ? playerColor(p.player) : "#8b93a7";
        return (
          <p
            key={`${start + lines.length - 1 - i}`}
            className="max-w-full truncate text-center text-[11px] leading-snug text-slate-400"
            style={{ opacity: 1 - (0.8 * i) / lines.length }}
          >
            {p.player && (
              <span className="font-semibold" style={{ color }}>
                {p.player.name}{" "}
              </span>
            )}
            <span>{p.rest}</span>
          </p>
        );
      })}
    </div>
  );
}
