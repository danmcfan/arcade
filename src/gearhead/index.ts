// Entry module for the gearhead port (T6). src/game/registry.ts imports
// `createGearhead`.

import type { Software } from "../game/software.ts";
import { newGearheadSoftware } from "./game.ts";

/** Go `gearhead.NewGearHeadSoftware()` (takes no high score); `name` is "gearhead". */
export function createGearhead(): Software {
  return newGearheadSoftware();
}
