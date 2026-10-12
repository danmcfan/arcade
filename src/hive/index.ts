// Entry module for the hive port (T5 owns src/hive/**). src/game/registry.ts
// imports `createHive`.

import type { FixedViewport } from "../game/software.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import { hiveAdvantages } from "./advantages.ts";
import { HiveSoftware } from "./software.ts";

/**
 * Go `hive.NewHiveSoftware(highscore)`. Returns a `FixedViewport` (336×428
 * cabinet bezel, drawn with `buffer` 0); `name` is "hive". Constructing it
 * enters START, which plays "rewind:start" then "play:start". `prizes` are
 * the player's owned prizes; those for Sweet Sam change how the run starts
 * (./advantages.ts). With none it is the Go original.
 */
export function createHive(highScore: number, prizes: readonly PrizeId[] = []): FixedViewport {
  return new HiveSoftware(highScore, hiveAdvantages(prizes));
}
