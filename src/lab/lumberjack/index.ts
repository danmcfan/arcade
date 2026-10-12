// Entry module for the lumberjack lab scene (`?scene=lumberjack`, D6).
// src/game/registry.ts imports `createLumberjack`.

import type { Scene } from "../../game/software.ts";
import { newGame } from "./game.ts";

/**
 * Go `lumberjack.NewGame()` with the package globals (`player`, `trees`) as
 * fields of a fresh instance; `name` is "lumberjack". Layout 512×288.
 */
export function createLumberjack(): Scene {
  return newGame();
}
