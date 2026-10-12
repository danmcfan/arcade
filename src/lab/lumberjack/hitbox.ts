// Port of internal/lumberjack/hitbox.go.

import type { PremulColor, Surface } from "../../engine/surface.ts";

// Debug colours: Go `color.RGBA` values, which are premultiplied (fact 10,
// D15), so they are drawn with `fillPremul`. Only used when `debug` is on.
export const colorRed: PremulColor = { r: 255, g: 0, b: 0, a: 8 };
export const colorGreen: PremulColor = { r: 0, g: 255, b: 0, a: 8 };
export const colorBlue: PremulColor = { r: 0, g: 0, b: 255, a: 8 };
export const colorYellow: PremulColor = { r: 255, g: 255, b: 0, a: 8 };
export const colorPurple: PremulColor = { r: 255, g: 0, b: 255, a: 8 };
export const colorOrange: PremulColor = { r: 255, g: 128, b: 0, a: 8 };
export const colorPink: PremulColor = { r: 255, g: 0, b: 180, a: 8 };
export const colorTeal: PremulColor = { r: 0, g: 255, b: 220, a: 8 };

/** Go `Hitbox` (a value type: copy, never share). */
export interface Hitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Go `Overlaps`: strict `<`, so touching edges do not overlap. */
export function overlaps(a: Hitbox, b: Hitbox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Go `Resolve`: the correction to move `src` out of `dst`, along the axis
 * with the smaller overlap (minus the overlap). Ties go to Y. Returns
 * `[overlapX, overlapY]` with the other component 0.
 */
export function resolve(src: Hitbox, dst: Hitbox): [number, number] {
  let overlapX = 0.0;
  if (src.x < dst.x) {
    overlapX = src.x + src.w - dst.x; // left side
  } else {
    overlapX = src.x - (dst.x + dst.w); // right side
  }

  let overlapY = 0.0;
  if (src.y < dst.y) {
    overlapY = src.y + src.h - dst.y; // top side
  } else {
    overlapY = src.y - (dst.y + dst.h); // bottom side
  }

  if (Math.abs(overlapX) < Math.abs(overlapY)) {
    return [-overlapX, 0.0];
  } else {
    return [0.0, -overlapY];
  }
}

/** Go `Draw(screen, h, color)`: `vector.FillRect` with a premultiplied colour. Debug only. */
export function drawHitbox(screen: Surface, h: Hitbox, color: PremulColor): void {
  screen.fillPremul(h.x, h.y, h.w, h.h, color);
}
