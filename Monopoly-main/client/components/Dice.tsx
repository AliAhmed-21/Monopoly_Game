"use client";

import { useEffect, useRef, useState } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduce;
}

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = PIPS[value] ?? [];
  return (
    <div
      className={`grid h-9 w-9 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-gradient-to-br from-white to-slate-200 p-1.5 ring-1 ring-black/20 sm:h-12 sm:w-12 sm:p-2 ${
        rolling ? "animate-tumble shadow-xl" : "shadow-lg"
      }`}
      style={{
        boxShadow: rolling
          ? "0 10px 20px -6px rgba(0,0,0,0.6)"
          : "0 4px 10px -3px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.08)",
      }}
      aria-label={`die showing ${value}`}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const on = pips.some(([pr, pc]) => pr === r && pc === c);
        return (
          <span
            key={i}
            className={`rounded-full ${
              on ? "bg-slate-900 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.4)]" : "bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

export function Dice({ dice }: { dice: [number, number] }) {
  const reduce = usePrefersReducedMotion();
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState<[number, number]>(dice);
  const prev = useRef<[number, number]>(dice);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = dice;
      setShown(dice);
      return;
    }
    if (dice[0] === prev.current[0] && dice[1] === prev.current[1]) return;
    prev.current = dice;
    if (reduce) {
      setShown(dice);
      return;
    }
    setRolling(true);
    const rand = () => 1 + Math.floor(Math.random() * 6);
    const spin = setInterval(() => setShown([rand(), rand()]), 80);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setShown(dice);
      setRolling(false);
    }, 850);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice[0], dice[1], reduce]);

  const isDouble = !rolling && shown[0] === shown[1] && shown[0] > 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2 sm:gap-3">
        <Die value={shown[0]} rolling={rolling} />
        <Die value={shown[1]} rolling={rolling} />
      </div>
      <span className="h-3 font-numeric text-[10px] font-semibold uppercase tracking-widest">
        {rolling ? (
          <span className="text-brass">rolling…</span>
        ) : isDouble ? (
          <span className="text-jade">doubles!</span>
        ) : shown[0] > 0 ? (
          <span className="text-slate-400">{shown[0] + shown[1]}</span>
        ) : null}
      </span>
    </div>
  );
}
