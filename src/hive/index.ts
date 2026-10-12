// Entry module for the hive port (T5 owns src/hive/**). Replace the stub body;
// keep the export name and signature, which src/game/registry.ts imports.

import type { FixedViewport } from "../game/software.ts";

/**
 * Go `hive.NewHiveSoftware(highscore)`. Returns a `FixedViewport` (336×428
 * cabinet bezel, drawn with `buffer` 0); `name` is "hive". Constructing it
 * enters START, which plays "rewind:start" then "play:start".
 */
export function createHive(highScore: number): FixedViewport {
  throw new Error(`TODO: createHive(${highScore})`);
}
