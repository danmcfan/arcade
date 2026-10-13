// Entry module for Brass Monkey. src/game/softwareFactories.ts imports
// `createBrassMonkey`.

import type { FixedViewport } from "../game/software.ts";
import { newBrassMonkeySoftware } from "./game.ts";

/**
 * A Brass Monkey run that starts from the hub's high score for it; `name` is
 * "brassMonkey". A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 */
export function createBrassMonkey(highScore = 0): FixedViewport {
  return newBrassMonkeySoftware(highScore);
}
