import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { GameProvider } from "./GameProvider";

/**
 * Display — geometric, slightly narrow and very even in colour, which is what
 * lets a long city name sit big inside a small tile without looking squeezed.
 * Also carries headings, the board title and the win screen.
 */
const display = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/** Body — open, humanist shapes that stay crisp at the sizes the panels use. */
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

/** Utility / numeric — tabular figures for money, prices, dice, room codes. */
const numeric = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-numeric",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monopoly — Multiplayer Board Game",
  description: "Real-time multiplayer Monopoly-style board game with swappable maps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${numeric.variable}`}
    >
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
