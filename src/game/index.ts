// Entry module for the top-level Game. src/game/registry.ts imports
// `createGame` from here.

import { Game } from "./game.ts";
import type { Scene, SoftwareName } from "./software.ts";

/**
 * Go `game.New(initialSoftware)`; `name` is "game". Omit `initialSoftware`
 * (Go `nil`) to start in the hub.
 *
 * With a name, the Game subscribes to sound events (`addSoundListener`) FIRST
 * and only then builds the software with `createSoftware(name, 0)` from
 * ./softwareFactories.ts, so construction sounds land in tick 1's `sounds` (see
 * `GameSnapshot.sounds`). As in Go, the software is handed to the hub as
 * `LoadedSoftware`: tick 1 is a hub tick and the software runs from tick 2.
 *
 * The Game imports `createSoftware` from ./softwareFactories.ts, not
 * ./registry.ts, so there is no import cycle through this module.
 */
export function createGame(initialSoftware?: SoftwareName): Scene {
  return new Game(initialSoftware ?? null);
}
