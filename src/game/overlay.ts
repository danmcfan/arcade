// What the Game draws over a frozen minigame (the minigame pause menu, its
// controls panel, and the payout) or over the hub (the prize counter menu).
// They look like the hub pause menu (shared pieces in src/ui/menu.ts),
// centred on the minigame's playfield; the prize counter menu fills the hub's playfield
// under the scoreboard, inside the 160x144 frame (#72).

import type { Surface } from "../engine/surface.ts";
import {
  controlsPanelHeight,
  controlsPanelWidth,
  dim,
  drawControlsPanel,
  arrowOffset,
  drawPausePanel,
  pausePanelHeight,
  pauseNote,
} from "../ui/menu.ts";
import { drawReels } from "../ui/reelText.ts";
import { sweetie } from "../ui/sweetie16.ts";
import { drawPanel, drawText, drawTextCentered, textHeight, textWidth, type Ink } from "../ui/text.ts";
import type { Menu, MenuItem } from "./menu.ts";
import { closeCursor, shelf, shelfColumns, shelfRows, tokenCursor } from "./menus.ts";
import { minigame } from "./minigames.ts";
import type { Payout } from "./payout.ts";
import type { GameMenu } from "./snapshot.ts";
import type { SoftwareName } from "./software.ts";

export interface MenuOverlay {
  menu: GameMenu;
  /** The minigame under the menu; null over the hub. */
  software: SoftwareName | null;
  /** The pause or prize counter menu; null for the payout. */
  list: Menu | null;
  payout: Payout | null;
  tick: number;
  /** The part of the layout the minigame paints: dimmed, with the panel centred on it. */
  playfield: { x: number; y: number; w: number; h: number };
}

export const payoutTitle = "PAYOUT";
export const freePlayLine = "FREE PLAY: 0 TICKETS";

const payoutWidth = 152;
const payoutHeight = 54;

export function drawMenuOverlay(screen: Surface, o: MenuOverlay): void {
  const { x, y, w, h } = o.playfield;
  dim(screen, x, y, w, h);
  const centre = x + Math.trunc(w / 2);
  const middle = y + Math.trunc(h / 2);
  switch (o.menu) {
    case "paused": {
      if (o.list === null) return;
      const items = o.list.items();
      drawPausePanel(
        screen,
        items.map((i) => i.label),
        o.list.cursor,
        o.tick,
        centre,
        middle - Math.trunc(pausePanelHeight(items.length) / 2),
        pauseNote(items),
      );
      return;
    }
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
      if (o.list !== null) drawPrizeCounter(screen, o.list, o.tick, o.playfield);
  }
}

/** The tallest picture a prize card holds. */
const pictureHeight = 12;
/** A prize card: its picture over its price, inside a 1 px border. */
const cardWidth = 42;
const cardHeight = 2 + pictureHeight + 1 + textHeight + 2;

/**
 * The prize counter panel, filling `area` but for a 1-2 px border: the prize
 * shelf (a card per prize, a column per cabinet; a card is red when the
 * player is short, grey and reading OWNED once bought, and lit up when
 * selected), BUY TOKEN and CLOSE under it, and an info panel for what the
 * cursor is on. The tickets show on the scoreboard, so the panel doesn't
 * repeat them. The rows sit at even gaps down the panel.
 */
function drawPrizeCounter(
  screen: Surface,
  menu: Menu,
  tick: number,
  area: { x: number; y: number; w: number; h: number },
): void {
  const { cursor } = menu;
  const items = menu.items();
  const item = (i: number): MenuItem => {
    const found = items[i];
    if (found === undefined) throw new Error(`prize counter: no item at ${i}`);
    return found;
  };
  const x = area.x + 2;
  const y = area.y + 1;
  const width = area.w - 4;
  const height = area.h - 2;
  drawPanel(screen, x, y, width, height);

  // Five rows (three of cards, BUY TOKEN, the info panel) inside the 3 px frame, with six even gaps.
  const infoHeight = 2 * textHeight + 2;
  const inner = height - 6;
  const gap = Math.trunc((inner - shelfRows * cardHeight - textHeight - infoHeight) / 6);
  const top = y + 3 + Math.trunc((inner - shelfRows * cardHeight - textHeight - infoHeight - 6 * gap) / 2) + gap;

  const cols = shelfColumns.length;
  const colGap = Math.trunc((width - 6 - cols * cardWidth) / (cols + 1));
  const left = x + 3 + Math.trunc((width - 6 - cols * cardWidth - (cols + 1) * colGap) / 2) + colGap;
  for (let i = 0; i < shelf.length; i++) {
    const p = shelf[i];
    if (p === undefined) throw new Error(`prize shelf: no cell ${i}`);
    const [row, col] = [Math.trunc(i / cols), i % cols];
    const it = item(i);
    const offer = cardOffer(it);
    const cx = left + col * (cardWidth + colGap);
    const cy = top + row * (cardHeight + gap);
    const look = cardLooks[offer];
    const selected = i === cursor;
    screen.fillRect(cx, cy, cardWidth, cardHeight, selected ? look.border : look.edge);
    screen.fillRect(cx + 1, cy + 1, cardWidth - 2, cardHeight - 2, selected ? look.lit : look.fill);
    const centre = cx + cardWidth / 2;
    const picture = offer === "owned" ? p.greySprite : p.sprite;
    screen.draw(picture, centre - Math.trunc(picture.w / 2), cy + 2 + pictureHeight - picture.h);
    drawTextCentered(screen, it.value ?? "", centre, cy + 2 + pictureHeight + 1, look.ink);
  }

  const rowY = top + shelfRows * cardHeight + (shelfRows - 1) * gap + gap;
  const token = item(tokenCursor);
  const tokenGrey = !token.enabled;
  const tokenCentre = left + cardWidth + colGap / 2;
  const closeCentre = left + (cols - 1) * (cardWidth + colGap) + cardWidth / 2;
  drawRowItem(screen, token.label, tokenCentre, rowY, cursor === tokenCursor, tokenGrey, tick);
  drawRowItem(screen, item(closeCursor).label, closeCentre, rowY, cursor === closeCursor, false, tick);

  const infoTop = rowY + textHeight + gap;
  const info = item(cursor);
  const price = info.value ?? "";
  drawText(screen, info.label, x + 7, infoTop, "white");
  drawText(screen, price, x + width - 7 - textWidth(price), infoTop, "white");
  drawText(screen, info.note ?? "", x + 7, infoTop + textHeight + 2, "white");
}

/** How a prize card looks: owned (inert), too dear (disabled), or for sale. */
type CardOffer = "buy" | "short" | "owned";

function cardOffer(i: MenuItem): CardOffer {
  if (i.inert === true) return "owned";
  return i.enabled ? "buy" : "short";
}

/**
 * A prize card's colours by offer: its edge and fill, and the yellow-edged,
 * brighter fill it takes when selected; and its price's ink.
 */
const cardLooks: Readonly<Record<CardOffer, { edge: string; fill: string; border: string; lit: string; ink: Ink }>> = {
  buy: { edge: sweetie.m, fill: sweetie.n, border: sweetie.y, lit: sweetie.b, ink: "yellow" },
  short: { edge: sweetie.r, fill: sweetie.p, border: sweetie.y, lit: sweetie.r, ink: "white" },
  owned: { edge: sweetie.m, fill: sweetie.d, border: sweetie.y, lit: sweetie.m, ink: "blue" },
};

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

/** The payout panel, top at `y`: the score spinning down, the tickets spinning up. */
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
}
