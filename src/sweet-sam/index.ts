// Entry module for the Sweet Sam port (ported in T5). src/game/registry.ts
// imports `createSweetSam`.

import type { FixedViewport } from "../game/software.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import { sweetSamAdvantages } from "./advantages.ts";
import { SweetSamSoftware } from "./software.ts";

/**
 * Go's Sweet Sam constructor, which takes the hub high score. Returns a `FixedViewport` (336×428
 * cabinet bezel, drawn with `buffer` 0); `name` is "sweetSam". Constructing it
 * enters START, which plays "rewind:start" then "play:start". `prizes` are
 * the player's owned prizes; those for Sweet Sam change how the run starts
 * (./advantages.ts). With none it is the Go original.
 */
export function createSweetSam(highScore: number, prizes: readonly PrizeId[] = []): FixedViewport {
  return new SweetSamSoftware(highScore, sweetSamAdvantages(prizes));
}
