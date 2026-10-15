// The "needs a keyboard" notice main.ts shows in place of the game on a
// touch-first device (src/engine/device.ts). Pixel art like every other
// screen (ADR 0006): the logo, then the font in the Sweetie 16 palette, on
// its own small canvas that main.ts integer-scales like the game's.

import { imageTitleLogo } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { drawTextCentered, type Ink } from "./text.ts";

/** Logical size of the notice. */
export const noticeWidth = 192;
export const noticeHeight = 144;
const background = "#1a1c2c";
const centre = noticeWidth / 2;

/** The site address, as plain text (no link or copy button). */
export const siteAddress = "ARCADE.DANNYOBRIEN.DEV";

/** The text under the logo: `[text, ink, top]`. The logo reads as the sentence's first word. */
export const noticeLines: readonly (readonly [string, Ink, number])[] = [
  ["NEEDS A KEYBOARD.", "yellow", 82],
  ["VISIT ON A DESKTOP", "white", 100],
  ["COMPUTER TO PLAY.", "white", 110],
  [siteAddress, "blue", 128],
];

export function drawNotice(screen: Surface): void {
  screen.fillRect(0, 0, noticeWidth, noticeHeight, background);
  screen.draw(imageTitleLogo, centre - Math.trunc(imageTitleLogo.w / 2), 4);
  for (const [text, ink, y] of noticeLines) drawTextCentered(screen, text, centre, y, ink);
}
