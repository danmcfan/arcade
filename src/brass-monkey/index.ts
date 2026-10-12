// Entry module for the Brass Monkey port (T6). src/game/registry.ts imports
// `createBrassMonkey`.

import type { FixedViewport } from "../game/software.ts";
import { newBrassMonkeySoftware } from "./game.ts";

/**
 * The Go minigame's constructor (takes no high score); `name` is
 * "brassMonkey". A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 */
export function createBrassMonkey(): FixedViewport {
  return newBrassMonkeySoftware();
}
