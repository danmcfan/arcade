// The save behind "Continue": the hub high score, tokens, tickets and owned
// prizes, and where the player stood. Minigame progress is not saved. The title scene talks to a `SaveStore`
// so it stays DOM-free (D12); main.ts passes `localStorageStore()`, tests
// pass `memoryStore()`.

import type { Direction } from "../engine/input.ts";
import { startingTokens } from "../arcade/state.ts";
import { inCatalogueOrder, isPrizeId, type PrizeId } from "../arcade/prizes.ts";
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

const DIRECTIONS: ReadonlySet<unknown> = new Set<Direction>(["UP", "DOWN", "LEFT", "RIGHT"]);

function isDirection(v: unknown): v is Direction {
  return DIRECTIONS.has(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function count(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function isSaveVersion(v: unknown): v is 1 | 2 | 3 {
  return v === 1 || v === 2 || v === 3;
}

/** The saved player, or null when it is not one. */
function parsePlayer(raw: unknown): SaveData["player"] | null {
  if (!isRecord(raw)) return null;
  const { x, y, dir } = raw;
  if (!finite(x) || !finite(y) || !isDirection(dir)) return null;
  return { x, y, dir };
}

/** Tokens and tickets, upgrading a `v: 1` save; null when either is invalid. */
function parseWallet(o: Record<string, unknown>, v: 1 | 2 | 3): { tokens: number; tickets: number } | null {
  const tokens = v === 1 ? v1Upgrade.tokens : o["tokens"];
  const tickets = v === 1 ? v1Upgrade.tickets : o["tickets"];
  if (!count(tokens) || !count(tickets)) return null;
  return { tokens, tickets };
}

/** Owned prizes; v1 and v2 saves own none. Null when the list is invalid. */
function parsePrizes(o: Record<string, unknown>, v: 1 | 2 | 3): PrizeId[] | null {
  const prizes = v === 3 ? o["prizes"] : [];
  if (!Array.isArray(prizes) || !prizes.every((id): id is PrizeId => isPrizeId(id))) return null;
  return inCatalogueOrder(prizes);
}

/** Validate untrusted JSON (from storage) as a save; null if it is not one. */
export function parseSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  const v = raw["v"];
  const highScore = raw["highScore"];
  if (!isSaveVersion(v) || !finite(highScore) || highScore < 0) return null;
  const player = parsePlayer(raw["player"]);
  if (player === null) return null;
  const wallet = parseWallet(raw, v);
  if (wallet === null) return null;
  const prizes = parsePrizes(raw, v);
  if (prizes === null) return null;
  return { v: 3, highScore, tokens: wallet.tokens, tickets: wallet.tickets, prizes, player };
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
