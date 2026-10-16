// What the arcade win (#143) leaves in the hub: the cake and the gold trophy
// on the prize desk, and the confetti that falls the moment it happens. The
// art is a placeholder: plain rectangles and single-pixel confetti, each
// behind one draw function, so the final art (#197) swaps only those.

import { imageArcade } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { sweetie, type Sweetie16 } from "../ui/sweetie16.ts";
import type { Rect } from "./collision.ts";

/** The cake on the desk's back run, left of the employee, in hub-image coordinates. */
export const cakeRect: Rect = { x: 50, y: 102, w: 10, h: 7 };

/** The gold trophy on the desk's back run, right of the employee. */
export const trophyRect: Rect = { x: 101, y: 98, w: 7, h: 11 };

/** Placeholder cake: a red sponge under white icing, one candle. */
export function drawCake(screen: Surface, buffer: number): void {
  const { x, y, w, h } = cakeRect;
  const bx = x + buffer;
  const by = y + buffer;
  screen.fillRect(bx + Math.trunc(w / 2), by, 1, 2, sweetie.y);
  screen.fillRect(bx, by + 2, w, 2, sweetie.w);
  screen.fillRect(bx, by + 4, w, h - 4, sweetie.r);
}

/** Placeholder trophy: a gold cup on a stem and a base. */
export function drawTrophy(screen: Surface, buffer: number): void {
  const { x, y, w, h } = trophyRect;
  const bx = x + buffer;
  const by = y + buffer;
  screen.fillRect(bx, by, w, 5, sweetie.y);
  screen.fillRect(bx + Math.trunc(w / 2) - 1, by + 5, 3, h - 7, sweetie.o);
  screen.fillRect(bx + 1, by + h - 2, w - 2, 2, sweetie.y);
}

/** One piece of confetti: which piece, where (hub-image coordinates) and its colour. */
export interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  colour: Sweetie16;
}

const confettiColours: readonly Sweetie16[] = [sweetie.r, sweetie.y, sweetie.g, sweetie.B, sweetie.c, sweetie.o];
const pieces = 64;
/** Ticks over which the pieces set off from the top. */
const spread = 180;
/** Ticks per pixel a piece falls. */
const fallTicks = 2;
const roomHeight = imageArcade.h;
const roomWidth = imageArcade.w;

/** Ticks from the arcade win until the last piece has fallen out of the hub. */
export const confettiTicks = spread + roomHeight * fallTicks;

/** The confetti `age` ticks after the arcade win: each piece falls once, top to bottom, swaying a pixel. */
export function confetti(age: number): ConfettiPiece[] {
  const out: ConfettiPiece[] = [];
  for (let id = 0; id < pieces; id++) {
    const fallen = age - ((id * 37) % spread);
    if (fallen < 0) continue;
    const y = Math.trunc(fallen / fallTicks);
    if (y >= roomHeight) continue;
    const sway = Math.trunc((fallen + id * 5) / 12) % 2;
    const x = (id * 61 + 7 + sway) % roomWidth;
    out.push({ id, x, y, colour: confettiColours[id % confettiColours.length] ?? sweetie.w });
  }
  return out;
}

/** Placeholder confetti: one pixel per piece, over everything in the hub. */
export function drawConfetti(screen: Surface, age: number, buffer: number): void {
  for (const p of confetti(age)) screen.fillRect(p.x + buffer, p.y + buffer, 1, 1, p.colour);
}
