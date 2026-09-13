// ─────────────────────────────────────────────────────────────────────────────
// Tiny notification sounds generated with the Web Audio API — no asset files,
// no network, works offline. The context is unlocked on the first user gesture
// to satisfy browser autoplay policies.
// ─────────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let wired = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Attach one-time listeners so the audio context resumes after a user gesture. */
export function initSound(): void {
  if (typeof window === "undefined" || wired) return;
  wired = true;
  const unlock = () => {
    ac()?.resume?.();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  gain = 0.06,
  type: OscillatorType = "sine"
): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume?.();
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/** A tone that slides from one pitch to another (whoosh / falling effects). */
function glide(
  from: number,
  to: number,
  startOffset: number,
  duration: number,
  gain = 0.06,
  type: OscillatorType = "sine"
): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume?.();
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

// Half a second of white noise, reused by every percussive hit.
let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Filtered noise burst — the "impact" half of hammer/rubble sounds. */
function noise(
  startOffset: number,
  duration: number,
  gain: number,
  filterType: BiquadFilterType,
  freqFrom: number,
  freqTo = freqFrom
): void {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume?.();
  const t0 = c.currentTime + startOffset;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freqFrom, t0);
  if (freqTo !== freqFrom) {
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t0 + duration);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.03);
}

/** Soft two-note ping for an incoming chat message. */
export function playMessage(): void {
  tone(880, 0, 0.12, 0.05, "sine");
  tone(1318.5, 0.07, 0.14, 0.04, "sine");
}

/**
 * Brighter ascending chime when it becomes your turn. `delay` (seconds) lets the
 * caller hold it back so it doesn't collide with the game-start fanfare.
 */
export function playYourTurn(delay = 0): void {
  tone(523.25, delay, 0.16, 0.06, "triangle"); // C5
  tone(659.25, delay + 0.13, 0.16, 0.06, "triangle"); // E5
  tone(783.99, delay + 0.26, 0.24, 0.06, "triangle"); // G5
}

/** Arcade "coin"/ka-ching when a property is bought (plays for everyone). */
export function playBuy(): void {
  tone(987.77, 0, 0.09, 0.055, "square"); // B5
  tone(1318.51, 0.085, 0.18, 0.055, "square"); // E6
}

/** Full fanfare — a fresh game just kicked off. */
export function playGameStart(): void {
  tone(130.81, 0, 0.5, 0.05, "sine"); // C3 bed
  tone(261.63, 0, 0.2, 0.05, "triangle"); // C4
  tone(329.63, 0.12, 0.2, 0.05, "triangle"); // E4
  tone(392.0, 0.24, 0.2, 0.055, "triangle"); // G4
  tone(523.25, 0.36, 0.5, 0.06, "triangle"); // C5
  tone(783.99, 0.36, 0.5, 0.035, "sine"); // G5 shimmer
}

// Sampled cues live in /public/sounds. Elements are cached and rewound so a
// repeat of the same event retriggers cleanly.
const clips = new Map<string, HTMLAudioElement>();
function playClip(file: string, volume = 0.6): void {
  if (typeof window === "undefined") return;
  let el = clips.get(file);
  if (!el) {
    el = new Audio(`/sounds/${file}`);
    el.preload = "auto";
    clips.set(file, el);
  }
  el.volume = volume;
  el.currentTime = 0;
  // Rejects only if the browser hasn't been unlocked yet — nothing to recover.
  void el.play().catch(() => {});
}

/** A player joined the room (sampled clip). */
export function playJoin(): void {
  playClip("game_join_sound.mp3", 0.55);
}

/** Gavel tap + rising blip on every auction bid. */
export function playBid(): void {
  noise(0, 0.05, 0.05, "lowpass", 1100);
  tone(196.0, 0, 0.09, 0.05, "sine"); // wooden thud
  tone(783.99, 0.05, 0.08, 0.045, "square"); // G5
  tone(1046.5, 0.11, 0.12, 0.04, "square"); // C6
}

/** Two hammer taps and a bright ping — a house or hotel went up. */
export function playBuild(): void {
  for (const at of [0, 0.13]) {
    noise(at, 0.05, 0.045, "bandpass", 1600);
    tone(174.61, at, 0.08, 0.05, "square"); // F3 thunk
  }
  tone(1318.51, 0.27, 0.2, 0.04, "triangle"); // E6 "done"
}

/** Falling rubble — a building was sold off. */
export function playDemolish(): void {
  noise(0, 0.34, 0.06, "lowpass", 2200, 240);
  glide(311.13, 98.0, 0, 0.3, 0.05, "sawtooth");
}

/** Doorbell-style two-tone — a trade offer just landed in your court. */
export function playTradeOffer(): void {
  tone(830.61, 0, 0.28, 0.055, "sine"); // G#5
  tone(622.25, 0.2, 0.42, 0.055, "sine"); // D#5
}

/** Warm rising pair — a trade went through. */
export function playTradeAccept(): void {
  tone(659.25, 0, 0.14, 0.05, "triangle"); // E5
  tone(987.77, 0.12, 0.3, 0.05, "triangle"); // B5
}

/** Flat descending buzz — a trade was declined or cancelled. */
export function playTradeDecline(): void {
  tone(311.13, 0, 0.14, 0.05, "sawtooth"); // D#4
  tone(233.08, 0.13, 0.24, 0.05, "sawtooth"); // A#3
}

// ─────────────────────────────────────────────────────────────────────────────
// Log-driven cues — the server log is the one event stream every client shares,
// so public sounds are derived from the lines it appends.
// ─────────────────────────────────────────────────────────────────────────────

export type SoundCue =
  | "start"
  | "join"
  | "buy"
  | "bid"
  | "build"
  | "demolish"
  | "tradeAccept"
  | "tradeDecline";

const CUE_PLAYERS: Record<SoundCue, () => void> = {
  start: playGameStart,
  join: playJoin,
  buy: playBuy,
  bid: playBid,
  build: playBuild,
  demolish: playDemolish,
  tradeAccept: playTradeAccept,
  tradeDecline: playTradeDecline,
};

function cueForLine(line: string): SoundCue | null {
  const l = line.toLowerCase();
  if (l.startsWith("game started on")) return "start";
  if (/\bjoined\.$/.test(l)) return "join";
  if (/\bbought\b/.test(l) || /at auction for/.test(l)) return "buy";
  if (/\bbid\b/.test(l)) return "bid";
  if (/built a (house|hotel)/.test(l)) return "build";
  if (/sold a building/.test(l)) return "demolish";
  if (/completed a trade/.test(l)) return "tradeAccept";
  if (/(declined|cancelled) a trade/.test(l)) return "tradeDecline";
  return null;
}

/** Cues for a batch of new log lines — de-duplicated, in first-seen order. */
export function cuesForLogLines(lines: string[]): SoundCue[] {
  const seen = new Set<SoundCue>();
  for (const line of lines) {
    const cue = cueForLine(line);
    if (cue) seen.add(cue);
  }
  return [...seen];
}

export function playCue(cue: SoundCue): void {
  CUE_PLAYERS[cue]?.();
}
