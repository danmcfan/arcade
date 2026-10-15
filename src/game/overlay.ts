// What the Game draws over a frozen minigame (the minigame pause menu, its
// controls panel, and the payout) or over the hub (the prize counter menu).
// They look like the hub pause menu (shared pieces in src/ui/menu.ts),
// centred on the minigame's playfield; the prize counter menu fills the hub's playfield
// under the scoreboard, inside the 160x144 frame (#72).

import { imageCards } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawNineSlice } from "../ui/nineSlice.ts";
import { cardCorner, cardRects, type CardLook } from "../ui/panelArt.ts";
import { drawTickerTextCentered } from "../arcade/ticker.ts";
import type { TickerInk } from "../ui/tickerArt.ts";
import { cardHeight, cardPriceY, cardTop, cardWidth, counterLayout, pictureHeight } from "./counterLayout.ts";
import {
  controlsPanelHeight,
  controlsPanelWidth,
  dim,
  drawControlsPanel,
  drawHints,
  arrowOffset,
  drawPausePanel,
  pausePanelHeight,
  pauseNote,
  type Hint,
} from "../ui/menu.ts";
import { drawReels } from "../ui/reelText.ts";
import { drawPanel, drawText, drawTextCentered, keyHeight, textHeight, textWidth } from "../ui/text.ts";
import type { Menu, MenuItem } from "./menu.ts";
import { closeCursor, shelf, tokenCursor } from "./menus.ts";
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

/**
 * The prize counter panel, filling `area` but for a 1-2 px border: the prize
 * shelf (a card per prize, a column per cabinet; a card is red when the
 * player is short, grey and reading OWNED once bought, and ringed when
 * selected), BUY TOKEN and CLOSE under it, and an info panel for what the
 * cursor is on. The tickets show on the scoreboard, so the panel doesn't
 * repeat them. Where each goes is `counterLayout`; the frames are
 * src/ui/panelArt.ts.
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
  const layout = counterLayout(area);
  const { panel } = layout;
  drawPanel(screen, panel.x, panel.y, panel.w, panel.h);

  layout.cards.forEach((card, i) => {
    const p = shelf[i];
    if (p === undefined) throw new Error(`prize shelf: no cell ${i}`);
    const it = item(i);
    const offer = cardOffer(it);
    drawCard(screen, offer, card.x, card.y);
    if (i === cursor) drawCard(screen, "cursor", card.x, card.y);
    const centre = card.x + cardWidth / 2;
    const picture = offer === "owned" ? p.greySprite : p.sprite;
    screen.draw(picture, centre - Math.trunc(picture.w / 2), card.y + cardTop + pictureHeight - picture.h);
    drawTickerTextCentered(screen, it.value ?? "", cardInks[offer], centre, card.y + cardPriceY);
  });

  const token = item(tokenCursor);
  drawRowItem(screen, token.label, layout.tokenCentre, layout.rowY, cursor === tokenCursor, !token.enabled, tick);
  drawRowItem(screen, item(closeCursor).label, layout.closeCentre, layout.rowY, cursor === closeCursor, false, tick);

  const info = item(cursor);
  const price = info.value ?? "";
  drawText(screen, info.label, layout.infoLeft, layout.infoTop, "white");
  drawText(screen, price, layout.infoRight - textWidth(price), layout.infoTop, "white");
  drawText(screen, info.note ?? "", layout.infoLeft, layout.infoTop + textHeight + 2, "white");
}

/** A card frame from cards.png, at the card size. */
function drawCard(screen: Surface, look: CardLook, x: number, y: number): void {
  const r = cardRects[look];
  const frame = sub(imageCards, r.x, 0, r.x + r.w, r.h);
  drawNineSlice(screen, frame, cardCorner, x, y, cardWidth, cardHeight);
}

/** How a prize card looks: owned (inert), too dear (disabled), or for sale. */
type CardOffer = "buy" | "short" | "owned";

function cardOffer(i: MenuItem): CardOffer {
  if (i.inert === true) return "owned";
  return i.enabled ? "buy" : "short";
}

/** A card's price ink, by offer. */
export const cardInks: Readonly<Record<CardOffer, TickerInk>> = { buy: "yellow", short: "white", owned: "pale" };

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
