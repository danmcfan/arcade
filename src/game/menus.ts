// Labels for the menus the Game draws: the minigame pause menu (each
// minigame's controls panel is in ./minigames.ts), and the prize counter menu
// (a shelf of prizes, then CLOSE) over the hub. (The title scene's menus are in
// src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { prizes, type Prize } from "../arcade/prizes.ts";
import type { Wallet } from "../arcade/wallet.ts";
import type { MenuItem } from "./menu.ts";
import { minigames } from "./minigames.ts";
import type { SoftwareName } from "./software.ts";

/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

export const closeItem = "CLOSE";

/** What the Game does for the minigame pause menu's items. */
export interface MinigamePauseActions {
  resume: () => void;
  controls: () => void;
  quit: () => void;
}

/** The minigame pause menu: Resume, Controls, and Quit game (with NO TICKETS beside it). */
export function minigamePauseItems(a: MinigamePauseActions): MenuItem[] {
  return [
    { label: "RESUME", enabled: true, choose: a.resume },
    { label: "CONTROLS", enabled: true, choose: a.controls },
    { label: "QUIT GAME", note: quitGameNote, enabled: true, choose: a.quit },
  ];
}

/** The cabinets left to right as the hub shows them: the prize shelf's columns. */
export const shelfColumns: readonly SoftwareName[] = minigames
  .toSorted((a, b) => a.hubRect.x - b.hubRect.x)
  .map((m) => m.name);
/** Prizes per shelf column. */
export const shelfRows = 3;

/**
 * The prize shelf, row by row: each column is one cabinet's prizes in
 * reverse catalogue order (the dearest at the top, the cheapest at the
 * bottom). Cursor `row * columns + column` selects a prize; the row below
 * holds CLOSE, under the right column.
 */
export const shelf: readonly Prize[] = Array.from({ length: shelfRows * shelfColumns.length }, (_, i) => {
  const software = shelfColumns[i % shelfColumns.length];
  const found = prizes.filter((p) => p.software === software)[shelfRows - 1 - Math.trunc(i / shelfColumns.length)];
  if (found === undefined) throw new Error(`prize shelf: no prize at cell ${i}`);
  return found;
});

/** The cursor on CLOSE, where the prize counter opens. */
export const closeCursor = shelf.length;

/**
 * Where the prize counter cursor goes from `cursor` (dx, dy: -1, 0 or 1).
 * Up and Down run round a column and CLOSE under the shelf (CLOSE climbs
 * the right column); Left and Right run round a shelf row, and leave CLOSE
 * where it is.
 */
export function moveCounterCursor(cursor: number, dx: number, dy: number): number {
  const cols = shelfColumns.length;
  const onShelf = cursor < shelf.length;
  if (dx !== 0) {
    if (!onShelf) return cursor;
    const row = Math.trunc(cursor / cols);
    return row * cols + (((cursor % cols) + dx + cols) % cols);
  }
  if (dy === 0) return cursor;
  // Rows 0..shelfRows-1 are the shelf, row shelfRows CLOSE.
  const col = onShelf ? cursor % cols : cols - 1;
  const row = onShelf ? Math.trunc(cursor / cols) : shelfRows;
  const next = (row + dy + shelfRows + 1) % (shelfRows + 1);
  return next < shelfRows ? next * cols + col : closeCursor;
}

/**
 * The prize counter menu, in cursor order: the shelf's prizes (each with its
 * price or OWNED, and what it does as its note), then CLOSE. Tokens come
 * from the change machine (src/arcade/changeMachine.ts), not here.
 * Each item asks the Wallet whether it can be bought, and choosing it buys
 * it; an owned prize is inert, so Space on it does nothing.
 */
export function prizeCounterItems(wallet: Wallet, close: () => void): MenuItem[] {
  return [
    ...shelf.map((p) => {
      const owned = wallet.owns(p.id);
      return {
        label: p.name,
        value: owned ? "OWNED" : `${p.price}`,
        note: p.effect,
        enabled: wallet.canBuy(p.id),
        inert: owned,
        choose: (): void => {
          wallet.buy(p.id);
        },
      };
    }),
    { label: closeItem, value: "", note: "BACK TO THE ARCADE", enabled: true, choose: close },
  ];
}
