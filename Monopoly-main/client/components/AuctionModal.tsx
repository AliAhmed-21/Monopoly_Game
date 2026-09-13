"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/app/GameProvider";
import { GROUP_COLORS, money, playerColor, readableInk, tileKind, tint } from "@/lib/theme";
import { AUCTION_DURATION_MS } from "@monopoly/shared";
import type { GameState, Tile } from "@monopoly/shared";
import { TileGlyph, HomeIcon } from "./icons";
import { Flag } from "./Flag";
import { Portal } from "./Portal";

const QUICK_BIDS = [2, 10, 100];

export function AuctionModal() {
  const { state } = useGame();
  // Only mount the live view (and its countdown ticker) while an auction runs.
  if (!state || state.turnPhase !== "AUCTION" || !state.activeAuction) return null;
  return <AuctionView />;
}

function AuctionView() {
  const { state, myId, bid } = useGame();

  // Tick a clock so the countdown bar animates.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(id);
  }, []);

  if (!state || state.turnPhase !== "AUCTION" || !state.activeAuction) return null;

  const a = state.activeAuction;
  const tile = state.map!.tiles[a.tileId];
  const highBidder = state.players.find((p) => p.id === a.highestBidderId);
  const me = state.players.find((p) => p.id === myId);
  const canBid = !!me && a.activeBidderIds.includes(me.id) && !me.isBankrupt;

  const remaining = Math.max(0, a.endsAt - now);
  const pct = Math.max(0, Math.min(100, (remaining / AUCTION_DURATION_MS) * 100));
  const secs = Math.ceil(remaining / 1000);

  const bidders = state.players.filter((p) => a.activeBidderIds.includes(p.id));

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-[2px] sm:p-4">
        <div className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-stall shadow-stall">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brass/20 text-brass">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m14 6-8 8M11 3l5 5M8 6l5 5M4 14l5 5M15 12l5 5" /><path d="M14 21h7" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Auction</p>
              <h3 className="truncate font-display text-lg font-black text-slate-100">{tile.name}</h3>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_240px]">
            {/* ── Left: bid + countdown + quick bids ── */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current bid</p>
                <p className="font-numeric text-4xl font-black text-slate-100">
                  {money(state, a.highestBid)}
                </p>
                {highBidder && (
                  <p className="mt-0.5 text-sm text-slate-400">
                    by{" "}
                    <span className="font-display font-bold" style={{ color: playerColor(highBidder) }}>
                      {highBidder.name}
                    </span>
                  </p>
                )}
              </div>

              {/* Countdown bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Ends in {secs}s…</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-jade to-brass transition-[width] duration-100 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Quick bids */}
              {canBid ? (
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_BIDS.map((inc) => {
                    const total = a.highestBid + inc;
                    const afford = (me?.money ?? 0) >= total;
                    return (
                      <button
                        key={inc}
                        onClick={() => bid(total)}
                        disabled={!afford}
                        className="flex flex-col items-center rounded-xl px-2 py-2.5 font-bold text-white transition hover:brightness-110 disabled:opacity-30"
                        style={{ backgroundColor: "#5F4EE0" }}
                      >
                        <span className="font-numeric text-base leading-tight">{money(state, total)}</span>
                        <span className="text-[11px] font-semibold opacity-90">+{money(state, inc)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-stall-2/70 px-3 py-2 text-sm text-slate-400 ring-1 ring-white/5">
                  You&apos;re not part of this auction.
                </p>
              )}

              {/* Balances */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Players</p>
                {bidders.map((p) => {
                  const leading = p.id === a.highestBidderId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                        leading ? "bg-jade/10 ring-1 ring-jade/30" : ""
                      }`}
                    >
                      <span
                        className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ring-1 ring-white/20"
                        style={{ backgroundColor: playerColor(p), color: readableInk(playerColor(p)) }}
                      >
                        {p.name[0]?.toUpperCase()}
                      </span>
                      <span className="truncate text-slate-200">{p.name}</span>
                      {leading && <span className="text-[10px] font-bold text-jade">HIGH BID</span>}
                      <span className="ml-auto font-numeric font-semibold text-slate-100">
                        {money(state, p.money)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right: property card ── */}
            <PropertyCard tile={tile} state={state} />
          </div>
        </div>
      </div>
    </Portal>
  );
}

// A compact read-only property card (rent ladder / price), like TileDetail.
function PropertyCard({ tile, state }: { tile: Tile; state: GameState }) {
  const cur = state.map?.currency ?? "$";
  const isProperty = tile.type === "property";
  const accent = isProperty && tile.group ? GROUP_COLORS[tile.group] : "#7C6BF6";

  return (
    <div
      className="overflow-hidden rounded-2xl ring-1 ring-white/10"
      style={{ background: `linear-gradient(180deg, ${tint(accent, 0.32)}, #17161F 62%)` }}
    >
      <div className="flex flex-col items-center gap-1.5 px-4 pt-4 pb-1 text-center">
        {isProperty ? (
          <Flag name={tile.name} className="h-7 w-7" />
        ) : (
          <span style={{ color: accent }}>
            <TileGlyph kind={tileKind(tile)} className="h-8 w-8" />
          </span>
        )}
        <h4 className="font-display text-lg font-bold text-white">{tile.name}</h4>
      </div>

      <div className="px-4 pb-2 pt-1">
        {isProperty && tile.rent && (
          <>
            <div className="mb-1 flex items-center justify-between border-b border-white/15 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>when</span>
              <span>get</span>
            </div>
            {[
              ["with rent", tile.rent[0]],
              ["1 house", tile.rent[1]],
              ["2 houses", tile.rent[2]],
              ["3 houses", tile.rent[3]],
              ["4 houses", tile.rent[4]],
              ["a hotel", tile.rent[5]],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-baseline justify-between gap-4 py-[2px] text-[13px]">
                <span className="text-slate-200">{label}</span>
                <span className="font-numeric font-semibold text-slate-100">{cur}{value}</span>
              </div>
            ))}
          </>
        )}

        {tile.type === "railroad" && (
          <>
            <div className="mb-1 flex items-center justify-between border-b border-white/15 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>when</span>
              <span>get</span>
            </div>
            {(tile.rent ?? [25, 50, 100, 200]).map((v, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 py-[2px] text-[13px]">
                <span className="text-slate-200">{i === 0 ? "1 airport" : `${i + 1} airports`}</span>
                <span className="font-numeric font-semibold text-slate-100">{cur}{v}</span>
              </div>
            ))}
          </>
        )}

        {tile.type === "utility" && (
          <p className="py-2 text-center text-[13px] text-slate-200">
            Rent is a multiple of your dice roll (×4 with one company, ×10 with both).
          </p>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-2.5">
        <div className="grid grid-cols-2 items-end text-center">
          <div>
            <div className="text-[10px] text-slate-400">Price</div>
            <div className="font-numeric text-sm font-bold text-slate-100">{money(state, tile.price ?? 0)}</div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <HomeIcon className="h-4 w-4 text-slate-300" />
            <div className="font-numeric text-sm font-bold text-slate-100">{money(state, tile.houseCost ?? 0)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
