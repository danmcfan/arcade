// Entry module for the hive port (T5 owns src/hive/**). src/game/registry.ts
// imports `createHive`.

import type { FixedViewport } from "../game/software.ts";
import { HiveSoftware } from "./software.ts";

/**
 * Go `hive.NewHiveSoftware(highscore)`. Returns a `FixedViewport` (336×428
 * cabinet bezel, drawn with `buffer` 0); `name` is "hive". Constructing it
 * enters START, which plays "rewind:start" then "play:start".
 */
export function createHive(highScore: number): FixedViewport {
  return new HiveSoftware(highScore);
}
