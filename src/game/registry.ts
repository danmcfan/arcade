// Software and scene factories (§5 1a). FINAL: nobody but T1 edits this file.
// Porters implement the factories in their own entry modules; the hub's
// machines, the test hook (`__arcade.load`), main.ts (`?scene=`) and the
// parity harness all construct through here.

import { createHive } from "../hive/index.ts";
import { createFirefly } from "../firefly/index.ts";
import { createGearhead } from "../gearhead/index.ts";
import { createWave } from "../lab/wave/index.ts";
import { createLumberjack } from "../lab/lumberjack/index.ts";
import { createGame } from "./index.ts";
import type { Scene, SceneName, Software, SoftwareName, WaveOptions } from "./software.ts";

/**
 * Go `machine.newSoftware func(highscore int)`: every factory takes the hub's
 * high score; only hive uses it (firefly and gearhead ignore it, as in Go).
 */
export const softwareFactories: Readonly<Record<SoftwareName, (highScore: number) => Software>> = {
  hive: (highScore) => createHive(highScore),
  firefly: () => createFirefly(),
  gearhead: () => createGearhead(),
};

export function createSoftware(name: SoftwareName, highScore: number): Software {
  return softwareFactories[name](highScore);
}

export interface SceneOptions {
  /** `game` only: start as `game.New(<software>)`; omit to start in the hub. */
  software?: SoftwareName;
  /** `wave` only: pending slider values (defaults 128 and 5). */
  wave?: Partial<WaveOptions>;
}

/**
 * A fresh scene instance. Seed the RNG first: construction may draw from it.
 * Call `dispose()` on the previous scene when replacing it.
 */
export function createScene(name: SceneName, opts: SceneOptions = {}): Scene {
  switch (name) {
    case "game":
      return createGame(opts.software);
    case "wave":
      return createWave(opts.wave);
    case "lumberjack":
      return createLumberjack();
  }
}
