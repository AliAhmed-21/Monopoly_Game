"use client";

import { useGame } from "@/app/GameProvider";
import { JAIL_FINE } from "@monopoly/shared";
import { GROUP_COLORS, money, playerColor } from "@/lib/theme";
import { Flag } from "./Flag";

const btn =
  "rounded-xl px-3 py-2 font-display text-sm font-bold transition-transform duration-150 active:scale-95 disabled:opacity-40 disabled:active:scale-100 sm:px-4 sm:py-2.5";
const primary = `${btn} bg-jade text-slate-950 shadow-lg shadow-jade/30 hover:bg-jade-deep hover:text-white`;
const gold = `${btn} bg-brass text-slate-950 shadow-lg shadow-brass/30 hover:bg-brass-deep`;
const ghost = `${btn} bg-white/10 text-slate-100 hover:bg-white/20`;

export function ActionBar() {
  const g = useGame();
  const { state, isMyTurn, me } = g;
  if (!state) return null;

  const current = state.players[state.currentPlayerIndex];
  const phase = state.turnPhase;

  if (state.status === "finished") {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className="rounded-2xl bg-night/70 px-5 py-3 text-center ring-1 ring-brass/40">
        <div className="font-display text-2xl font-black text-brass">
          {winner ? `${winner.name} wins!` : "Game over"}
        </div>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <p className="rounded-2xl bg-night/70 px-4 py-2 text-center text-sm text-slate-300 ring-1 ring-white/10">
        Waiting for{" "}
        <span className="font-display font-bold" style={{ color: current ? playerColor(current) : undefined }}>
          {current?.name}
        </span>
        …
      </p>
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className="flex w-full max-w-[15rem] flex-col items-center gap-2 rounded-2xl bg-night/70 px-2.5 py-2.5 ring-1 ring-white/10 sm:max-w-none sm:px-4 sm:py-3">
      {children}
    </div>
  );

  // ── It's my turn ──
  if (me && me.inJail && phase === "WAITING_FOR_ROLL") {
    return shell(
      <>
        <span className="text-center text-sm font-semibold text-crimson">
          In prison — attempt {me.jailTurns + 1}/3
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          <button className={ghost} onClick={g.jailRoll}>
            Roll for doubles
          </button>
          <button className={primary} onClick={g.jailPay} disabled={(me.money ?? 0) < JAIL_FINE}>
            Pay {money(state, JAIL_FINE)}
          </button>
          {me.pardonCards > 0 && (
            <button className={gold} onClick={g.jailCard}>
              Use Pardon
            </button>
          )}
        </div>
      </>
    );
  }

  if (phase === "WAITING_FOR_ROLL") {
    return shell(
      <button className={`${primary} px-6 py-3 text-base`} onClick={g.roll}>
        Roll dice
      </button>
    );
  }

  if (phase === "AWAITING_BUY") {
    const tile = state.map!.tiles[current.position];
    const groupColor = tile.group ? GROUP_COLORS[tile.group] : "#3E9AA8";
    const affordable = (me?.money ?? 0) >= (tile.price ?? 0);
    return shell(
      <>
        <div className="w-full max-w-[13rem] overflow-hidden rounded-2xl bg-stall shadow-lg ring-1 ring-white/10 sm:w-52">
          <div className="h-2.5 w-full" style={{ backgroundColor: groupColor }} />
          <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-3">
            <Flag name={tile.name} className="h-9 w-9 sm:h-10 sm:w-10" />
            <div className="text-center font-display text-sm font-bold leading-tight text-slate-100">
              {tile.name}
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 font-numeric text-base font-bold text-brass ring-1 ring-white/10">
              {money(state, tile.price ?? 0)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button className={primary} onClick={g.buy} disabled={!affordable}>
            Buy
          </button>
          <button className={ghost} onClick={g.declineBuy}>
            {state.settings.auctions ? "Auction it" : "Skip"}
          </button>
        </div>
        {!affordable && (
          <span className="text-[11px] font-semibold text-crimson">Not enough cash</span>
        )}
      </>
    );
  }

  if (phase === "AWAITING_END_TURN") {
    const doublesAgain =
      state.dice[0] === state.dice[1] &&
      state.doublesCount > 0 &&
      state.doublesCount < 3 &&
      !me?.inJail;
    // With doubles the same click both ends the leg and throws the dice again
    // (the server rolls straight away — see Game.endTurn).
    return shell(
      <button className={doublesAgain ? primary : gold} onClick={g.endTurn}>
        {doublesAgain ? "Roll again (doubles!)" : "End turn"}
      </button>
    );
  }

  return null;
}
