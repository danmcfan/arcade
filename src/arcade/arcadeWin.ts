// What the arcade win (#143, art #197) leaves in the hub: the cake, the gold
// trophy and two bunches of balloons on the prize desk, and the confetti that
// falls the moment it happens. The art is src/ui/winArt.ts, packed into
// win.png.

import { imageArcade, imageWin } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import {
  confettiFrames,
  confettiLetters,
  confettiSheetY,
  confettiSize,
  winRects,
  type WinPiece,
} from "../ui/winArt.ts";
import type { Rect } from "./collision.ts";
import { deskRect } from "./desk.ts";

/** The row every piece's bottom sits on: 8 px into the desk's back run, so it stands well onto the counter top. */
const deskTop = deskRect.y + 8;

/** Where `piece` stands: `fromLeft` of the desk's left edge to its middle, its bottom on the back run. */
function standing(piece: WinPiece, fromLeft: number): Rect {
  const { w, h } = winRects[piece];
  return { x: Math.round(deskRect.x + fromLeft - w / 2), y: deskTop - h, w, h };
}

/** The cake on the desk's back run, left of the employee. */
export const cakeRect: Rect = standing("cake", 19);
/** The gold trophy on the desk's back run, right of the employee. */
export const trophyRect: Rect = standing("trophy", 68.5);
/** The balloons, tied at each end of the desk's back run: flush with its left and right edges. */
export const balloonsLeftRect: Rect = standing("balloonsLeft", winRects.balloonsLeft.w / 2);
export const balloonsRightRect: Rect = standing("balloonsRight", deskRect.w - winRects.balloonsRight.w / 2);

/** Each piece, where it stands, and its sprite in win.png. */
export const winPlaces: readonly { piece: WinPiece; rect: Rect; sprite: Sprite }[] = (
  [
    ["balloonsLeft", balloonsLeftRect],
    ["balloonsRight", balloonsRightRect],
    ["cake", cakeRect],
    ["trophy", trophyRect],
  ] as const
).map(([piece, rect]) => {
  const r = winRects[piece];
  return { piece, rect, sprite: sub(imageWin, r.x, 0, r.x + r.w, r.h) };
});

/** The cake, trophy and balloons, standing on the desk. */
export function drawWinPieces(screen: Surface, buffer: number): void {
  for (const { rect, sprite } of winPlaces) screen.draw(sprite, rect.x + buffer, rect.y + buffer);
}

/** One piece of confetti: which piece, where (hub-image coordinates), its colour and its tumble frame. */
export interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  /** Index into `confettiLetters`. */
  colour: number;
  /** Index into `confettiFrames`. */
  frame: number;
}

const pieces = 72;
/** Ticks over which the pieces set off from the top. */
const spread = 180;
/** The slowest and fastest a piece falls, in ticks per pixel. */
const slowest = 3;
const fastest = 1.5;
/** Where a piece's top-left can be and still be wholly in the hub. */
const maxX = imageArcade.w - confettiSize;
/** The furthest a piece sways either side of its line. */
const maxSway = 3;
const maxY = imageArcade.h - confettiSize;

/** Ticks from the arcade win until the last piece has fallen out of the hub. */
export const confettiTicks = spread + Math.ceil((maxY + 1) * slowest);

/** A fixed number in [0, 1) for `piece`'s `trait`: confetti looks random but is the same every time. */
function scatter(piece: number, trait: number): number {
  let h = Math.imul(piece + 1, 0x9e3779b1) ^ Math.imul(trait + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 2 ** 32;
}

/**
 * The confetti `age` ticks after the arcade win. Each piece sets off at its
 * own time and place, falls at its own speed, sways side to side and tumbles
 * through its frames, then is gone once it reaches the bottom.
 */
export function confetti(age: number): ConfettiPiece[] {
  const out: ConfettiPiece[] = [];
  for (let id = 0; id < pieces; id++) {
    const fallen = age - Math.trunc(scatter(id, 0) * spread);
    if (fallen < 0) continue;
    const ticksPerPixel = fastest + scatter(id, 1) * (slowest - fastest);
    const y = Math.trunc(fallen / ticksPerPixel);
    if (y > maxY) continue;
    const swayWidth = 1 + scatter(id, 2) * (maxSway - 1);
    const swayTicks = 40 + scatter(id, 3) * 50;
    const sway = Math.round(swayWidth * Math.sin(2 * Math.PI * (fallen / swayTicks + scatter(id, 4))));
    // Set off at least `maxSway` in from each side, so the sway never pushes a piece out of the hub.
    const x = maxSway + Math.trunc(scatter(id, 5) * (maxX - 2 * maxSway + 1)) + sway;
    const tumbleTicks = 6 + scatter(id, 6) * 6;
    const frame = Math.trunc(fallen / tumbleTicks + scatter(id, 7) * confettiFrames.length) % confettiFrames.length;
    const colour = Math.trunc(scatter(id, 8) * confettiLetters.length);
    out.push({ id, x, y, colour, frame });
  }
  return out;
}

/** Each colour's tumble frames in win.png, by colour then frame. */
const confettiSprites: readonly (readonly Sprite[])[] = confettiLetters.map((_letter, colour) =>
  confettiFrames.map((_rows, frame) => {
    const x = frame * confettiSize;
    const y = confettiSheetY + colour * confettiSize;
    return sub(imageWin, x, y, x + confettiSize, y + confettiSize);
  }),
);

/** The confetti, over everything in the hub. */
export function drawConfetti(screen: Surface, age: number, buffer: number): void {
  for (const p of confetti(age)) {
    const sprite = confettiSprites[p.colour]?.[p.frame];
    if (sprite !== undefined) screen.draw(sprite, p.x + buffer, p.y + buffer);
  }
}
