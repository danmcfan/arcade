// Entry module for the firefly port (T6). src/game/registry.ts imports
// `createFirefly`.

import type { Software } from "../game/software.ts";
import { newFireflySoftware } from "./game.ts";

/** Go `firefly.NewFireFlySoftware()` (takes no high score); `name` is "firefly". */
export function createFirefly(): Software {
  return newFireflySoftware();
}
