"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@monopoly/shared";
import { money } from "@/lib/theme";

/** How long the floating ±amount stays on screen (matches the CSS animation). */
const DELTA_MS = 1500;

const GAIN = "#34D399";
const LOSS = "#F0495A";

/**
 * A money value that flashes when it changes and floats the difference off it —
 * gains rise above the number in green, payments drop below in red — so you can
 * see WHY a balance moved without reading the log. The float is absolutely
 * positioned, so it never nudges the row it lives in.
 */
export function Balance({
  state,
  amount,
  className = "",
}: {
  state: GameState | null;
  amount: number;
  className?: string;
}) {
  const [flash, setFlash] = useState(false);
  // `key` restarts the CSS animation when a second change lands mid-float.
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const prev = useRef(amount);
  const seq = useRef(0);

  useEffect(() => {
    if (prev.current === amount) return;
    const diff = amount - prev.current;
    prev.current = amount;

    seq.current += 1;
    const key = seq.current;
    setFlash(true);
    setDelta({ value: diff, key });

    const stopFlash = setTimeout(() => setFlash(false), 600);
    const clear = setTimeout(
      () => setDelta((d) => (d?.key === key ? null : d)),
      DELTA_MS
    );
    return () => {
      clearTimeout(stopFlash);
      clearTimeout(clear);
    };
  }, [amount]);

  const gain = (delta?.value ?? 0) > 0;

  return (
    <span className={`relative inline-block font-numeric tabular-nums ${className}`}>
      <span className={`inline-block ${flash ? "motion-safe:animate-flash-up" : ""}`}>
        {money(state, amount)}
      </span>

      {delta && (
        <span
          key={delta.key}
          aria-hidden
          // Colour is inline so it always beats whatever colour the caller's
          // `className` sets on the wrapper.
          style={{ color: gain ? GAIN : LOSS }}
          className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[0.92em] font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
            gain
              ? "bottom-full motion-safe:animate-delta-up"
              : "top-full motion-safe:animate-delta-down"
          }`}
        >
          {gain ? "+" : "−"}
          {Math.abs(delta.value).toLocaleString()}
        </span>
      )}
    </span>
  );
}
