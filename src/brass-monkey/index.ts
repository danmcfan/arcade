// Entry module for Brass Monkey. src/game/softwareFactories.ts imports
// `createBrassMonkey`.

import type { FixedViewport } from "../game/software.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import { brassMonkeyAdvantages } from "./advantages.ts";
import { newBrassMonkeySoftware } from "./game.ts";

/**
 * A Brass Monkey run that starts from the hub's high score for it; `name` is
 * "brassMonkey". A `FixedViewport` (its cabinet bezel, drawn with `buffer` 0).
 * `prizes` are the player's owned prizes; those for Brass Monkey change how
 * the run plays (./advantages.ts). With none it is the game as #39 made it.
 */
export function createBrassMonkey(highScore = 0, prizes: readonly PrizeId[] = []): FixedViewport {
  return newBrassMonkeySoftware(highScore, brassMonkeyAdvantages(prizes));
}
