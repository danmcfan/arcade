// Entry module for the firefly port (T6). src/game/registry.ts imports
// `createFirefly`.

import type { FixedViewport } from "../game/software.ts";
import { newFireflySoftware } from "./game.ts";

/**
 * Go `firefly.NewFireFlySoftware()` (takes no high score); `name` is "firefly".
 * A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 */
export function createFirefly(): FixedViewport {
  return newFireflySoftware();
}
