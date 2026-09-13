"use client";

import { useState } from "react";
import type { ProvinceId, TileKind } from "@/lib/theme";
import { PROVINCES } from "@/lib/theme";

type SvgProps = { className?: string };

const base = (extra = "") => `inline-block ${extra}`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Tile-type glyphs — the original icon logic, redrawn as consistent SVGs.
// All use currentColor so the tile can theme them.
// ─────────────────────────────────────────────────────────────────────────────

function Plane({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21 15.5 13.5 12V5.5a1.5 1.5 0 0 0-3 0V12L3 15.5v2l7.5-2.2V19l-2 1.4V22l3.5-1 3.5 1v-1.6L15 19v-3.7l6 2.2z" />
    </svg>
  );
}

/**
 * Electric company — RichUp's two-tone bolt. Their original wraps each half in
 * an SVG <filter> for a gloss overlay; those carry hard-coded ids, which would
 * collide once the glyph is on the board more than once, so we keep the exact
 * geometry + fills and drop the filters.
 */
function Bolt({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 15.69 25.093" className={className} aria-hidden>
      <g transform="translate(-1028.3 -476.44)" fillRule="evenodd">
        <path
          d="M1037.8 484.27h-.65l2.08-6.361a1.174 1.174 0 0 0-1.13-1.48h-7.06a1.181 1.181 0 0 0-1.17 1.019l-1.56 11.761a1.17 1.17 0 0 0 1.16 1.333h6.82"
          fill="#f1c40f"
        />
        <path
          d="m1035.3 490.54-2.26 9.532a1.171 1.171 0 0 0 1.14 1.445 1.183 1.183 0 0 0 1.02-.588l8.63-14.9a1.177 1.177 0 0 0-1.02-1.764h-5.65"
          fill="#f39c12"
        />
      </g>
    </svg>
  );
}

/** Water company — RichUp's faucet, same treatment as the bolt above. */
function Drop({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 30 32.25" className={className} aria-hidden>
      <g transform="translate(-965 -485.75)" fillRule="evenodd">
        <path
          d="M985.625 497h-2.262a7.786 7.786 0 0 0-3.363-1.641v-2.786l-1.875-.2-1.875.2v2.786a7.865 7.865 0 0 0-3.363 1.641h-6.949a.938.938 0 0 0-.938.938v5.625a.938.938 0 0 0 .938.937h5.436a7.952 7.952 0 0 0 13.5 0h.749a1.876 1.876 0 0 1 1.875 1.875 1.876 1.876 0 0 0 1.875 1.875h3.75a1.876 1.876 0 0 0 1.877-1.875 9.378 9.378 0 0 0-9.375-9.375Z"
          fill="#e1e5e6"
        />
        <path
          d="M989 515.33a2.505 2.505 0 1 0 5 0c0-1.472-2.5-5.333-2.5-5.333s-2.5 3.861-2.5 5.333z"
          fill="#5fccff"
        />
        <path
          d="M980 489.313v-2.625a.938.938 0 0 0-.937-.938h-1.875a.938.938 0 0 0-.938.938v2.625"
          fill="#d5dadc"
        />
        <path
          d="m976.25 488.313-6.469-.683a.959.959 0 0 0-1.031.985v1.77a.959.959 0 0 0 1.031.985l8.344-.88 8.344.879a.959.959 0 0 0 1.031-.985v-1.769a.959.959 0 0 0-1.031-.985l-6.469.683"
          fill="#95a5a6"
        />
      </g>
    </svg>
  );
}

/**
 * Income tax — a duotone bill-and-pen, matching the fa-duotone pairing RichUp
 * uses (a soft rear plate under a solid front mark). Redrawn on a 24-grid so it
 * sits on the same optical weight as the other tile glyphs.
 */
function Tax({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3.2l-6.6 6.6c-.5.5-.9 1.2-1 1.9l-.3 1.3H5a2 2 0 0 1-2-2V7Z" opacity=".4" />
      <path d="M10 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Zm0 1.9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path d="m14.7 20.8.6-3c.1-.6.4-1.2.9-1.6l5.9-5.9 3 3-5.9 5.9c-.4.4-1 .8-1.6.9l-3 .6a.7.7 0 0 1-.9-.9Z" />
    </svg>
  );
}

/** Go to prison — the skull-and-crossbones RichUp marks the corner with. */
export function Skull({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 448 560" className={className} fill="currentColor" aria-hidden>
      <path d="M304.2 210.8c20.4-18 31.8-41.8 31.8-66.8 0-48.4-45.3-96-112-96S112 95.6 112 144c0 25.1 11.3 48.8 31.8 66.8 10.3 9.1 16.2 22.2 16.2 36l0 17.2c0 4.4 3.6 8 8 8l112 0c4.4 0 8-3.6 8-8l0-17.2c0-13.8 5.9-26.9 16.2-36zM336 264c0 30.9-25.1 56-56 56l-112 0c-30.9 0-56-25.1-56-56l0-17.2C82.4 220.7 64 184.3 64 144 64 64.5 135.6 0 224 0S384 64.5 384 144c0 40.3-18.4 76.7-48 102.8l0 17.2zM2 334.3c5.3-12.1 19.5-17.6 31.6-12.3L224 405.8 414.3 322c12.1-5.3 26.3 .2 31.6 12.3s-.2 26.3-12.3 31.6l-150.1 66 150.1 66c12.1 5.3 17.6 19.5 12.3 31.6s-19.5 17.6-31.6 12.3L224 458.2 33.7 542c-12.1 5.3-26.3-.2-31.6-12.3s.2-26.3 12.3-31.6l150.1-66-150.1-66C2.2 360.6-3.3 346.5 2 334.3zM144 144a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm128-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
    </svg>
  );
}

export function Question({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.2 15.5a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm1.9-6.3c-.7.6-1 .9-1 1.6v.4h-1.9v-.5c0-1.2.5-1.9 1.4-2.6.7-.6.9-.9.9-1.4 0-.6-.5-1-1.3-1-.7 0-1.3.4-1.6 1.2l-1.7-.7C9.4 7.7 10.6 7 12.2 7c1.8 0 3.1 1 3.1 2.6 0 1-.4 1.6-1.2 2.3Z" />
    </svg>
  );
}

export function Chest({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v1H4V9Zm0 3h7v2h2v-2h7v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7Zm7 0v2h2v-2h-2Z" />
      <rect x="11" y="12" width="2" height="4" fill="#20160c" opacity=".3" />
    </svg>
  );
}

/** Small building marker used on plain property tiles behind the crest. */
function Dome({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 3c1.6 1 2.6 2.4 2.6 4.2 0 .5-.1 1-.3 1.4H9.7a3.6 3.6 0 0 1-.3-1.4C9.4 5.4 10.4 4 12 4Zm-6 6h12v2H6zm1 3h10v7H7z" />
      <path d="M12 2v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function TileGlyph({ kind, className }: { kind: TileKind; className?: string }) {
  switch (kind) {
    case "airport":
      return <Plane className={className} />;
    case "power":
      return <Bolt className={className} />;
    case "water":
      return <Drop className={className} />;
    case "tax":
      return <Tax className={className} />;
    case "surprise":
      return <Question className={className} />;
    case "treasure":
      return <Chest className={className} />;
    case "property":
      return <Dome className={className} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Province crest — each city's "flag". A shield tinted in the province color
// with a simple regional emblem.
// ─────────────────────────────────────────────────────────────────────────────

function crestEmblem(province: ProvinceId) {
  switch (province) {
    case "balochistan": // desert dunes + sun
      return (
        <>
          <circle cx="12" cy="8.5" r="2.2" fill="#fff" opacity=".95" />
          <path d="M5 15c2-2 3.5-2 5 0s3 2 5 0 3-1.5 4 0v3H5z" fill="#fff" opacity=".9" />
        </>
      );
    case "sindh": // Indus wave
      return (
        <path d="M5 10c1.6-1.6 3-1.6 4.6 0s3 1.6 4.6 0 3-1.6 4.6 0M5 14c1.6-1.6 3-1.6 4.6 0s3 1.6 4.6 0 3-1.6 4.6 0" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      );
    case "kpk": // Khyber peaks
      return (
        <path d="M4 16 9 7l3 5 2-3 6 7z" fill="#fff" opacity=".95" />
      );
    case "punjab": // wheat sheaf
      return (
        <>
          <path d="M12 5v12" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 7c-1.5-.6-2.6-.3-3 .8 1.4.4 2.4.1 3-.8Zm0 0c1.5-.6 2.6-.3 3 .8-1.4.4-2.4.1-3-.8Zm0 3c-1.5-.6-2.6-.3-3 .8 1.4.4 2.4.1 3-.8Zm0 0c1.5-.6 2.6-.3 3 .8-1.4.4-2.4.1-3-.8Z" fill="#fff" />
        </>
      );
    case "ict": // Faisal Mosque dome + minaret
      return (
        <>
          <path d="M12 5 9 11h6z" fill="#fff" />
          <rect x="10.5" y="11" width="3" height="6" fill="#fff" />
          <rect x="6" y="9" width="1.4" height="8" fill="#fff" opacity=".8" />
          <rect x="16.6" y="9" width="1.4" height="8" fill="#fff" opacity=".8" />
        </>
      );
  }
}

export function ProvinceCrest({
  province,
  className,
  title,
}: {
  province: ProvinceId;
  className?: string;
  title?: string;
}) {
  const p = PROVINCES[province];
  return (
    <svg viewBox="0 0 24 26" className={base(className)} aria-hidden role="img">
      {title && <title>{title}</title>}
      <path
        d="M12 1 22 4v9c0 6-4.4 9.8-10 12C6.4 22.8 2 19 2 13V4z"
        fill={p.color}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
      {crestEmblem(province)}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Corner illustrations — larger, more detailed than the type glyphs.
// ─────────────────────────────────────────────────────────────────────────────

export function CornerArt({
  subtype,
  className,
}: {
  subtype: "start" | "jail" | "vacation" | "goto_jail";
  className?: string;
}) {
  switch (subtype) {
    case "start": // GO — forward double-chevron
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path d="M12 12l12 12-12 12" fill="none" stroke="#7C6BF6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 12l12 12-12 12" fill="none" stroke="#F2B93C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "jail": // barred window
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect x="12" y="10" width="24" height="28" rx="2" fill="#201E2A" stroke="#F2B93C" strokeWidth="2" />
          <path d="M18 12v24M24 12v24M30 12v24" stroke="#F2B93C" strokeWidth="2.4" />
          <path d="M13 20h22" stroke="#F2B93C" strokeWidth="2.4" />
        </svg>
      );
    case "vacation":
      return <VacationArt className={className} />;
    case "goto_jail":
      return (
        <span className={`inline-flex text-crimson ${className ?? ""}`}>
          <Skull className="h-full w-full" />
        </span>
      );
  }
}

/**
 * Vacation corner. RichUp serves this as a raster beach scene; their CDN blocks
 * hotlinking, so we draw an equivalent and prefer a local copy when one exists —
 * drop the file at `public/art/vacation.png` and it takes over automatically.
 */
function VacationArt({ className }: SvgProps) {
  const [noImage, setNoImage] = useState(false);

  if (!noImage) {
    return (
      <img
        src="/art/vacation.png"
        alt=""
        aria-hidden
        draggable={false}
        onError={() => setNoImage(true)}
        className={`object-contain ${className ?? ""}`}
      />
    );
  }

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="35" cy="13" r="6" fill="#F2B93C" />
      {/* palm fronds + trunk */}
      <path
        d="M14 34c0-9 1.5-15 4-19"
        fill="none"
        stroke="#8A5A2B"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M18 15c-5-3-10-2-12 2 4-1 8 0 10 2zm0 0c6-2 11 1 12 5-4-2-8-2-11 0zm0 0c-3-5-2-9 1-11 1 4 1 8 0 10z"
        fill="#2FA96B"
      />
      {/* sea + sand */}
      <path d="M2 34h44v5c-4 2-8 2-11 0s-7-2-11 0-8 2-11 0-8-2-11 0z" fill="#4FB0D9" />
      <path d="M2 39c3-2 8-2 11 0s8 2 11 0 8-2 11 0 7 2 11 0v7H2z" fill="#E8C88A" />
    </svg>
  );
}

/** House marker used on the ownership band ("🏠 × 3"). */
export function HouseGlyph({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
      <path d="M12 3.2 21 11h-2.6v8.2c0 .6-.5 1-1 1h-3.2v-5.4h-4.4v5.4H6.6c-.6 0-1-.4-1-1V11H3z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log / action icons — one small glyph per event kind.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionIconKind =
  | "buy"
  | "rent"
  | "roll"
  | "card"
  | "prison"
  | "start"
  | "build"
  | "trade"
  | "mortgage"
  | "bankrupt"
  | "join"
  | "win"
  | "event";

export function ActionIcon({
  kind,
  className,
}: {
  kind: ActionIconKind;
  className?: string;
}) {
  const c = base(className);
  switch (kind) {
    case "buy":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16l-1.5 9H6z" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
        </svg>
      );
    case "rent":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-1.2c-1.4-.3-2.3-1.2-2.4-2.5h1.9c.1.6.6 1 1.5 1 .8 0 1.3-.4 1.3-.9 0-.6-.5-.8-1.7-1.1-1.6-.4-2.8-1-2.8-2.5 0-1.1.8-1.9 2.2-2.2V6h2v1.1c1.2.3 2 1.1 2.1 2.3h-1.9c-.1-.5-.5-.9-1.2-.9-.7 0-1.2.3-1.2.8 0 .5.5.7 1.7 1 1.7.4 2.8 1 2.8 2.6 0 1.1-.8 2-2.2 2.3V17Z" />
        </svg>
      );
    case "roll":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.3" fill="currentColor" /><circle cx="15" cy="15" r="1.3" fill="currentColor" /><circle cx="15" cy="9" r="1.3" fill="currentColor" /><circle cx="9" cy="15" r="1.3" fill="currentColor" />
        </svg>
      );
    case "card":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="6" width="14" height="12" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v9" />
        </svg>
      );
    case "prison":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9 4v16M15 4v16" />
        </svg>
      );
    case "start":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M5 3l14 9-14 9z" />
        </svg>
      );
    case "build":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
          <path d="M4 20V10l8-6 8 6v10z" /><path d="M9 20v-6h6v6" />
        </svg>
      );
    case "trade":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 8h13l-3-3M17 16H4l3 3" />
        </svg>
      );
    case "mortgage":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 10 12 4l8 6M6 10v10h12V10M10 20v-5h4v5" />
        </svg>
      );
    case "bankrupt":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6l16 12M20 6 4 18" />
        </svg>
      );
    case "win":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M6 4h12v3a4 4 0 0 1-3 3.9V13l2 5H7l2-5v-2.1A4 4 0 0 1 6 7z" />
        </svg>
      );
    case "join":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="10" cy="8" r="3.2" /><path d="M4 20c0-3.3 2.7-5 6-5s6 1.7 6 5M18 8v6M15 11h6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature: the truck-art "phool-patti" center medallion + a crescent-star mark.
// ─────────────────────────────────────────────────────────────────────────────

export function Medallion({ className }: SvgProps) {
  const petals = Array.from({ length: 12 });
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="med-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EFB63A" />
          <stop offset="100%" stopColor="#C8912A" />
        </radialGradient>
      </defs>
      <g transform="translate(100 100)">
        {petals.map((_, i) => (
          <g key={i} transform={`rotate(${(360 / 12) * i})`}>
            <path
              d="M0 -86 C 14 -66 14 -46 0 -30 C -14 -46 -14 -66 0 -86 Z"
              fill={i % 2 === 0 ? "#0FA968" : "#E5384D"}
              opacity="0.85"
            />
          </g>
        ))}
        {petals.map((_, i) => (
          <g key={`i${i}`} transform={`rotate(${(360 / 12) * i + 15})`}>
            <path
              d="M0 -60 C 9 -48 9 -34 0 -24 C -9 -34 -9 -48 0 -60 Z"
              fill="#EFB63A"
              opacity="0.7"
            />
          </g>
        ))}
        <circle r="34" fill="url(#med-core)" stroke="#7a5a16" strokeWidth="1.5" />
        <circle r="34" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI icons for panel headers / chrome.
// ─────────────────────────────────────────────────────────────────────────────

export function UsersIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.2A3.2 3.2 0 0 1 16 11M21 20c0-2.6-1.6-4.2-4-4.8" />
    </svg>
  );
}

export function HomeIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M4 11 12 4l8 7M6 10v10h12V10M10 20v-5h4v5" />
    </svg>
  );
}

export function HotelIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
      <path d="M4 21V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3h4a1 1 0 0 1 1 1v11h-6v-3h-4v3H4Zm3-10h2V9H7v2Zm4 0h2V9h-2v2Zm-4 4h2v-2H7v2Zm4 0h2v-2h-2v2Z" />
    </svg>
  );
}

export function ChatIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16v11H9l-4 3v-3H4z" />
    </svg>
  );
}

export function ScrollIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7" /><path d="M7 4a2 2 0 0 0-2 2v1h4M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

export function Crown({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
    </svg>
  );
}

export function LockIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TicketIcon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M15 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

export function CrescentStar({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} aria-hidden>
      <path
        d="M15.5 3a9 9 0 1 0 0 18 7.2 7.2 0 0 1 0-14.4c.9 0 1.8.2 2.6.5A8.9 8.9 0 0 0 15.5 3Z"
        fill="currentColor"
      />
      <path d="m19 8 .9 1.9 2.1.3-1.5 1.5.3 2.1-1.8-1-1.8 1 .3-2.1L15.9 10l2.1-.1z" fill="currentColor" />
    </svg>
  );
}
