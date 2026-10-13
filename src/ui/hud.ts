// The hub's top line: a coin and the token count on the left, a ticket and
// the ticket count on the right, in the 16-px margin above the hub image. At
// 0 tokens the token count reads FREE PLAY.

import { imageIcons } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { iconRects, type IconName } from "./icons.ts";
import { drawText, textWidth } from "./text.ts";

/** Top of the HUD text: centred in the 16-px margin. */
export const hudTop = 5;
const hudInset = 16;
/** Icons are 9 px tall: one row above and below the 7-px text. */
const iconTop = hudTop - 1;
/** Space between an icon and its count. */
const iconGap = 3;

export function tokensLabel(tokens: number): string {
  return tokens > 0 ? `${tokens}` : "FREE PLAY";
}

/** A HUD icon with its top-left corner at `x, y`. */
export function drawIcon(screen: Surface, name: IconName, x: number, y: number): void {
  const r = iconRects[name];
  screen.draw(sub(imageIcons, r.x, 0, r.x + r.w, r.h), x, y);
}

/** Draw the counts across a hub `width` px wide. */
export function drawHud(screen: Surface, tokens: number, tickets: number, width: number): void {
  drawIcon(screen, "token", hudInset, iconTop);
  drawText(
    screen,
    tokensLabel(tokens),
    hudInset + iconRects.token.w + iconGap,
    hudTop,
    tokens > 0 ? "yellow" : "orange",
  );

  const t = `${tickets}`;
  const tx = width - hudInset - textWidth(t);
  drawText(screen, t, tx, hudTop, "yellow");
  drawIcon(screen, "ticket", tx - iconGap - iconRects.ticket.w, iconTop);
}
