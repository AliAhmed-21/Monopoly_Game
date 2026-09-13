"use client";

import { useGame } from "@/app/GameProvider";
import { GROUP_COLORS, tileKind } from "@/lib/theme";
import { Panel } from "./Panel";
import { HomeIcon, TileGlyph } from "./icons";
import { Flag } from "./Flag";

/**
 * A read-only list of what you own. Building / selling / mortgaging happens by
 * clicking the tile on the board (see <TileDetail/>), not here.
 */
export function PropertyManager() {
  const g = useGame();
  const { state, me } = g;
  if (!state || !me) return null;

  const props = me.properties
    .map((id) => ({ tile: state.map!.tiles[id], bt: state.board[id] }))
    .sort((a, b) => a.tile.id - b.tile.id);

  return (
    <Panel
      title="My Properties"
      icon={<HomeIcon />}
      action={<span className="font-numeric text-xs text-slate-400">{props.length}</span>}
    >
      {props.length === 0 ? (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-500">
          You don&apos;t own anything yet — land on a city and buy it.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {props.map(({ tile, bt }) => {
            const color = tile.group ? GROUP_COLORS[tile.group] : "#3E9AA8";
            return (
              <li key={tile.id} className="flex items-center gap-2.5 py-2">
                {tile.type === "property" ? (
                  <Flag name={tile.name} className="h-5 w-5" />
                ) : (
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center"
                    style={{ color }}
                  >
                    <TileGlyph kind={tileKind(tile)} className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-display text-sm text-slate-100">
                  {tile.name}
                </span>
                {(bt.hotel || bt.houses > 0 || bt.mortgaged) && (
                  <span className="shrink-0 font-numeric text-[10px] text-slate-400">
                    {bt.hotel ? "hotel" : bt.houses > 0 ? `${bt.houses}h` : ""}
                    {bt.mortgaged && <span className="text-crimson"> mtg</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {props.length > 0 && (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Tap a tile to build, sell or mortgage.
        </p>
      )}

      <button
        className="mt-3 w-full rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs font-bold text-crimson transition hover:bg-crimson/20 disabled:opacity-40"
        onClick={() => {
          if (confirm("Declare bankruptcy and leave the game?")) g.bankrupt();
        }}
        disabled={state.status !== "in_progress" || me.isBankrupt}
      >
        Declare Bankruptcy
      </button>
    </Panel>
  );
}
