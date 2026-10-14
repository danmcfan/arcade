// Entry module for Firefly. src/game/registry.ts imports `createFirefly`.

import type { FixedViewport } from "../game/software.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import { fireflyAdvantages } from "./advantages.ts";
import { newFireflySoftware } from "./game.ts";

/**
 * A new Firefly run (takes no high score); `name` is "firefly". A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 * `prizes` are the player's owned prizes; those for Firefly change how the run starts (./advantages.ts).
 */
export function createFirefly(prizes: readonly PrizeId[] = []): FixedViewport {
  return newFireflySoftware(fireflyAdvantages(prizes));
}
