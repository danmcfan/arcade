// Software and scene factories (§5 1a). FINAL: nobody but T1 edits this file.
// Porters implement the factories in their own entry modules; the hub's
// machines, the test hook (`__arcade.load`), main.ts (`?scene=`) and the
// parity harness all construct through here.

import { createHive } from "../hive/index.ts";
import { createFirefly } from "../firefly/index.ts";
import { createBrassMonkey } from "../brass-monkey/index.ts";
import { createWave } from "../lab/wave/index.ts";
import { createLumberjack } from "../lab/lumberjack/index.ts";
import { createGame } from "./index.ts";
import { createTitle } from "../title/index.ts";
import type { SaveStore } from "../title/save.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import type { Scene, SceneName, Software, SoftwareName, WaveOptions } from "./software.ts";

/**
 * Go `machine.newSoftware func(highscore int)`: every factory takes the hub's
 * high score; only hive uses it (firefly and brassMonkey ignore it, as in Go).
 * They also take the player's owned prizes (#22); each minigame applies its
 * own (only hive has prizes so far).
 */
export const softwareFactories: Readonly<Record<SoftwareName, (highScore: number, prizes: readonly PrizeId[]) => Software>> = {
  hive: (highScore, prizes) => createHive(highScore, prizes),
  firefly: () => createFirefly(),
  brassMonkey: () => createBrassMonkey(),
};

export function createSoftware(name: SoftwareName, highScore: number, prizes: readonly PrizeId[] = []): Software {
  return softwareFactories[name](highScore, prizes);
}

export interface SceneOptions {
  /** `game` only: start as `game.New(<software>)`; omit to start in the hub. */
  software?: SoftwareName | undefined;
  /** `wave` only: pending slider values (defaults 128 and 5). */
  wave?: Partial<WaveOptions> | undefined;
  /** `title` only: where the save lives; default: in memory. */
  store?: SaveStore;
}

/**
 * A fresh scene instance. Seed the RNG first: construction may draw from it.
 * Call `dispose()` on the previous scene when replacing it.
 */
export function createScene(name: SceneName, opts: SceneOptions = {}): Scene {
  switch (name) {
    case "title":
      return createTitle(opts.store);
    case "game":
      return createGame(opts.software);
    case "wave":
      return createWave(opts.wave);
    case "lumberjack":
      return createLumberjack();
  }
}
