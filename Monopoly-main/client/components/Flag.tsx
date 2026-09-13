"use client";

import { useState } from "react";
import { countryOf } from "@/lib/flags";

/**
 * A round country flag for a city tile. Loads the uploaded image from
 * /public/flags; if the file is missing (or fails to load) it degrades to a
 * clean 2-letter country chip so the UI never shows a broken image.
 */
export function Flag({
  name,
  className = "",
  bare = false,
}: {
  name: string | undefined | null;
  className?: string;
  /** Drop the round crop + hairline — for the blurred backdrop layer on tiles. */
  bare?: boolean;
}) {
  const country = countryOf(name);
  const [broken, setBroken] = useState(false);

  if (!country) return null;

  if (country.file && !broken) {
    return (
      <img
        src={`/flags/${country.file}`}
        alt={bare ? "" : country.label}
        title={bare ? undefined : country.label}
        aria-hidden={bare || undefined}
        onError={() => setBroken(true)}
        className={
          bare
            ? `object-cover ${className}`
            : `inline-block shrink-0 rounded-full object-cover ring-1 ring-black/20 ${className}`
        }
        draggable={false}
      />
    );
  }

  if (bare) return null;

  return (
    <span
      title={country.label}
      className={`grid shrink-0 place-items-center rounded-full bg-white/10 font-numeric text-[0.8em] font-bold uppercase leading-none text-slate-200 ring-1 ring-white/20 ${className}`}
    >
      {country.code}
    </span>
  );
}
