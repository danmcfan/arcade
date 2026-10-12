// The save behind "Continue": the hub high score, tokens, tickets and owned
// prizes, and where the player stood. Minigame progress is not saved. The title scene talks to a `SaveStore`
// so it stays DOM-free (D12); main.ts passes `localStorageStore()`, tests
// pass `memoryStore()`.

import type { Direction } from "../engine/input.ts";
import { startingTokens } from "../arcade/state.ts";
import { inCatalogueOrder, isPrizeId } from "../arcade/prizes.ts";
import type { Progress } from "../game/game.ts";

export interface SaveData extends Progress {
  /**
   * Format version. Older saves are upgraded on load: `v: 1` (no tokens,
   * tickets or prizes) and `v: 2` (no prizes). Any other `v` is ignored.
   */
  v: 3;
}

/** The current format version. */
export const saveVersion = 3;

/** What a `v: 1` save gets on upgrade: a New game's tokens and tickets. */
const v1Upgrade = { tokens: startingTokens, tickets: 0 };

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

function count(v: unknown): v is number {
  return Number.isSafeInteger(v) && (v as number) >= 0;
}

/** Validate untrusted JSON (from storage) as a save; null if it is not one. */
export function parseSave(raw: unknown): SaveData | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if ((o.v !== 1 && o.v !== 2 && o.v !== 3) || !finite(o.highScore) || o.highScore < 0) return null;
  const p = o.player as Record<string, unknown> | null | undefined;
  if (p === null || typeof p !== "object") return null;
  if (!finite(p.x) || !finite(p.y) || !DIRECTIONS.includes(p.dir as Direction)) return null;
  const tokens = o.v === 1 ? v1Upgrade.tokens : o.tokens;
  const tickets = o.v === 1 ? v1Upgrade.tickets : o.tickets;
  if (!count(tokens) || !count(tickets)) return null;
  // v1 and v2 saves own no prizes.
  const prizes = o.v === 3 ? o.prizes : [];
  if (!Array.isArray(prizes) || !prizes.every(isPrizeId)) return null;
  return {
    v: 3,
    highScore: o.highScore,
    tokens,
    tickets,
    prizes: inCatalogueOrder(prizes),
    player: { x: p.x, y: p.y, dir: p.dir as Direction },
  };
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
