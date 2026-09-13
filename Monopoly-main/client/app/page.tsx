"use client";

import { useGame } from "./GameProvider";
import { Home } from "@/components/Home";
import { Lobby } from "@/components/Lobby";
import { GameRoom } from "@/components/GameRoom";
import { Toast } from "@/components/Toast";

export default function Page() {
  const { state, error, notice } = useGame();

  return (
    <main className="min-h-screen">
      <Toast message={error} />
      <Toast message={notice} variant="info" />
      {!state ? (
        <Home />
      ) : state.status === "lobby" ? (
        <Lobby />
      ) : (
        <GameRoom />
      )}
    </main>
  );
}
