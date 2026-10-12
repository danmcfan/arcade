// Entry module for the firefly port (T6 owns src/firefly/**). Replace the stub
// body; keep the export name and signature, which src/game/registry.ts imports.

import type { Software } from "../game/software.ts";

/** Go `firefly.NewFireFlySoftware()` (takes no high score); `name` is "firefly". */
export function createFirefly(): Software {
  throw new Error("TODO: createFirefly");
}
