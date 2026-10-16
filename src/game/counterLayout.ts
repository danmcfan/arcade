// Where everything in the prize counter menu goes, from the area it fills: the
// panel, a card per shelf cell, the CLOSE row and the info panel. The game
// draws from it (src/game/overlay.ts), and so does the pixel preview's prize
// counter scene (scripts/pixel-scenes.ts).

import { textHeight } from "../ui/text.ts";
import { tickerGlyphHeight } from "../ui/tickerArt.ts";
import { shelf, shelfColumns, shelfRows } from "./menus.ts";

/** The tallest picture a prize card holds. */
export const pictureHeight = 12;
/** Room above a card's picture and below its price, inside its frame's 2 px edge. */
export const cardTop = 2;
const cardBottom = 3;
/** A prize card: its picture over its price, in the scoreboard's letters (src/ui/tickerArt.ts). */
export const cardWidth = 40;
export const cardHeight = cardTop + pictureHeight + 1 + tickerGlyphHeight + cardBottom;
/** A card's price, from its top. */
export const cardPriceY = cardTop + pictureHeight + 1;

export interface CounterLayout {
  panel: { x: number; y: number; w: number; h: number };
  /** Each shelf cell's card's top left, in shelf order. */
  cards: { x: number; y: number }[];
  /** The CLOSE row: its top, and CLOSE's centre. */
  rowY: number;
  closeCentre: number;
  /** The info panel's first line: its top, and its left and right text edges. */
  infoTop: number;
  infoLeft: number;
  infoRight: number;
}

/**
 * The menu filling `area` but for a 1-2 px border. Five rows (three of cards,
 * CLOSE, the info panel) sit inside the panel's 3 px frame, with six even gaps.
 */
export function counterLayout(area: { x: number; y: number; w: number; h: number }): CounterLayout {
  const x = area.x + 2;
  const y = area.y + 1;
  const width = area.w - 4;
  const height = area.h - 2;
  const infoHeight = 2 * textHeight + 2;
  const inner = height - 6;
  const gap = Math.trunc((inner - shelfRows * cardHeight - textHeight - infoHeight) / 6);
  const top = y + 3 + Math.trunc((inner - shelfRows * cardHeight - textHeight - infoHeight - 6 * gap) / 2) + gap;
  const cols = shelfColumns.length;
  const colGap = Math.trunc((width - 6 - cols * cardWidth) / (cols + 1));
  const left = x + 3 + Math.trunc((width - 6 - cols * cardWidth - (cols + 1) * colGap) / 2) + colGap;
  const cards = shelf.map((_, i) => ({
    x: left + (i % cols) * (cardWidth + colGap),
    y: top + Math.trunc(i / cols) * (cardHeight + gap),
  }));
  const rowY = top + shelfRows * cardHeight + (shelfRows - 1) * gap + gap;
  return {
    panel: { x, y, w: width, h: height },
    cards,
    rowY,
    closeCentre: left + (cols - 1) * (cardWidth + colGap) + cardWidth / 2,
    infoTop: rowY + textHeight + gap,
    infoLeft: x + 7,
    infoRight: x + width - 7,
  };
}
