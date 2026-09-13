"use client";

import { useGame } from "@/app/GameProvider";
import { playerColor, readableInk, tint } from "@/lib/theme";
import { Panel } from "./Panel";
import { Balance } from "./Balance";
import { Crown, LockIcon, TicketIcon, UsersIcon } from "./icons";

export function PlayerPanel() {
  const { state, myId } = useGame();
  if (!state) return null;

  return (
    <Panel title="Players" icon={<UsersIcon />} bodyClass="p-2">
      <ul className="space-y-1.5">
        {state.players.map((p, i) => {
          const isTurn = i === state.currentPlayerIndex && state.status === "in_progress";
          const color = playerColor(p);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ring-1 transition ${
                isTurn ? "ring-brass/50 motion-safe:animate-pulse-ring" : "ring-transparent"
              } ${p.isBankrupt ? "opacity-40 grayscale" : ""}`}
              style={{
                background: isTurn ? tint(color, 0.16) : tint(color, 0.07),
              }}
            >
              {/* Avatar in the player's color */}
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-numeric text-sm font-bold ring-2 ring-white/80"
                style={{ backgroundColor: color, color: readableInk(color) }}
              >
                {p.name[0]?.toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-display text-sm font-semibold text-slate-100">
                    {p.name}
                  </span>
                  {p.id === myId && (
                    <span className="rounded bg-white/10 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                      you
                    </span>
                  )}
                  {p.isHost && <Crown className="h-3.5 w-3.5 text-brass" />}
                  {p.inJail && <LockIcon className="h-3.5 w-3.5 text-crimson" />}
                  {p.pardonCards > 0 && (
                    <span className="flex items-center gap-0.5 text-brass">
                      <TicketIcon className="h-3.5 w-3.5" />
                      <span className="font-numeric text-[10px]">{p.pardonCards}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {p.isBankrupt ? (
                    <span className="font-semibold text-crimson">bankrupt</span>
                  ) : (
                    <Balance state={state} amount={p.money} className="font-semibold text-jade" />
                  )}
                  <span className="text-slate-500">·</span>
                  <span className="font-numeric">{p.properties.length} props</span>
                  {!p.connected && (
                    <span className="rounded bg-white/5 px-1 text-[9px] uppercase text-slate-500">
                      offline
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
