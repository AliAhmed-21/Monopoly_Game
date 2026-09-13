import type { MapConfig, MapSummary } from "@monopoly/shared";
import { classic } from "./classic.js";
import { pakistan } from "./pakistan.js";

/**
 * Registry of available board maps. Adding a map = add a config file and
 * register it here — no engine changes (README §6).
 */
const MAPS: Record<string, MapConfig> = {
  [classic.id]: classic,
  [pakistan.id]: pakistan,
};

export function getMap(id: string): MapConfig | undefined {
  return MAPS[id];
}

/** Deep-clone a map so each room mutates its own copy (never the shared config). */
export function cloneMap(id: string): MapConfig | undefined {
  const map = MAPS[id];
  if (!map) return undefined;
  return structuredClone(map);
}

export function listMaps(): MapSummary[] {
  return Object.values(MAPS).map((m) => ({
    id: m.id,
    name: m.name,
    theme: m.theme,
    currency: m.currency,
  }));
}
