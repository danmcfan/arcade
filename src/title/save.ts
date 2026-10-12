// The save behind "Continue": the hub high score and where the player stood.
// Minigame progress is not saved. The title scene talks to a `SaveStore`
// so it stays DOM-free (D12); main.ts passes `localStorageStore()`, tests
// pass `memoryStore()`.

import type { Direction } from "../engine/input.ts";
import type { Progress } from "../game/game.ts";

export interface SaveData extends Progress {
  /** Format version; a save with any other `v` is ignored. */
  v: 1;
}

export interface SaveStore {
  /** The stored save, or null when there is none or it is unreadable. */
  load(): SaveData | null;
  save(data: SaveData): void;
  clear(): void;
}

const DIRECTIONS: readonly Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Validate untrusted JSON (from storage) as a save; null if it is not one. */
export function parseSave(raw: unknown): SaveData | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || !finite(o.highScore) || o.highScore < 0) return null;
  const p = o.player as Record<string, unknown> | null | undefined;
  if (p === null || typeof p !== "object") return null;
  if (!finite(p.x) || !finite(p.y) || !DIRECTIONS.includes(p.dir as Direction)) return null;
  return { v: 1, highScore: o.highScore, player: { x: p.x, y: p.y, dir: p.dir as Direction } };
}

export function memoryStore(initial: SaveData | null = null): SaveStore {
  let data = initial;
  return {
    load: () => data,
    save: (d) => {
      data = d;
    },
    clear: () => {
      data = null;
    },
  };
}

export const saveKey = "arcade.save";

/**
 * Browser only. Storage can be missing or throw (private windows, blocked
 * site data); then the game runs without a save.
 */
export function localStorageStore(key = saveKey): SaveStore {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? null : parseSave(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(d) {
      try {
        localStorage.setItem(key, JSON.stringify(d));
      } catch {
        // No storage: Continue just stays unavailable.
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        // As above.
      }
    },
  };
}
