"use client";

import { useMemo, useState } from "react";
import { useGame } from "@/app/GameProvider";
import { money, playerColor, readableInk } from "@/lib/theme";
import type { GameState, Player, Trade, TradeOffer } from "@monopoly/shared";
import { Panel } from "./Panel";
import { Portal } from "./Portal";
import { ActionIcon } from "./icons";

// ─────────────────────────────────────────────────────────────────────────────
// Trades panel — lists every pending trade as a clickable row (RichUp-style).
// Trades no longer blast a blocking modal at everyone: each player opens a trade
// locally to inspect it, and only the recipient sees accept/decline/negotiate.
// ─────────────────────────────────────────────────────────────────────────────

/** What to seed the composer with (used by "Create" and "Negotiate"). */
interface Prefill {
  toId?: string;
  offerProps?: number[];
  offerCash?: number;
  requestProps?: number[];
  requestCash?: number;
}

export function TradePanel() {
  const g = useGame();
  const { state, me } = g;
  const [composer, setComposer] = useState<{ open: boolean; prefill?: Prefill }>({ open: false });
  const [viewId, setViewId] = useState<string | null>(null);

  if (!state || !me || state.status !== "in_progress") return null;
  const trades = state.trades;

  const createBtn = (
    <button
      onClick={() => setComposer({ open: true })}
      disabled={me.isBankrupt}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
      style={{ backgroundColor: "#5F4EE0" }}
    >
      <span className="text-sm leading-none">＋</span> Create
    </button>
  );

  return (
    <Panel title="Trades" icon={<ActionIcon kind="trade" />} action={createBtn}>
      {trades.length === 0 ? (
        <p className="rounded-xl bg-stall-2/60 px-3 py-2 text-xs leading-relaxed text-slate-400 ring-1 ring-white/5">
          Make trades with other players to exchange properties &amp; cash. Use the
          <span className="font-semibold text-slate-200"> Create</span> button to start one.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {trades.map((t) => (
            <TradeRow key={t.id} trade={t} state={state} onView={() => setViewId(t.id)} />
          ))}
        </ul>
      )}

      {viewId && (
        <TradeViewModal
          tradeId={viewId}
          onClose={() => setViewId(null)}
          onNegotiate={(prefill) => {
            setViewId(null);
            setComposer({ open: true, prefill });
          }}
        />
      )}

      {composer.open && (
        <TradeComposer prefill={composer.prefill} onClose={() => setComposer({ open: false })} />
      )}
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row: "From ↔ To" with a view (eye) button. Highlights trades I'm part of.
// ─────────────────────────────────────────────────────────────────────────────
function TradeRow({
  trade,
  state,
  onView,
}: {
  trade: Trade;
  state: GameState;
  onView: () => void;
}) {
  const { myId } = useGame();
  const from = state.players.find((p) => p.id === trade.fromId);
  const to = state.players.find((p) => p.id === trade.toId);
  const mine = myId === trade.fromId || myId === trade.toId;
  const awaitingMe = myId === trade.toId;

  return (
    <li>
      <button
        onClick={onView}
        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left ring-1 transition hover:bg-white/5 ${
          awaitingMe ? "bg-jade/10 ring-jade/40" : mine ? "bg-white/5 ring-white/10" : "bg-stall-2/50 ring-white/5"
        }`}
      >
        <PlayerTag player={from} />
        <span className="shrink-0 text-slate-500">↔</span>
        <PlayerTag player={to} />
        <span className="ml-auto shrink-0 text-slate-400">
          {awaitingMe ? (
            <span className="rounded-full bg-jade px-2 py-0.5 text-[10px] font-bold text-slate-950">
              Respond
            </span>
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </span>
      </button>
    </li>
  );
}

function PlayerTag({ player }: { player?: Player }) {
  const color = player ? playerColor(player) : "#8b93a7";
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {player && <Avatar player={player} size={20} />}
      <span className="truncate text-xs font-semibold" style={{ color }}>
        {player?.name ?? "—"}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar chip
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ player, size = 26 }: { player: Player; size?: number }) {
  const color = playerColor(player);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display text-xs font-bold ring-2 ring-white/20"
      style={{ width: size, height: size, backgroundColor: color, color: readableInk(color) }}
    >
      {player.name[0]?.toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// One side of a trade (read view).
// ─────────────────────────────────────────────────────────────────────────────
function TradeSide({
  player,
  cash,
  propIds,
  state,
  side,
}: {
  player: Player | undefined;
  cash: number;
  propIds: number[];
  state: GameState;
  side: "give" | "get";
}) {
  const color = player ? playerColor(player) : "#8b93a7";
  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        {player && <Avatar player={player} />}
        <span className="truncate font-display font-bold" style={{ color }}>
          {player?.name}
        </span>
      </div>
      {cash > 0 && (
        <div
          className="inline-block rounded-full px-3 py-1 font-numeric text-sm font-bold"
          style={{ backgroundColor: "#5F4EE0", color: "#fff" }}
        >
          {money(state, cash)}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {propIds.map((id) => (
          <span
            key={id}
            className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-100 ring-1 ring-white/10"
          >
            {state.map!.tiles[id].name}
          </span>
        ))}
        {cash <= 0 && propIds.length === 0 && (
          <span className="text-[11px] text-slate-500">nothing</span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {side === "give" ? "offers" : "gives"}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View modal — opened locally by whoever clicks a trade row. Only the recipient
// gets Confirm / Decline / Negotiate; the proposer can Cancel; others just look.
// Reads the trade from live state so it self-closes if the trade goes away.
// ─────────────────────────────────────────────────────────────────────────────
function TradeViewModal({
  tradeId,
  onClose,
  onNegotiate,
}: {
  tradeId: string;
  onClose: () => void;
  onNegotiate: (prefill: Prefill) => void;
}) {
  const g = useGame();
  const { state, myId } = g;
  const t = state?.trades.find((x) => x.id === tradeId);

  // Trade resolved/removed while open — close.
  if (!state || !t) {
    if (state) onClose();
    return null;
  }

  const from = state.players.find((p) => p.id === t.fromId);
  const to = state.players.find((p) => p.id === t.toId);
  const isRecipient = myId === t.toId;
  const isProposer = myId === t.fromId;

  const negotiate = () => {
    // Counter-offer: I (recipient) now give what they asked, get what they offered.
    onNegotiate({
      toId: t.fromId,
      offerProps: t.requestProperties,
      offerCash: t.requestCash,
      requestProps: t.offerProperties,
      requestCash: t.offerCash,
    });
    g.rejectTrade(t.id); // withdraw the original as we counter
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
        <div className="my-auto max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-stall p-5 shadow-stall">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-black text-slate-100">Trade offer</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="flex items-stretch gap-3">
            <TradeSide player={from} cash={t.offerCash} propIds={t.offerProperties} state={state} side="give" />
            <div className="flex items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-300 ring-1 ring-white/10">
                ⇄
              </span>
            </div>
            <TradeSide player={to} cash={t.requestCash} propIds={t.requestProperties} state={state} side="get" />
          </div>

          {isRecipient ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  g.acceptTrade(t.id);
                  onClose();
                }}
                className="rounded-xl bg-jade px-3 py-2.5 font-display font-bold text-slate-950 transition hover:bg-jade-deep hover:text-white"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  g.rejectTrade(t.id);
                  onClose();
                }}
                className="rounded-xl bg-crimson/90 px-3 py-2.5 font-display font-bold text-white transition hover:bg-crimson"
              >
                Decline
              </button>
              <button
                onClick={negotiate}
                className="rounded-xl px-3 py-2.5 font-display font-bold text-white transition hover:brightness-110"
                style={{ backgroundColor: "#5F4EE0" }}
              >
                Negotiate
              </button>
            </div>
          ) : isProposer ? (
            <button
              onClick={() => {
                g.rejectTrade(t.id);
                onClose();
              }}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-display font-bold text-slate-100 transition hover:bg-white/20"
            >
              Cancel offer
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-display font-bold text-slate-100 transition hover:bg-white/20"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cash control — slider + exact number box, capped at the player's money.
// ─────────────────────────────────────────────────────────────────────────────
function CashControl({
  max,
  value,
  onChange,
  currency,
}: {
  max: number;
  value: number;
  onChange: (v: number) => void;
  currency: string;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.round(v || 0)));
  return (
    <div className="mt-2">
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full accent-jade"
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>0</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-jade-deep/90 px-2 py-0.5 font-numeric text-xs font-bold text-white">
          <input
            type="number"
            min={0}
            max={max}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="w-14 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span>{currency}</span>
        </span>
        <span className="font-numeric">{max}</span>
      </div>
    </div>
  );
}

function PropertyChips({
  ids,
  selected,
  onToggle,
  state,
  color,
  empty,
}: {
  ids: number[];
  selected: number[];
  onToggle: (id: number) => void;
  state: GameState;
  color: string;
  empty: string;
}) {
  if (ids.length === 0) return <p className="text-xs text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const on = selected.includes(id);
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 transition"
            style={
              on
                ? { backgroundColor: color, color: readableInk(color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)" }
                : { background: "rgba(255,255,255,.06)", color: "#cbd0dc" }
            }
          >
            {state.map!.tiles[id].name}
          </button>
        );
      })}
    </div>
  );
}

function TradeComposer({ prefill, onClose }: { prefill?: Prefill; onClose: () => void }) {
  const g = useGame();
  const { state, me } = g;
  const others = state!.players.filter((p) => p.id !== me!.id && !p.isBankrupt);
  const [toId, setToId] = useState(prefill?.toId ?? others[0]?.id ?? "");
  const [offerProps, setOfferProps] = useState<number[]>(prefill?.offerProps ?? []);
  const [requestProps, setRequestProps] = useState<number[]>(prefill?.requestProps ?? []);
  const [offerCash, setOfferCash] = useState(prefill?.offerCash ?? 0);
  const [requestCash, setRequestCash] = useState(prefill?.requestCash ?? 0);

  const partner = state!.players.find((p) => p.id === toId);
  const cur = state!.map?.currency ?? "$";
  const myColor = playerColor(me!);
  const theirColor = partner ? playerColor(partner) : "#3B6FE0";

  const tradeable = (p?: Player) =>
    (p?.properties ?? []).filter((id) => !state!.board[id].houses && !state!.board[id].hotel);
  const myTradeables = useMemo(() => tradeable(me!), [me, state]);
  const theirTradeables = useMemo(() => tradeable(partner), [partner, state]);

  const toggle = (arr: number[], set: (v: number[]) => void, id: number) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const nothing =
    offerProps.length === 0 && requestProps.length === 0 && offerCash === 0 && requestCash === 0;

  const submit = () => {
    if (!toId || nothing) return;
    const offer: TradeOffer = {
      fromId: me!.id,
      toId,
      offerProperties: offerProps,
      offerCash: Math.max(0, offerCash),
      offerPardons: 0,
      requestProperties: requestProps,
      requestCash: Math.max(0, requestCash),
      requestPardons: 0,
    };
    g.proposeTrade(offer);
    onClose();
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-stall p-5 shadow-stall">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-black text-slate-100">Propose a Trade</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-slate-400">Trade with</span>
          <select
            value={toId}
            onChange={(e) => {
              setToId(e.target.value);
              setRequestProps([]);
              setRequestCash(0);
            }}
            className="mt-1 w-full rounded-xl border border-white/10 bg-stall-2 px-3 py-2 text-slate-100"
          >
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money(state, p.money)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* You give */}
          <div className="space-y-2 rounded-xl bg-stall-2/50 p-3 ring-1 ring-white/5">
            <div className="flex items-center gap-2">
              <Avatar player={me!} size={22} />
              <p className="font-display text-xs font-bold" style={{ color: myColor }}>
                You give
              </p>
            </div>
            <PropertyChips
              ids={myTradeables}
              selected={offerProps}
              onToggle={(id) => toggle(offerProps, setOfferProps, id)}
              state={state!}
              color={myColor}
              empty="No tradeable properties."
            />
            <CashControl max={me!.money} value={offerCash} onChange={setOfferCash} currency={cur} />
          </div>

          {/* You get */}
          <div className="space-y-2 rounded-xl bg-stall-2/50 p-3 ring-1 ring-white/5">
            <div className="flex items-center gap-2">
              {partner && <Avatar player={partner} size={22} />}
              <p className="font-display text-xs font-bold" style={{ color: theirColor }}>
                You get
              </p>
            </div>
            <PropertyChips
              ids={theirTradeables}
              selected={requestProps}
              onToggle={(id) => toggle(requestProps, setRequestProps, id)}
              state={state!}
              color={theirColor}
              empty="Nothing tradeable."
            />
            <CashControl
              max={partner?.money ?? 0}
              value={requestCash}
              onChange={setRequestCash}
              currency={cur}
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!toId || nothing}
          className="w-full rounded-xl bg-jade px-4 py-2.5 font-display font-bold text-slate-950 transition hover:bg-jade-deep hover:text-white disabled:opacity-40"
        >
          Send offer
        </button>
      </div>
    </div>
    </Portal>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
