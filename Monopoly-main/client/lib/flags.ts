// ─────────────────────────────────────────────────────────────────────────────
// City → country flag resolution (client-only, cosmetic).
//
// Flags live in `client/public/flags/`. Filenames are whatever the user uploaded
// (not necessarily ISO codes), so we map each city to its exact file here. When a
// country's file hasn't been uploaded yet, `file` is omitted and <Flag> shows a
// clean 2-letter country chip instead.
// ─────────────────────────────────────────────────────────────────────────────

export interface Country {
  /** ISO-ish 2-letter code, shown as a fallback chip when no image exists. */
  code: string;
  label: string;
  /** Filename inside /public/flags — omit to fall back to the code chip. */
  file?: string;
}

// Reusable country records ----------------------------------------------------
const BRAZIL: Country = { code: "BR", label: "Brazil", file: "br.svg" };
const PALESTINE: Country = { code: "PS", label: "Palestine", file: "palestine.svg" };
const ITALY: Country = { code: "IT", label: "Italy", file: "it.svg" };
const GERMANY: Country = { code: "DE", label: "Germany", file: "de-germany.svg" };
const FRANCE: Country = { code: "FR", label: "France", file: "fr.svg" };
const UK: Country = { code: "GB", label: "United Kingdom", file: "united_kingdom.svg" };
const USA: Country = { code: "US", label: "United States", file: "usa.svg" };
const CHINA: Country = { code: "CN", label: "China", file: "ch.svg" };
// Not yet uploaded → render as a country chip until a file is added.
const PAKISTAN: Country = { code: "PK", label: "Pakistan" };

/** Map a tile name (lower-cased, trimmed) to its country. */
const CITY_COUNTRY: Record<string, Country> = {
  // ── Classic ─────────────────────────────────────────────────────────────────
  "salvador": BRAZIL,
  "rio": BRAZIL,
  "tel aviv": PALESTINE,
  "haifa": PALESTINE,
  "jerusalem": PALESTINE,
  "tlv airport": PALESTINE,
  "venice": ITALY,
  "milan": ITALY,
  "rome": ITALY,
  "frankfurt": GERMANY,
  "munich": GERMANY,
  "berlin": GERMANY,
  "muc airport": GERMANY,
  "shenzhen": CHINA,
  "beijing": CHINA,
  "shanghai": CHINA,
  "lyon": FRANCE,
  "toulouse": FRANCE,
  "paris": FRANCE,
  "cdg airport": FRANCE,
  "liverpool": UK,
  "manchester": UK,
  "london": UK,
  "jfk airport": USA,
  "san francisco": USA,
  "new york": USA,

  // ── Pakistan (all one country) ──────────────────────────────────────────────
  "gwadar": PAKISTAN,
  "turbat": PAKISTAN,
  "peshawar": PAKISTAN,
  "quetta": PAKISTAN,
  "multan": PAKISTAN,
  "sukkur": PAKISTAN,
  "hyderabad": PAKISTAN,
  "sialkot": PAKISTAN,
  "faisalabad": PAKISTAN,
  "rawalpindi": PAKISTAN,
  "gujranwala": PAKISTAN,
  "abbottabad": PAKISTAN,
  "murree": PAKISTAN,
  "bahawalpur": PAKISTAN,
  "mardan": PAKISTAN,
  "sargodha": PAKISTAN,
  "sahiwal": PAKISTAN,
  "islamabad": PAKISTAN,
  "lahore (gulberg)": PAKISTAN,
  "lahore (dha)": PAKISTAN,
  "karachi (clifton)": PAKISTAN,
  "karachi (dha)": PAKISTAN,
  "jinnah intl (khi)": PAKISTAN,
  "allama iqbal (lhe)": PAKISTAN,
  "islamabad intl (isb)": PAKISTAN,
  "multan intl (mux)": PAKISTAN,
};

/** Resolve a tile/city name to its country, or null (e.g. utilities). */
export function countryOf(name: string | undefined | null): Country | null {
  if (!name) return null;
  return CITY_COUNTRY[name.toLowerCase().trim()] ?? null;
}
