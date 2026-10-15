// Labels for the menus the Game draws: the minigame pause menu (each
// minigame's controls panel is in ./minigames.ts), and the prize counter menu
// (a shelf of prizes, then BUY TOKEN and CLOSE) over the hub. (The title scene's menus are in
// src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { prizes, type Prize } from "../arcade/prizes.ts";
import { ticketsPerToken, type TokenOffer, type Wallet } from "../arcade/wallet.ts";
import type { MenuItem } from "./menu.ts";
import { minigames } from "./minigames.ts";
import type { SoftwareName } from "./software.ts";

/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

/** The token item for each offer: its label, price and what it does; "short" is the normal price, greyed out. */
const tokenItems: Readonly<Record<TokenOffer, { label: string; value: string; note: string }>> = {
  token: { label: "BUY TOKEN", value: `${ticketsPerToken}`, note: "ONE PLAY ON A CABINET" },
  lastChance: { label: "LAST CHANCE", value: "ALL", note: "ALL TICKETS FOR 1 TOKEN" },
  short: { label: "BUY TOKEN", value: `${ticketsPerToken}`, note: "ONE PLAY ON A CABINET" },
};

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
 * holds BUY TOKEN then CLOSE.
 */
export const shelf: readonly Prize[] = Array.from({ length: shelfRows * shelfColumns.length }, (_, i) => {
  const software = shelfColumns[i % shelfColumns.length];
  const found = prizes.filter((p) => p.software === software)[shelfRows - 1 - Math.trunc(i / shelfColumns.length)];
  if (found === undefined) throw new Error(`prize shelf: no prize at cell ${i}`);
  return found;
});

/** The cursor on BUY TOKEN, where the prize counter opens. */
export const tokenCursor = shelf.length;
/** The cursor on CLOSE. */
export const closeCursor = shelf.length + 1;

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

/**
 * The prize counter menu, in cursor order: the shelf's prizes (each with its
 * price or OWNED, and what it does as its note), then BUY TOKEN and CLOSE.
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
    {
      ...tokenItems[wallet.counter().token],
      enabled: wallet.canBuy("token"),
      choose: (): void => {
        wallet.buy("token");
      },
    },
    { label: closeItem, value: "", note: "BACK TO THE ARCADE", enabled: true, choose: close },
  ];
}
