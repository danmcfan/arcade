// Entry module for the gearhead port (T6). src/game/registry.ts imports
// `createGearhead`.

import type { FixedViewport } from "../game/software.ts";
import { newGearheadSoftware } from "./game.ts";

/**
 * Go `gearhead.NewGearHeadSoftware()` (takes no high score); `name` is
 * "gearhead". A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 */
export function createGearhead(): FixedViewport {
  return newGearheadSoftware();
}
