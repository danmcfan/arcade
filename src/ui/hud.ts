// The hub's top line: tokens on the left, tickets on the right, in the 16-px
// margin above the hub image. At 0 tokens the token count reads FREE PLAY.

import type { Surface } from "../engine/surface.ts";
import { drawText, textWidth } from "./text.ts";

/** Top of the HUD text: centred in the 16-px margin. */
export const hudTop = 5;
const hudInset = 16;

export function tokensLabel(tokens: number): string {
  return tokens > 0 ? `TOKENS ${tokens}` : "FREE PLAY";
}

export function ticketsLabel(tickets: number): string {
  return `TICKETS ${tickets}`;
}

/** Draw the counts across a hub `width` px wide. */
export function drawHud(screen: Surface, tokens: number, tickets: number, width: number): void {
  drawText(screen, tokensLabel(tokens), hudInset, hudTop, tokens > 0 ? "yellow" : "orange");
  const t = ticketsLabel(tickets);
  drawText(screen, t, width - hudInset - textWidth(t), hudTop, "yellow");
}
