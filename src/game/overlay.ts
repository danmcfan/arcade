// What the Game draws over a frozen minigame (the minigame pause menu, its
// controls panel, and the payout) or over the hub (the prize counter menu).
// They look like the hub pause menu (shared pieces in src/ui/menu.ts),
// centred on the minigame's playfield; the prize counter menu fills the hub's playfield
// under the scoreboard, inside the 160x144 frame (#72).

import { prizes } from "../arcade/prizes.ts";
import { type PrizeOffer, type TokenOffer, type Wallet } from "../arcade/wallet.ts";
import type { Surface } from "../engine/surface.ts";
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
import { sweetie } from "../ui/sweetie16.ts";
import { drawPanel, drawText, drawTextCentered, keyHeight, textHeight, textWidth, type Ink } from "../ui/text.ts";
import {
  closeCursor,
  closeItem,
  counterSlot,
  minigamePauseMenu,
  quitGameIndex,
  quitGameNote,
  shelf,
  shelfCell,
  shelfColumns,
  shelfRows,
  tokenCursor,
  tokenItems,
  type CounterSlot,
} from "./menus.ts";
import { minigame } from "./minigames.ts";
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
      const rows = minigame(o.software).controls;
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

/** Each shelf column's width; the shelf is centred in the panel. */
const shelfColumnWidth = 52;
/** Each shelf row's height: a picture, its price under it. */
const shelfRowHeight = 23;
/** The tallest picture a shelf cell holds. */
const pictureHeight = 12;

/** What each token offer does, for the info panel. */
const tokenEffects: Readonly<Record<TokenOffer, string>> = {
  token: "ONE PLAY ON A CABINET",
  lastChance: "ALL TICKETS FOR 1 TOKEN",
  short: "ONE PLAY ON A CABINET",
};

/** The info panel's lines for what the cursor is on: a name, a price, what it does. */
function counterInfo(slot: CounterSlot, token: TokenOffer): { name: string; price: string; effect: string } {
  if (slot === "close") return { name: closeItem, price: "", effect: "BACK TO THE ARCADE" };
  if (slot === "token") {
    const { label, value } = tokenItems[token];
    return { name: label, price: value, effect: tokenEffects[token] };
  }
  return { name: slot.prize.name, price: `${slot.prize.price}`, effect: slot.prize.effect };
}

/** The gap between the shelf, the BUY TOKEN row and the info panel. */
const sectionGap = 6;

/**
 * The prize counter panel, filling `area` but for a 1-2 px border, with its
 * contents centred in it: the prize shelf (a column per cabinet, each picture
 * over its price: red when the player is short, OWNED and the picture greyed
 * out once bought), BUY TOKEN and CLOSE under it, and an info panel for what
 * the cursor is on. The tickets show in the HUD, so the panel doesn't repeat them.
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
  drawPanel(screen, x, y, width, height);

  const infoHeight = 2 * textHeight + 2;
  const contentHeight = shelfRows * shelfRowHeight + sectionGap + textHeight + sectionGap + infoHeight;
  const offers = w.counter();
  const cols = shelfColumns.length;
  const shelfLeft = x + Math.trunc((width - cols * shelfColumnWidth) / 2);
  const shelfTop = y + Math.trunc((height - contentHeight) / 2);
  for (let i = 0; i < shelf.length; i++) {
    const { row, col, prize: p } = shelfCell(i);
    const centre = shelfLeft + col * shelfColumnWidth + shelfColumnWidth / 2;
    const top = shelfTop + row * shelfRowHeight;
    const offer = offers.prizes[prizes.indexOf(p)];
    if (offer === undefined) throw new Error(`prize counter: no offer for ${p.id}`);
    const picture = offer === "owned" ? p.greySprite : p.sprite;
    const px = centre - Math.trunc(picture.w / 2);
    const py = top + pictureHeight - picture.h;
    screen.draw(picture, px, py);
    const label = offer === "owned" ? "OWNED" : `${p.price}`;
    drawTextCentered(screen, label, centre, top + pictureHeight + 2, priceInk[offer]);
    if (i === cursor) drawCellCursor(screen, centre - 18, top - 2, 36, pictureHeight + textHeight + 6, tick);
  }

  const rowY = shelfTop + shelfRows * shelfRowHeight + sectionGap;
  const token = tokenItems[offers.token];
  const tokenGrey = offers.token === "short";
  const tokenCentre = shelfLeft + shelfColumnWidth;
  const closeCentre = shelfLeft + (cols - 0.5) * shelfColumnWidth;
  drawRowItem(screen, token.label, tokenCentre, rowY, cursor === tokenCursor, tokenGrey, tick);
  drawRowItem(screen, closeItem, closeCentre, rowY, cursor === closeCursor, false, tick);

  const infoTop = rowY + textHeight + sectionGap;
  const info = counterInfo(counterSlot(cursor), offers.token);
  drawText(screen, info.name, x + 7, infoTop, "white");
  drawText(screen, info.price, x + width - 7 - textWidth(info.price), infoTop, "white");
  drawText(screen, info.effect, x + 7, infoTop + textHeight + 2, "white");
}

/** A shelf price's ink: yellow, red when the player is short, grey once owned. */
const priceInk: Readonly<Record<PrizeOffer, Ink>> = { buy: "yellow", short: "red", owned: "grey" };

/** The shelf cursor: yellow corner brackets round a cell, pulsing out a pixel with the menu arrows. */
function drawCellCursor(screen: Surface, x: number, y: number, w: number, h: number, tick: number): void {
  const o = Math.min(1, arrowOffset(tick));
  const [l, t, r, b] = [x - o, y - o, x + w - 1 + o, y + h - 1 + o];
  const ink = sweetie.y;
  for (const [cx, cy, dx, dy] of [
    [l, t, 1, 1],
    [r, t, -1, 1],
    [l, b, 1, -1],
    [r, b, -1, -1],
  ] as const) {
    screen.fillRect(Math.min(cx, cx + dx * 2), cy, 3, 1, ink);
    screen.fillRect(cx, Math.min(cy, cy + dy * 2), 1, 3, ink);
  }
}

/** BUY TOKEN or CLOSE centred on `centre`: yellow after an arrow when selected, grey when it can't be chosen. */
function drawRowItem(
  screen: Surface,
  label: string,
  centre: number,
  y: number,
  selected: boolean,
  grey: boolean,
  tick: number,
): void {
  drawTextCentered(screen, label, centre, y, grey ? "grey" : selected ? "yellow" : "white");
  if (selected) {
    const left = centre - Math.trunc(textWidth(label) / 2);
    drawText(screen, ">", left - 8 + arrowOffset(tick) - 1, y, "yellow");
  }
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
