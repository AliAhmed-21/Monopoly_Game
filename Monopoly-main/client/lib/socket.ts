import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@monopoly/shared";

/** Single shared socket connection to the real-time game server (README §4). */
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
