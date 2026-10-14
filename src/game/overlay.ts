// What the Game draws over a frozen minigame (the minigame pause menu, its
// controls panel, and the payout) or over the hub (the prize counter menu).
// They look like the hub pause menu (shared pieces in src/ui/menu.ts),
// centred on the minigame's playfield; the prize counter menu fills the hub's playfield
// under the scoreboard, inside the 160x144 frame (#72).

import type { Wallet } from "../arcade/wallet.ts";
import type { Surface } from "../engine/surface.ts";
import { drawIcon } from "../ui/hud.ts";
import { iconRects } from "../ui/icons.ts";
import {
  controlsPanelHeight,
  controlsPanelWidth,
  dim,
  drawControlsPanel,
  drawHints,
  arrowOffset,
  drawPausePanel,
  pausePanelHeight,
  type Hint,
} from "../ui/menu.ts";
import { drawReels } from "../ui/reelText.ts";
import { drawPanel, drawText, drawTextCentered, keyHeight, textHeight, textWidth } from "../ui/text.ts";
import {
  firstPrizeIndex,
  minigameControls,
  minigamePauseMenu,
  prizeCounterItems,
  prizeCounterTitle,
  quitGameIndex,
  quitGameNote,
  tokenItemIndex,
} from "./menus.ts";
import type { Payout } from "./payout.ts";
import type { GameMenu } from "./snapshot.ts";
import type { SoftwareName } from "./software.ts";

export interface MenuOverlay {
  menu: GameMenu;
  /** The minigame under the menu; null over the hub. */
  software: SoftwareName | null;
  cursor: number;
  payout: Payout | null;
  /** The player's wallet, for the prize counter menu. */
  wallet: Wallet;
  tick: number;
  /** The part of the layout the minigame paints: dimmed, with the panel centred on it. */
  playfield: { x: number; y: number; w: number; h: number };
}

export const payoutTitle = "PAYOUT";
export const freePlayLine = "FREE PLAY: 0 TICKETS";
export const skipHints: readonly Hint[] = [{ keys: ["SPACE"], label: "SKIP" }];
export const closeHints: readonly Hint[] = [{ keys: ["SPACE"], label: "OK" }];

const payoutWidth = 152;
const payoutHeight = 74;

export const counterHints: readonly Hint[] = [
  { keys: ["SPACE"], label: "OK" },
  { keys: ["ESC"], label: "BACK" },
];
/** Items the prize counter shows at once; the list scrolls to keep the cursor in view. */
export const counterVisibleItems = 7;
/** Space between item rows. */
const counterRowHeight = 10;

export function drawMenuOverlay(screen: Surface, o: MenuOverlay): void {
  const { x, y, w, h } = o.playfield;
  dim(screen, x, y, w, h);
  const centre = x + Math.trunc(w / 2);
  const middle = y + Math.trunc(h / 2);
  switch (o.menu) {
    case "paused":
      drawPausePanel(screen, minigamePauseMenu, o.cursor, o.tick, centre, middle - pausePanelHeight / 2, {
        item: quitGameIndex,
        text: quitGameNote,
        ink: "orange",
      });
      return;
    case "controls": {
      if (o.software === null) return;
      const rows = minigameControls[o.software];
      drawControlsPanel(
        screen,
        rows,
        centre - controlsPanelWidth / 2,
        middle - Math.trunc(controlsPanelHeight(rows.length) / 2),
      );
      return;
    }
    case "payout":
      if (o.payout !== null) drawPayout(screen, o.payout, centre, middle - payoutHeight / 2);
      return;
    case "prizeCounter":
      drawPrizeCounter(screen, o.wallet, o.cursor, o.tick, o.playfield);
  }
}

/** The first item shown when `cursor` is selected in a list of `n`: the cursor kept in the middle where it can be. */
export function counterWindowStart(cursor: number, n: number): number {
  const half = Math.trunc(counterVisibleItems / 2);
  return Math.max(0, Math.min(cursor - half, n - counterVisibleItems));
}

/**
 * The prize counter panel, filling `area` but for a 1-2 px border: the
 * player's tickets, then a scrolling list of the token, the prizes (each
 * greyed out when it can't be bought, owned ones read OWNED) and CLOSE, names
 * on the left and prices on the right, and the key hints.
 */
function drawPrizeCounter(
  screen: Surface,
  w: Wallet,
  cursor: number,
  tick: number,
  area: { x: number; y: number; w: number; h: number },
): void {
  const x = area.x + 2;
  const y = area.y + 1;
  const width = area.w - 4;
  const height = area.h - 2;
  const centre = x + Math.trunc(width / 2);
  drawPanel(screen, x, y, width, height);
  drawTextCentered(screen, prizeCounterTitle, centre, y + 6, "yellow");
  const count = `${w.tickets}`;
  const icon = iconRects.ticket;
  const left = centre - Math.trunc((icon.w + 3 + textWidth(count)) / 2);
  drawIcon(screen, "ticket", left, y + 17 - (icon.h - textHeight) / 2);
  drawText(screen, count, left + icon.w + 3, y + 17, "yellow");
  const offers = w.counter();
  const greyed = new Set(offers.token === "short" ? [tokenItemIndex] : []);
  offers.prizes.forEach((o, i) => {
    if (o !== "buy") greyed.add(firstPrizeIndex + i);
  });
  const items = prizeCounterItems(offers);
  const start = counterWindowStart(cursor, items.length);
  const top = y + 31;
  const nameX = x + 14;
  const valueRight = x + width - 16;
  items.slice(start, start + counterVisibleItems).forEach((item, row) => {
    const i = start + row;
    const rowY = top + row * counterRowHeight;
    const grey = greyed.has(i);
    const ink = grey ? "grey" : i === cursor ? "yellow" : "white";
    drawText(screen, item.label, nameX, rowY, ink);
    drawText(screen, item.value, valueRight - textWidth(item.value), rowY, grey ? "grey" : "yellow");
    if (i === cursor) drawText(screen, ">", x + 5 + arrowOffset(tick) - 1, rowY, "yellow");
  });
  // More items above or below the window.
  const arrowX = x + width - 10;
  if (start > 0) drawText(screen, "↑", arrowX, top, "grey");
  if (start + counterVisibleItems < items.length) {
    drawText(screen, "↓", arrowX, top + (counterVisibleItems - 1) * counterRowHeight, "grey");
  }
  drawHints(screen, counterHints, y + height - keyHeight - 5, centre);
}

/** The payout panel, top at `y`: the score spinning down, the tickets spinning up, and a key hint. */
function drawPayout(screen: Surface, p: Payout, centre: number, y: number): void {
  const left = centre - payoutWidth / 2;
  const right = left + payoutWidth - 12;
  drawPanel(screen, left, y, payoutWidth, payoutHeight);
  drawTextCentered(screen, payoutTitle, centre, y + 8, "yellow");
  drawText(screen, "SCORE", left + 12, y + 24, "white");
  drawReels(screen, p.scoreReels, right, y + 24, "white");
  if (p.freePlay) {
    drawTextCentered(screen, freePlayLine, centre, y + 38, "orange");
  } else {
    drawText(screen, "TICKETS", left + 12, y + 38, "white");
    drawReels(screen, p.ticketReels, right, y + 38, "yellow");
  }
  drawHints(screen, p.counting ? skipHints : closeHints, y + payoutHeight - keyHeight - 6, centre);
}
