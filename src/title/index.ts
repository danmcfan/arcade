// Entry module for the title scene. src/game/registry.ts imports
// `createTitle` from here.

import type { Scene } from "../game/software.ts";
import type { SaveStore } from "./save.ts";
import { Title } from "./title.ts";

/** The scene the page opens on; `store` holds the save (default: in memory). */
export function createTitle(store?: SaveStore): Scene {
  return new Title(store ? { store } : {});
}
