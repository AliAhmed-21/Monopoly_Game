"use client";

import { useState } from "react";
import { useGame } from "@/app/GameProvider";
import { Board } from "./Board";
import { Dice } from "./Dice";
import { ActionBar } from "./ActionBar";
import { PlayerPanel } from "./PlayerPanel";
import { PropertyManager } from "./PropertyManager";
import { TradePanel } from "./TradePanel";
import { Chat } from "./Chat";
import { Log } from "./Log";
import { CardModal } from "./CardModal";
import { AuctionModal } from "./AuctionModal";
import { money } from "@/lib/theme";
import { ActionIcon, ChatIcon } from "./icons";

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function GameRoom() {
  const { state, leaveRoom } = useGame();
  const [copied, setCopied] = useState(false);

  if (!state) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.roomCode.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const shareCard = (
    <section className="stall-card p-3.5">
      <div className="flex items-center gap-2">
        <ActionIcon kind="roll" className="h-6 w-6 text-brass" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-black leading-tight text-slate-100">
            {state.map?.name}
          </h1>
          <p className="text-[11px] text-slate-400">Room code</p>
        </div>
      </div>
      <button
        onClick={copyCode}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-stall-2/80 px-3 py-2 ring-1 ring-white/10 transition hover:ring-brass/40"
      >
        <span className="font-numeric text-lg font-bold tracking-[0.3em] text-brass">
          {state.roomCode.toUpperCase()}
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {copied ? "copied!" : "copy"}
        </span>
      </button>
      {state.settings.vacationCash && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-stall-2/60 px-3 py-1.5 text-xs">
          <span className="text-slate-400">Vacation pot</span>
          <span className="font-numeric font-bold text-jade">
            {money(state, state.vacationPot)}
          </span>
        </div>
      )}
      <button
        onClick={leaveRoom}
        className="mt-2 w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
      >
        Leave game
      </button>
    </section>
  );

  return (
    <div className="mx-auto max-w-[1680px] px-3 py-4 pb-28 lg:pb-6">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,300px)_minmax(0,1fr)_minmax(300px,340px)]">
        {/* Left utility rail (desktop) */}
        <aside className="hidden space-y-4 lg:block">
          {shareCard}
          <Log />
          <Chat compact />
        </aside>

        {/* Board */}
        <main className="flex justify-center lg:col-start-2">
          <div className="relative w-full max-w-[900px]">
            <Board state={state}>
              <Dice dice={state.dice} />
              <ActionBar />
            </Board>
          </div>
        </main>

        {/* Right players rail (desktop) */}
        <aside className="hidden space-y-4 lg:block">
          <PlayerPanel />
          <TradePanel />
          <PropertyManager />
        </aside>
      </div>

      {/* ── Mobile / tablet: one continuous scroll of panels under the board.
          No bottom tab bar — everything is visible by scrolling, chat lives in
          a floating button. ── */}
      <div className="mt-4 space-y-4 lg:hidden">
        <PlayerPanel />
        <TradePanel />
        <PropertyManager />
        <Log />
        {shareCard}
      </div>

      {/* Floating chat button + sheet (mobile / tablet only) */}
      <ChatFab />

      <CardModal />
      <AuctionModal />
    </div>
  );
}

/** A bottom-right floating button that opens the chat in a slide-up sheet. */
function ChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-night/95 p-3 pb-24 shadow-stall motion-safe:animate-sheet-in">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
            <Chat />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-xl transition active:scale-95"
        style={{
          background: "linear-gradient(135deg,#7C6BF6,#5F4EE0)",
          boxShadow: "0 12px 26px -8px rgba(124,107,246,.65)",
        }}
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}
