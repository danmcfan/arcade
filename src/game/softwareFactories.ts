// Software factories (§5 1a), split from ./registry.ts so the Game can build
// machines without a dependency cycle through the scene factories.

import { createSweetSam } from "../sweet-sam/index.ts";
import { createFirefly } from "../firefly/index.ts";
import { createBrassMonkey } from "../brass-monkey/index.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import type { Software, SoftwareName } from "./software.ts";

/**
 * Go `machine.newSoftware func(highscore int)`: every factory takes the hub's
 * high score; sweetSam and brassMonkey use it (firefly ignores it, as in Go).
 * They also take the player's owned prizes (#22); each minigame applies its
 * own (all three minigames have prizes now).
 */
export const softwareFactories: Readonly<
  Record<SoftwareName, (highScore: number, prizes: readonly PrizeId[]) => Software>
> = {
  sweetSam: (highScore, prizes) => createSweetSam(highScore, prizes),
  firefly: (_highScore, prizes) => createFirefly(prizes),
  brassMonkey: (highScore, prizes) => createBrassMonkey(highScore, prizes),
};

export function createSoftware(name: SoftwareName, highScore: number, prizes: readonly PrizeId[] = []): Software {
  return softwareFactories[name](highScore, prizes);
}
