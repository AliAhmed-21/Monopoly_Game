"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/app/GameProvider";
import { ActionIcon } from "./icons";

export function Home() {
  const { createRoom, joinRoom, connected } = useGame();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set when the page was opened from a share link (?room=CODE): the invited
  // player only picks a name — the room is already decided for them.
  const [invite, setInvite] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) setInvite(room.trim().toUpperCase());
    const savedName = localStorage.getItem("monopoly.name");
    if (savedName) setName(savedName);
  }, []);

  const remember = () => localStorage.setItem("monopoly.name", name.trim());

  /** Drop ?room= so leaving the room later lands on the normal home screen. */
  const clearInviteParam = () =>
    window.history.replaceState(null, "", window.location.pathname);

  const leaveInvite = () => {
    clearInviteParam();
    setInvite(null);
    setErr(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return setErr("Enter your name first.");
    setBusy(true);
    remember();
    const res = await createRoom(name.trim());
    setBusy(false);
    if (!res.ok) setErr(res.error);
  };

  const handleJoin = async (roomCode: string) => {
    if (!name.trim()) return setErr("Enter your name first.");
    if (!roomCode.trim()) return setErr("Enter a room code.");
    setBusy(true);
    remember();
    const res = await joinRoom(roomCode.trim(), name.trim());
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else if (invite) clearInviteParam();
  };

  const nameInput = (
    <label className="block">
      <span className="text-sm font-semibold text-slate-400">Your name</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && invite) void handleJoin(invite);
        }}
        maxLength={20}
        autoFocus
        placeholder="e.g. Ali"
        className="mt-1 w-full rounded-xl border border-white/10 bg-stall-2/80 px-3 py-2.5 text-slate-100 outline-none transition focus:border-jade/70"
      />
    </label>
  );

  const status = (
    <>
      {err && <p className="text-sm font-medium text-crimson">{err}</p>}
      {!connected && <p className="text-sm text-brass">Connecting to server…</p>}
    </>
  );

  const title = (
    <h1 className="flex items-center justify-center gap-3 font-display text-5xl font-black tracking-tight text-slate-100">
      <ActionIcon kind="roll" className="h-10 w-10 text-brass" />
      <span>
        Mono<span className="text-jade">poly</span>
      </span>
    </h1>
  );

  // ---- Invite link: name + join only, with a way back to the full home. ----
  if (invite) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          {title}
          <p className="mt-3 text-slate-400">
            You&apos;ve been invited to a game. Enter your name to join.
          </p>
        </div>

        <div className="stall-card w-full space-y-4 p-6">
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-slate-400">Room</span>
            <span className="rounded-xl bg-stall-2/80 px-3 py-1 font-numeric text-2xl font-bold tracking-[0.3em] text-brass ring-1 ring-white/10">
              {invite}
            </span>
          </div>

          {nameInput}

          <button
            onClick={() => void handleJoin(invite)}
            disabled={busy || !connected}
            className="w-full rounded-xl bg-jade px-4 py-3 font-display font-bold text-slate-950 shadow-lg shadow-jade/25 transition hover:bg-jade-deep hover:text-white disabled:opacity-50"
          >
            Join game
          </button>

          {status}
        </div>

        <button
          onClick={leaveInvite}
          className="text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline"
        >
          Home — create your own room instead
        </button>
      </div>
    );
  }

  // ---- Normal home: create a room or type a code. ----
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        {title}
        <p className="mt-3 text-slate-400">
          Real-time multiplayer over the cities of Pakistan. Create a room and
          share the code with friends.
        </p>
      </div>

      <div className="stall-card w-full space-y-4 p-6">
        {nameInput}

        <button
          onClick={handleCreate}
          disabled={busy || !connected}
          className="w-full rounded-xl bg-jade px-4 py-3 font-display font-bold text-slate-950 shadow-lg shadow-jade/25 transition hover:bg-jade-deep hover:text-white disabled:opacity-50"
        >
          Create a room
        </button>

        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <div className="h-px flex-1 bg-white/10" /> or join <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleJoin(code);
            }}
            maxLength={5}
            placeholder="room code"
            className="w-full rounded-xl border border-white/10 bg-stall-2/80 px-3 py-2.5 font-numeric uppercase tracking-[0.3em] text-slate-100 outline-none transition focus:border-jade/70"
          />
          <button
            onClick={() => void handleJoin(code)}
            disabled={busy || !connected}
            className="shrink-0 rounded-xl bg-white/10 px-4 py-2 font-display font-bold text-slate-100 transition hover:bg-white/20 disabled:opacity-50"
          >
            Join
          </button>
        </div>

        {status}
      </div>
      <p className="text-xs text-slate-600">
        Tip: open several browser tabs to simulate multiple players.
      </p>
    </div>
  );
}
