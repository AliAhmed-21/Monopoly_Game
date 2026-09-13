"use client";

import { useEffect } from "react";
import type { GameState, Tile } from "@monopoly/shared";
import { useGame } from "@/app/GameProvider";
import { GROUP_COLORS, money, playerColor, readableInk, tileKind, tint } from "@/lib/theme";
import { HomeIcon, TileGlyph } from "./icons";
import { Flag } from "./Flag";

function ArrowUp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}
function ArrowDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

/** A tiny die glyph for utility rent formulas ("$4 × 🎲"). */
function DieMini({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline align-[-2px] ${className}`} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
      <circle cx="8.5" cy="8.5" r="1.7" fill="#17161F" />
      <circle cx="12" cy="12" r="1.7" fill="#17161F" />
      <circle cx="15.5" cy="15.5" r="1.7" fill="#17161F" />
    </svg>
  );
}

function HotelIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 21V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3h1a2 2 0 0 1 2 2v10h-6v-4h-5v4H4Zm3-11h2V8H7v2Zm5 0h2V8h-2v2Zm-5 4h2v-2H7v2Zm5 0h2v-2h-2v2Z" />
    </svg>
  );
}

/** Row in a "when / get" rent table. */
function Row({ label, value, cur }: { label: string; value: number; cur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px] text-sm">
      <span className="text-slate-200">{label}</span>
      <span className="font-numeric font-semibold text-slate-100">
        {cur}
        {value}
      </span>
    </div>
  );
}

/**
 * Rent/price detail card shown when a tile is clicked. Values come straight from
 * the live tile data (rent ladder, price, build cost) — display only.
 */
export function TileDetail({
  tile,
  state,
  onClose,
}: {
  tile: Tile;
  state: GameState;
  onClose: () => void;
}) {
  const g = useGame();
  const { me, isMyTurn } = g;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cur = state.map?.currency ?? "$";
  const isProperty = tile.type === "property";
  const accent = isProperty && tile.group ? GROUP_COLORS[tile.group] : "#7C6BF6";

  const bt = state.board[tile.id];
  const owner = bt?.owner ? state.players.find((p) => p.id === bt.owner) : null;
  const ownedByMe = !!me && bt?.owner === me.id;
  const hasBuildings = (bt?.houses ?? 0) > 0 || !!bt?.hotel;
  const canManage = isMyTurn && state.turnPhase !== "AUCTION";
  const canMortgage = state.status === "in_progress" && state.turnPhase !== "AUCTION";
  const canBuild = canManage && !bt?.mortgaged && !bt?.hotel && (me?.money ?? 0) >= (tile.houseCost ?? 0);
  const unmortgageCost = Math.ceil((tile.price ?? 0) * 0.55);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[280px] overflow-hidden rounded-2xl shadow-stall ring-1 ring-white/10"
        style={{ background: `linear-gradient(180deg, ${tint(accent, 0.32)}, #17161F 62%)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1.5 px-5 pt-5 pb-1 text-center">
          {!isProperty && (
            <span style={{ color: accent }}>
              <TileGlyph kind={tileKind(tile)} className="h-8 w-8" />
            </span>
          )}
          {isProperty && <Flag name={tile.name} className="h-7 w-7" />}
          <h3 className="font-display text-xl font-bold text-white">{tile.name}</h3>
        </div>

        {/* Body */}
        <div className="px-5 pb-3 pt-1">
          {isProperty && tile.rent && (
            <>
              <div className="mb-1 flex items-center justify-between border-b border-white/15 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>when</span>
                <span>get</span>
              </div>
              <Row label="with rent" value={tile.rent[0]} cur={cur} />
              <Row label="with one house" value={tile.rent[1]} cur={cur} />
              <Row label="with two houses" value={tile.rent[2]} cur={cur} />
              <Row label="with three houses" value={tile.rent[3]} cur={cur} />
              <Row label="with four houses" value={tile.rent[4]} cur={cur} />
              <Row label="with a hotel" value={tile.rent[5]} cur={cur} />
            </>
          )}

          {tile.type === "railroad" && (
            <>
              <div className="mb-1 flex items-center justify-between border-b border-white/15 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>when</span>
                <span>get</span>
              </div>
              {(tile.rent ?? [25, 50, 100, 200]).map((v, i) => (
                <Row
                  key={i}
                  label={i === 0 ? "one airport is owned" : `${i + 1} airports are owned`}
                  value={v}
                  cur={cur}
                />
              ))}
            </>
          )}

          {tile.type === "utility" && (
            <div className="space-y-2 py-1 text-center text-sm text-slate-200">
              <p>
                If one company is owned, get{" "}
                <span className="font-numeric font-semibold text-white">{cur}4</span> ×{" "}
                <DieMini className="h-4 w-4 text-jade" />
              </p>
              <p>
                If two companies are owned, get{" "}
                <span className="font-numeric font-semibold text-white">{cur}10</span> ×{" "}
                <DieMini className="h-4 w-4 text-jade" />
              </p>
            </div>
          )}
        </div>

        {/* Manage — only the owner sees these (build ↑ / sell ↓ / mortgage) */}
        {ownedByMe && (
          <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
            {isProperty && (
              <>
                <button
                  onClick={() => g.build(tile.id)}
                  disabled={!canBuild}
                  title={`Build a house (${money(state, tile.houseCost ?? 0)})`}
                  className="grid h-10 w-11 place-items-center rounded-xl bg-jade text-white transition hover:bg-jade-deep disabled:opacity-30"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <button
                  onClick={() => g.sell(tile.id)}
                  disabled={!canManage || !hasBuildings}
                  title="Sell a building"
                  className="grid h-10 w-11 place-items-center rounded-xl bg-white/10 text-slate-100 transition hover:bg-white/20 disabled:opacity-30"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="flex-1" />
            {bt?.mortgaged ? (
              <button
                onClick={() => g.unmortgage(tile.id)}
                disabled={!canMortgage || (me?.money ?? 0) < unmortgageCost}
                title={`Lift mortgage (${money(state, unmortgageCost)})`}
                className="rounded-xl bg-brass px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-brass-deep disabled:opacity-30"
              >
                Unmortgage
              </button>
            ) : (
              <button
                onClick={() => g.mortgage(tile.id)}
                disabled={!canMortgage || hasBuildings}
                title={`Mortgage for ${money(state, Math.floor((tile.price ?? 0) / 2))}`}
                className="grid h-10 w-11 place-items-center rounded-xl bg-white/10 text-crimson transition hover:bg-crimson/20 disabled:opacity-30"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Owner */}
        {owner && (
          <div className="flex items-center justify-center gap-2 px-5 pt-2 text-sm">
            <span className="text-slate-400">Owner</span>
            <span
              className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ring-1 ring-white/25"
              style={{ backgroundColor: playerColor(owner), color: readableInk(playerColor(owner)) }}
            >
              {owner.name[0]?.toUpperCase()}
            </span>
            <span className="font-display font-bold" style={{ color: playerColor(owner) }}>
              {owner.name}
            </span>
          </div>
        )}

        {/* Footer: price + build costs */}
        <div className="border-t border-white/10 px-5 py-3">
          {isProperty ? (
            <div className="grid grid-cols-3 items-end text-center">
              <div>
                <div className="text-[11px] text-slate-400">Price</div>
                <div className="font-numeric text-sm font-bold text-slate-100">
                  {money(state, tile.price ?? 0)}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <HomeIcon className="h-4 w-4 text-slate-300" />
                <div className="font-numeric text-sm font-bold text-slate-100">
                  {money(state, tile.houseCost ?? 0)}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <HotelIcon className="h-4 w-4 text-crimson" />
                <div className="font-numeric text-sm font-bold text-slate-100">
                  {money(state, tile.houseCost ?? 0)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[11px] text-slate-400">Price</div>
              <div className="font-numeric text-base font-bold text-slate-100">
                {money(state, tile.price ?? 0)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
