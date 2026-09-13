"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/app/GameProvider";
import { playerColor } from "@/lib/theme";
import { Panel } from "./Panel";
import { ChatIcon } from "./icons";

export function Chat({ compact = false }: { compact?: boolean }) {
  const { state, chat, sendChat, myId } = useGame();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [chat]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    setText("");
  };

  const colorFor = (playerId: string) => {
    const p = state?.players.find((pl) => pl.id === playerId);
    return p ? playerColor(p) : "#8b93a7";
  };

  return (
    <Panel title="Chat" icon={<ChatIcon />} bodyClass="p-0">
      <div
        ref={scrollRef}
        className={`scroll-thin space-y-1.5 overflow-y-auto px-3 py-2.5 ${
          compact ? "h-40" : "h-56"
        }`}
      >
        {chat.length === 0 && (
          <p className="text-xs text-slate-500">No messages yet — say hi 👋</p>
        )}
        {chat.map((m, i) => (
          <div key={i} className="text-sm leading-snug">
            <span
              className="font-display font-bold"
              style={{ color: m.playerId === myId ? "#7C6BF6" : colorFor(m.playerId) }}
            >
              {m.playerName}
            </span>
            <span className="text-slate-500">: </span>
            <span className="break-words text-slate-200">{m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Type a message…"
          className="w-full rounded-xl border border-white/10 bg-stall-2/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-jade/70"
        />
        <button className="rounded-xl bg-jade px-3.5 py-2 text-sm font-bold text-slate-950 transition hover:bg-jade-deep hover:text-white">
          Send
        </button>
      </form>
    </Panel>
  );
}
