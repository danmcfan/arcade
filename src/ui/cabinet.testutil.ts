// Test-only: checks that a minigame draws only its cabinet outside its screen.

import { expect } from "bun:test";
import type { Sprite } from "../engine/image.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import type { Surface } from "../engine/surface.ts";
import { cabinetInsetLeft, cabinetInsetTop, cabinetPlayfieldHeight, cabinetPlayfieldWidth } from "./cabinet.ts";

/** The cabinet's screen: `[x, y, w, h]`. */
export const cabinetScreen: readonly [number, number, number, number] = [
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldWidth,
  cabinetPlayfieldHeight,
];

/** One paint: what it was, and the clip it was made in (`null`: none). */
export interface Paint {
  what: string;
  sprite: Sprite | null;
  clip: readonly number[] | null;
}

/** Runs `draw` on a stub surface and records every paint, of any kind, with its clip. */
export function screenPaints(draw: (screen: Surface) => void): Paint[] {
  const paints: Paint[] = [];
  let clip: readonly number[] | null = null;
  const paint = (what: string, sprite: Sprite | null = null): void => {
    paints.push({ what, sprite, clip });
  };
  const fake = stubSurface({
    draw: (sprite) => {
      paint("draw", sprite);
    },
    drawSurface: () => {
      paint("drawSurface");
    },
    fillRect: () => {
      paint("fillRect");
    },
    fillPremul: () => {
      paint("fillPremul");
    },
    strokeRect: () => {
      paint("strokeRect");
    },
    clipped: (x, y, w, h, inner) => {
      const outer = clip;
      clip = [x, y, w, h];
      inner();
      clip = outer;
    },
  });
  draw(fake);
  return paints;
}

/** Only `cabinet` is painted outside a clip; every other paint is clipped to the cabinet's screen. */
export function expectDrawnOnScreen(paints: readonly Paint[], cabinet: Sprite): void {
  const outside = paints.filter((p) => p.clip === null);
  expect(outside.map((p) => p.sprite?.asset)).toEqual([cabinet.asset]);
  const inside = paints.filter((p) => p.clip !== null);
  expect(inside.length).toBeGreaterThan(0);
  for (const p of inside) expect(p.clip).toEqual([...cabinetScreen]);
}
