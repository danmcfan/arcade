// What the Game draws over a frozen minigame (the minigame pause menu, its
// controls panel, and the payout) or over the hub (the prize counter menu).
// They look like the hub pause menu (shared pieces in src/ui/menu.ts),
// centred on the layout.

import { tokenOffer, type Wallet } from "../arcade/prizeCounter.ts";
import type { Surface } from "../engine/surface.ts";
import { drawIcon } from "../ui/hud.ts";
import { iconRects } from "../ui/icons.ts";
import {
  controlsPanelHeight,
  controlsPanelWidth,
  dim,
  drawControlsPanel,
  drawHints,
  drawMenuItems,
  drawPausePanel,
  pausePanelHeight,
  type Hint,
} from "../ui/menu.ts";
import { drawReels } from "../ui/reelText.ts";
import { drawPanel, drawText, drawTextCentered, keyHeight, textHeight, textWidth } from "../ui/text.ts";
import { minigameControls, minigamePauseMenu, prizeCounterItems, prizeCounterTitle, quitGameIndex, quitGameNote, tokenItemIndex } from "./menus.ts";
import type { Payout } from "./payout.ts";
import type { GameMenu } from "./snapshot.ts";
import type { SoftwareName } from "./software.ts";

export interface MenuOverlay {
  menu: GameMenu;
  /** The minigame under the menu; null over the hub. */
  software: SoftwareName | null;
  cursor: number;
  payout: Payout | null;
  /** The player's tokens and tickets, for the prize counter menu. */
  wallet: Wallet;
  tick: number;
  /** The minigame's layout. */
  width: number;
  height: number;
  /** The part of the layout the minigame paints, dimmed behind the panel. */
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
const counterWidth = 168;
const counterHeight = 82;

export function drawMenuOverlay(screen: Surface, o: MenuOverlay): void {
  const { x, y, w, h } = o.playfield;
  dim(screen, x, y, w, h);
  const centre = Math.trunc(o.width / 2);
  const middle = Math.trunc(o.height / 2);
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
      drawControlsPanel(screen, rows, centre - controlsPanelWidth / 2, middle - Math.trunc(controlsPanelHeight(rows.length) / 2));
      return;
    }
    case "payout":
      if (o.payout !== null) drawPayout(screen, o.payout, centre, middle - payoutHeight / 2);
      return;
    case "prizeCounter":
      drawPrizeCounter(screen, o.wallet, o.cursor, o.tick, centre, middle - counterHeight / 2);
      return;
  }
}

/**
 * The prize counter panel, top at `y`: the player's tickets, then the token
 * (greyed out when it can't be bought) and CLOSE.
 */
function drawPrizeCounter(screen: Surface, w: Wallet, cursor: number, tick: number, centre: number, y: number): void {
  drawPanel(screen, centre - counterWidth / 2, y, counterWidth, counterHeight);
  drawTextCentered(screen, prizeCounterTitle, centre, y + 8, "yellow");
  const count = `${w.tickets}`;
  const icon = iconRects.ticket;
  const left = centre - Math.trunc((icon.w + 3 + textWidth(count)) / 2);
  drawIcon(screen, "ticket", left, y + 21 - (icon.h - textHeight) / 2);
  drawText(screen, count, left + icon.w + 3, y + 21, "yellow");
  const offer = tokenOffer(w);
  const greyed = offer === "short" ? [tokenItemIndex] : [];
  drawMenuItems(screen, prizeCounterItems(offer), cursor, y + 37, tick, centre, greyed);
  drawHints(screen, counterHints, y + counterHeight - keyHeight - 6, centre);
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
