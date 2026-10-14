// Software and scene factories (§5 1a). FINAL: nobody but T1 edits this file.
// Porters implement the factories in their own entry modules; the hub's
// machines, the test hook (`__arcade.load`), main.ts (`?scene=`) and the
// parity harness all construct through here.

import { createGame } from "./index.ts";
import { createTitle } from "../title/index.ts";
import type { SaveStore } from "../title/save.ts";
import type { Scene, SceneName, SoftwareName } from "./software.ts";

export interface SceneOptions {
  /** `game` only: start as `game.New(<software>)`; omit to start in the hub. */
  software?: SoftwareName | undefined;
  /** `title` only: where the save lives; default: in memory. */
  store?: SaveStore;
}

/**
 * A fresh scene instance. Seed the RNG first: construction may draw from it.
 * Call `dispose()` on the previous scene when replacing it.
 */
export function createScene(name: SceneName, opts: SceneOptions = {}): Scene {
  return sceneFactories[name](opts);
}

const sceneFactories: Readonly<Record<SceneName, (opts: SceneOptions) => Scene>> = {
  title: (opts) => createTitle(opts.store),
  game: (opts) => createGame(opts.software),
};
