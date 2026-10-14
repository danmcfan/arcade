// Test-only: records where a minigame draws relative to its cabinet screen.

import type { Sprite } from "../engine/image.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import type { Surface } from "../engine/surface.ts";

export interface ScreenDraws {
  /** Sprites drawn outside any clip. */
  unclipped: Sprite[];
  /** Sprites drawn inside a clip, with the clip rect `[x, y, w, h]`. */
  clipped: Array<{ sprite: Sprite; clip: number[] }>;
}

/** Runs `draw` on a stub surface and sorts every sprite by the clip it was drawn in. */
export function screenDraws(draw: (screen: Surface) => void): ScreenDraws {
  const out: ScreenDraws = { unclipped: [], clipped: [] };
  let clip: number[] | null = null;
  const fake = stubSurface({
    draw: (sprite) => {
      if (clip === null) out.unclipped.push(sprite);
      else out.clipped.push({ sprite, clip });
    },
    clipped: (x, y, w, h, inner) => {
      clip = [x, y, w, h];
      inner();
      clip = null;
    },
  });
  draw(fake);
  return out;
}
