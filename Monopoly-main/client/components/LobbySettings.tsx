"use client";

import { useGame } from "@/app/GameProvider";
import type { GameSettings } from "@monopoly/shared";

const TOGGLES: { key: keyof GameSettings; label: string; hint: string }[] = [
  { key: "doubleRentFullSet", label: "x2 rent on full-set", hint: "Owning a whole color set doubles base rent." },
  { key: "vacationCash", label: "Vacation cash", hint: "Taxes & fees pool up; landing on Vacation pays out." },
  { key: "auctions", label: "Auctions", hint: "Declined properties go to the highest bidder." },
  { key: "noRentInPrison", label: "No rent in prison", hint: "Owners in jail collect no rent." },
  { key: "mortgageEnabled", label: "Mortgages", hint: "Mortgage for 50%; no rent while mortgaged." },
  { key: "evenBuild", label: "Even build", hint: "Build/sell houses evenly across a set." },
  { key: "randomizeTurnOrder", label: "Randomize turn order", hint: "Shuffle player order at game start." },
];

const field =
  "mt-1 w-full rounded-xl border border-white/10 bg-stall-2/80 px-3 py-2 text-slate-100 outline-none transition focus:border-jade/70 disabled:opacity-60";

export function LobbySettings() {
  const { state, isHost, updateSettings, maps } = useGame();
  if (!state) return null;
  const s = state.settings;
  const disabled = !isHost;

  return (
    <div className="stall-card space-y-4 p-4">
      <h3 className="font-display text-sm font-semibold text-slate-200">
        House Rules{" "}
        {disabled && <span className="text-xs font-normal text-slate-500">(host only)</span>}
      </h3>

      <label className="block">
        <span className="text-xs text-slate-400">Board map</span>
        <select
          value={s.boardMapId}
          disabled={disabled}
          onChange={(e) => updateSettings({ boardMapId: e.target.value })}
          className={field}
        >
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.currency})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-400">Starting cash</span>
          <input
            type="number"
            min={500}
            max={5000}
            step={100}
            value={s.startingCash}
            disabled={disabled}
            onChange={(e) => updateSettings({ startingCash: Number(e.target.value) })}
            className={`${field} font-numeric`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">Max players</span>
          <input
            type="number"
            min={2}
            max={8}
            value={s.maxPlayers}
            disabled={disabled}
            onChange={(e) => updateSettings({ maxPlayers: Number(e.target.value) })}
            className={`${field} font-numeric`}
          />
        </label>
      </div>

      <div className="space-y-1">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 transition hover:bg-white/5"
            title={t.hint}
          >
            <input
              type="checkbox"
              checked={s[t.key] as boolean}
              disabled={disabled}
              onChange={(e) => updateSettings({ [t.key]: e.target.checked })}
              className="mt-1 h-4 w-4 accent-jade"
            />
            <span>
              <span className="text-sm text-slate-200">{t.label}</span>
              <span className="block text-xs text-slate-500">{t.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
