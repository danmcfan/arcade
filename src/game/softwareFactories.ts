// Software factories (§5 1a), split from ./registry.ts so the Game can build
// machines without a dependency cycle through the scene factories.

import { createHive } from "../hive/index.ts";
import { createFirefly } from "../firefly/index.ts";
import { createBrassMonkey } from "../brass-monkey/index.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import type { Software, SoftwareName } from "./software.ts";

/**
 * Go `machine.newSoftware func(highscore int)`: every factory takes the hub's
 * high score; only hive uses it (firefly and brassMonkey ignore it, as in Go).
 * They also take the player's owned prizes (#22); each minigame applies its
 * own (only hive has prizes so far).
 */
export const softwareFactories: Readonly<
  Record<SoftwareName, (highScore: number, prizes: readonly PrizeId[]) => Software>
> = {
  hive: (highScore, prizes) => createHive(highScore, prizes),
  firefly: () => createFirefly(),
  brassMonkey: () => createBrassMonkey(),
};

export function createSoftware(name: SoftwareName, highScore: number, prizes: readonly PrizeId[] = []): Software {
  return softwareFactories[name](highScore, prizes);
}
