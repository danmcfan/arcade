// Labels for the menus the Game draws: the minigame pause menu (each
// minigame's controls panel is in ./minigames.ts), and the prize counter menu
// (a shelf of prizes, then BUY TOKEN and CLOSE) over the hub. (The title scene's menus are in
// src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { prizes, type Prize, type PrizeId } from "../arcade/prizes.ts";
import { ticketsPerToken, type TokenOffer } from "../arcade/wallet.ts";
import { minigames } from "./minigames.ts";
import type { SoftwareName } from "./software.ts";

export const minigamePauseMenu = ["RESUME", "CONTROLS", "QUIT GAME"] as const;
/** Index of QUIT GAME in `minigamePauseMenu`. */
export const quitGameIndex = 2;
/** Index of CONTROLS in `minigamePauseMenu`. */
export const controlsIndex = 1;
/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

/** The prize counter's token item for each offer, its label and price; "short" is the normal price, greyed out. */
export const tokenItems: Readonly<Record<TokenOffer, { label: string; value: string }>> = {
  token: { label: "BUY TOKEN", value: `${ticketsPerToken}` },
  lastChance: { label: "LAST CHANCE", value: "ALL" },
  short: { label: "BUY TOKEN", value: `${ticketsPerToken}` },
};

export const closeItem = "CLOSE";

/** The cabinets left to right as the hub shows them: the prize shelf's columns. */
export const shelfColumns: readonly SoftwareName[] = minigames
  .toSorted((a, b) => a.hubRect.x - b.hubRect.x)
  .map((m) => m.name);
/** Prizes per shelf column. */
export const shelfRows = 3;

/**
 * The prize shelf, row by row: each column is one cabinet's prizes in
 * reverse catalogue order (the dearest at the top, the cheapest at the bottom). Cursor `row * columns + column`
 * selects a prize; the row below holds BUY TOKEN then CLOSE.
 */
export const shelf: readonly Prize[] = Array.from({ length: shelfRows * shelfColumns.length }, (_, i) => {
  const software = shelfColumns[i % shelfColumns.length];
  const found = prizes.filter((p) => p.software === software)[shelfRows - 1 - Math.trunc(i / shelfColumns.length)];
  if (found === undefined) throw new Error(`prize shelf: no prize at cell ${i}`);
  return found;
});
/** Where cursor `i` sits on the shelf: its row and column, and the prize there. */
export function shelfCell(i: number): { row: number; col: number; prize: Prize } {
  const prize = shelf[i];
  if (prize === undefined) throw new Error(`prize shelf: no cell ${i}`);
  return { row: Math.trunc(i / shelfColumns.length), col: i % shelfColumns.length, prize };
}

/** The cursor on BUY TOKEN, where the prize counter opens. */
export const tokenCursor = shelf.length;
/** The cursor on CLOSE. */
export const closeCursor = shelf.length + 1;

/** What the prize counter cursor is on. */
export type CounterSlot = { prize: Prize } | "token" | "close";

export function counterSlot(cursor: number): CounterSlot {
  if (cursor === tokenCursor) return "token";
  if (cursor === closeCursor) return "close";
  const prize = shelf[cursor];
  if (prize === undefined) throw new Error(`prize counter: no item at cursor ${cursor}`);
  return { prize };
}

/** What SPACE buys on `slot`; null on CLOSE. */
export function counterBuyId(slot: CounterSlot): "token" | PrizeId | null {
  if (slot === "close") return null;
  return slot === "token" ? "token" : slot.prize.id;
}

/**
 * Where the prize counter cursor goes from `cursor` (dx, dy: -1, 0 or 1).
 * Up and Down run round a column and the token row under it (BUY TOKEN under
 * the left and middle columns, CLOSE under the right); Left and Right run
 * round a shelf row, or between BUY TOKEN and CLOSE.
 */
export function moveCounterCursor(cursor: number, dx: number, dy: number): number {
  const cols = shelfColumns.length;
  const onShelf = cursor < shelf.length;
  if (dx !== 0) {
    if (!onShelf) return cursor === tokenCursor ? closeCursor : tokenCursor;
    const row = Math.trunc(cursor / cols);
    return row * cols + (((cursor % cols) + dx + cols) % cols);
  }
  if (dy === 0) return cursor;
  // Rows 0..shelfRows-1 are the shelf, row shelfRows the token row.
  const col = onShelf ? cursor % cols : cursor === tokenCursor ? 0 : cols - 1;
  const row = onShelf ? Math.trunc(cursor / cols) : shelfRows;
  const next = (row + dy + shelfRows + 1) % (shelfRows + 1);
  if (next < shelfRows) return next * cols + col;
  return col === cols - 1 ? closeCursor : tokenCursor;
}
