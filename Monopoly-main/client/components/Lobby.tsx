"use client";

import { useState } from "react";
import { useGame } from "@/app/GameProvider";
import { playerColor, readableInk } from "@/lib/theme";
import { LobbySettings } from "./LobbySettings";
import { Chat } from "./Chat";
import { ActionIcon, Crown, UsersIcon } from "./icons";

export function Lobby() {
  const { state, isHost, startGame, leaveRoom, myId } = useGame();
  const [copied, setCopied] = useState(false);
  if (!state) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?room=${state.roomCode}`
      : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code is visible anyway */
    }
  };

  const canStart = isHost && state.players.length >= 2;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ActionIcon kind="roll" className="h-8 w-8 text-brass" />
          <div>
            <h1 className="font-display text-2xl font-black text-slate-100">Game Lobby</h1>
            <p className="text-sm text-slate-400">Waiting for players to join…</p>
          </div>
        </div>
        <button
          onClick={leaveRoom}
          className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Leave
        </button>
      </div>

      <div className="stall-card mb-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-slate-400">Room code</span>
        <span className="rounded-xl bg-stall-2/80 px-3 py-1 font-numeric text-2xl font-bold tracking-[0.3em] text-brass ring-1 ring-white/10">
          {state.roomCode.toUpperCase()}
        </span>
        <button
          onClick={copy}
          className="rounded-xl bg-jade px-3.5 py-2 text-sm font-bold text-slate-950 transition hover:bg-jade-deep hover:text-white"
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Players */}
        <div className="stall-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-200">
            <UsersIcon className="h-4 w-4 text-slate-400" />
            Players ({state.players.length}/{state.settings.maxPlayers})
          </h3>
          <ul className="space-y-2">
            {state.players.map((p) => {
              const color = playerColor(p);
              return (
                <li key={p.id} className="flex items-center gap-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-numeric text-xs font-bold ring-2 ring-white/80"
                    style={{ backgroundColor: color, color: readableInk(color) }}
                  >
                    {p.name[0]?.toUpperCase()}
                  </span>
                  <span className="truncate font-display text-sm font-medium text-slate-100">
                    {p.name}
                    {p.id === myId && <span className="text-slate-500"> (you)</span>}
                  </span>
                  {p.isHost && <Crown className="h-3.5 w-3.5 text-brass" />}
                  {!p.connected && (
                    <span className="text-xs text-slate-500">offline</span>
                  )}
                </li>
              );
            })}
          </ul>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className="mt-4 w-full rounded-xl bg-jade px-4 py-2.5 font-display font-bold text-slate-950 shadow-lg shadow-jade/25 transition hover:bg-jade-deep hover:text-white disabled:opacity-50"
            >
              {canStart ? "Start Game" : "Need 2+ players"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Waiting for the host to start…
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="md:col-span-1">
          <LobbySettings />
        </div>

        {/* Chat */}
        <div className="md:col-span-1">
          <Chat />
        </div>
      </div>
    </div>
  );
}
