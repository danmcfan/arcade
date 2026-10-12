// The "needs a keyboard" notice main.ts shows in place of the game on a
// touch-first device (src/engine/device.ts). Pixel art like every other
// screen (ADR 0006): the logo, then the font in the Sweetie 16 palette, on
// its own small canvas that main.ts integer-scales like the game's.

import { imageLogo } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { drawTextCentered, type Ink } from "./text.ts";

/** Logical size of the notice. */
export const noticeWidth = 160;
export const noticeHeight = 120;
const background = "#1a1c2c";
const centre = noticeWidth / 2;

/** The site address, as plain text (no link or copy button). */
export const siteAddress = "ARCADE.DANNYOBRIEN.DEV";

/** The text under the logo: `[text, ink, top]`. The logo reads as the sentence's first word. */
export const noticeLines: readonly (readonly [string, Ink, number])[] = [
  ["NEEDS A KEYBOARD.", "yellow", 40],
  ["VISIT ON A DESKTOP", "white", 62],
  ["COMPUTER TO PLAY.", "white", 72],
  [siteAddress, "blue", 94],
];

export function drawNotice(screen: Surface): void {
  screen.fillRect(0, 0, noticeWidth, noticeHeight, background);
  screen.draw(imageLogo, centre - Math.trunc(imageLogo.w / 2), 16);
  for (const [text, ink, y] of noticeLines) drawTextCentered(screen, text, centre, y, ink);
}
