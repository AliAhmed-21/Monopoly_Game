"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/app/GameProvider";
import { parseLogLine } from "@/lib/logParse";
import { playerColor, readableInk } from "@/lib/theme";
import { Panel } from "./Panel";
import { ActionIcon, ScrollIcon } from "./icons";

export function Log() {
  const { state } = useGame();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight);
  }, [state?.log.length]);

  if (!state) return null;

  return (
    <Panel title="Game Log" icon={<ScrollIcon />} bodyClass="p-0">
      <div
        ref={ref}
        className="scroll-thin h-44 space-y-0.5 overflow-y-auto px-2 py-2"
      >
        {state.log.length === 0 && (
          <p className="px-1 py-2 text-xs text-slate-500">No moves yet.</p>
        )}
        {state.log.slice(-80).map((line, i) => {
          const p = parseLogLine(line, state.players);
          const color = p.player ? playerColor(p.player) : "#8b93a7";
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-xs leading-snug hover:bg-white/5"
            >
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 ring-white/30"
                style={{ backgroundColor: color, color: readableInk(color) }}
              >
                <ActionIcon kind={p.kind} className="h-3 w-3" />
              </span>
              <p className="min-w-0 text-slate-300">
                {p.player && (
                  <span className="font-semibold" style={{ color }}>
                    {p.player.name}{" "}
                  </span>
                )}
                <span>{p.rest}</span>
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
