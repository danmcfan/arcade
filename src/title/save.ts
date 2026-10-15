// The save behind "Continue": the player's high score on each machine, tokens, tickets and owned
// prizes, and where the player stood. Minigame progress is not saved. The title scene talks to a `SaveStore`
// so it stays DOM-free (D12); main.ts passes `localStorageStore()`, tests
// pass `memoryStore()`.

import type { Direction } from "../engine/input.ts";
import { isPrizeId, type PrizeId } from "../arcade/prizes.ts";
import { noHighScores, startingTokens, Wallet, type HighScores } from "../arcade/wallet.ts";
import type { Progress } from "../game/game.ts";

export interface SaveData extends Progress {
  /**
   * Format version. Older saves are upgraded on load: `v: 1` (no tokens,
   * tickets or prizes), `v: 2` (no prizes) and `v: 3`. Before `v: 4` every
   * machine shared one `highScore`; no one machine can claim it, so it is
   * dropped and each machine starts at 0. Any other `v` is ignored.
   */
  v: 4;
}

/** The current format version. */
export const saveVersion = 4;

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

function highScores(v: unknown): HighScores | null {
  if (!isRecord(v)) return null;
  const { sweetSam, firefly, brassMonkey } = v;
  if (!score(sweetSam) || !score(firefly) || !score(brassMonkey)) return null;
  return { sweetSam, firefly, brassMonkey };
}

function score(v: unknown): v is number {
  return finite(v) && v >= 0;
}

/** Validate untrusted JSON (from storage) as a save; null if it is not one. */
export function parseSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  const o = raw;
  const v = o["v"];
  if (v !== 1 && v !== 2 && v !== 3 && v !== 4) return null;
  const scores = v === 4 ? highScores(o["highScores"]) : noHighScores;
  if (scores === null) return null;
  const p = o["player"];
  if (!isRecord(p)) return null;
  const dir = p["dir"];
  if (!finite(p["x"]) || !finite(p["y"]) || !isDirection(dir)) return null;
  const tokens = v === 1 ? v1Upgrade.tokens : o["tokens"];
  const tickets = v === 1 ? v1Upgrade.tickets : o["tickets"];
  if (!count(tokens) || !count(tickets)) return null;
  // v1 and v2 saves own no prizes.
  const prizes = v >= 3 ? o["prizes"] : [];
  if (!Array.isArray(prizes) || !prizes.every((id): id is PrizeId => isPrizeId(id))) return null;
  const wallet = new Wallet({ highScores: scores, tokens, tickets, prizes });
  return {
    v: 4,
    ...wallet.toProgress(),
    player: { x: p["x"], y: p["y"], dir },
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
