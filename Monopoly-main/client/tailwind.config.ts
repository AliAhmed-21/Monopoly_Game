import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Geometric display face (headings, tile & player names, banners).
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
        // Crisp body face for dense UI text.
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Tabular numeric / label face (money, prices, dice, room code).
        numeric: ["var(--font-numeric)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // ── "Iris" minimalist palette — violet-charcoal night + one confident accent ──
        night: "#0E0D15", // app background — near-black with a faint violet cast
        stall: "#17161F", // floating panel / card surface
        "stall-2": "#201E2A", // raised surface (inputs, list rows)
        parchment: "#ECECF2", // tile face — clean cool white
        "parchment-ink": "#191821", // text on tile face
        jade: "#7C6BF6", // primary accent — interactive / CTA / focus (iris violet)
        "jade-deep": "#5F4EE0",
        brass: "#F2B93C", // amber — money, current turn, highlights
        "brass-deep": "#CE9A24",
        crimson: "#F0495A", // alert / prison / bankruptcy
        // board field — a quiet near-black so the tiles + tokens carry the color.
        felt: "#0C0B14",
        feltdark: "#08070D",
      },
      boxShadow: {
        stall: "0 18px 40px -20px rgba(0,0,0,0.7), 0 2px 8px -2px rgba(0,0,0,0.4)",
        token: "0 3px 6px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.9)",
        medallion: "0 0 60px -10px rgba(239,182,58,0.25)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
      keyframes: {
        // Dice: a tumbling 3D-ish spin that eases to rest.
        tumble: {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "25%": { transform: "rotate(220deg) scale(1.12)" },
          "50%": { transform: "rotate(410deg) scale(0.96)" },
          "75%": { transform: "rotate(560deg) scale(1.06)" },
          "100%": { transform: "rotate(720deg) scale(1)" },
        },
        // Banner: slide + fade in from the top of the board.
        "banner-in": {
          "0%": { opacity: "0", transform: "translateY(-14px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // A soft brass pulse for "your turn" and live highlights.
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(242,185,60,0.5)" },
          "50%": { boxShadow: "0 0 0 6px rgba(242,185,60,0)" },
        },
        // Balance change flash.
        "flash-up": {
          "0%": { color: "#0FA968", transform: "translateY(2px)" },
          "100%": { color: "inherit", transform: "translateY(0)" },
        },
        // The ±amount that floats off a balance when it moves: pops in, drifts
        // away from the number, fades out. Gains rise, payments sink.
        "delta-up": {
          "0%": { opacity: "0", transform: "translate(-50%, 4px) scale(0.85)" },
          "20%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
          "65%": { opacity: "1", transform: "translate(-50%, -3px) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, -11px) scale(0.95)" },
        },
        "delta-down": {
          "0%": { opacity: "0", transform: "translate(-50%, -4px) scale(0.85)" },
          "20%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
          "65%": { opacity: "1", transform: "translate(-50%, 3px) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, 11px) scale(0.95)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "sheet-in": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        tumble: "tumble 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
        "banner-in": "banner-in 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "flash-up": "flash-up 600ms ease-out",
        "delta-up": "delta-up 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "delta-down": "delta-down 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "spin-slow": "spin-slow 6s linear infinite",
        "sheet-in": "sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
