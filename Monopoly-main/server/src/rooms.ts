import { customAlphabet } from "nanoid";
import { Game } from "./engine/game.js";

/** Room registry — one in-memory Game per room code (README §4, §5). */
const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5);

export class RoomManager {
  private rooms = new Map<string, Game>();

  create(hostName: string, hostSocketId: string): Game {
    let code = nano();
    while (this.rooms.has(code)) code = nano();
    const game = new Game(code, hostName, hostSocketId);
    this.rooms.set(code, game);
    return game;
  }

  get(code: string): Game | undefined {
    return this.rooms.get(code.toLowerCase());
  }

  remove(code: string): void {
    this.rooms.delete(code.toLowerCase());
  }

  /** Drop rooms that no longer have any connected players. */
  cleanup(): void {
    for (const [code, game] of this.rooms) {
      if (game.isEmpty()) this.rooms.delete(code);
    }
  }
}
