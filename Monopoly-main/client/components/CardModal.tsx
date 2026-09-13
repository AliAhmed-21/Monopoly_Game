"use client";

import { useGame } from "@/app/GameProvider";
import { readableInk } from "@/lib/theme";
import { Chest, Question } from "./icons";

function Glyph({ surprise }: { surprise: boolean }) {
  return surprise ? (
    <Question className="h-12 w-12" />
  ) : (
    <Chest className="h-12 w-12" />
  );
}

export function CardModal() {
  const { state, isMyTurn, acknowledgeCard } = useGame();
  if (!state?.pendingCard) return null;
  // Spectators see the banner instead; only the active player acknowledges.
  if (!isMyTurn) return null;

  const { deck, card } = state.pendingCard;
  const isSurprise = deck === "surprise";
  const accent = isSurprise ? "#F2B93C" : "#7C6BF6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-stall text-center shadow-stall"
        style={{ boxShadow: `0 24px 60px -20px ${accent}` }}
      >
        <div
          className="flex flex-col items-center gap-1 px-6 py-5"
          style={{ background: `linear-gradient(160deg, ${accent}33, transparent)` }}
        >
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl ring-2 ring-white/70"
            style={{ backgroundColor: accent, color: readableInk(accent) }}
          >
            <Glyph surprise={isSurprise} />
          </span>
          <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wide" style={{ color: accent }}>
            {isSurprise ? "Surprise" : "Treasure"}
          </h3>
        </div>
        <div className="px-6 pb-6">
          <p className="text-base font-medium text-slate-100">{card.text}</p>
          <button
            onClick={acknowledgeCard}
            className="mt-5 w-full rounded-xl bg-jade px-6 py-2.5 font-display font-bold text-slate-950 transition hover:bg-jade-deep hover:text-white"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
