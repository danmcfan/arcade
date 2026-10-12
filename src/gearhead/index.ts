// Entry module for the gearhead port (T6 owns src/gearhead/**). Replace the
// stub body; keep the export name and signature, which src/game/registry.ts
// imports.

import type { Software } from "../game/software.ts";

/** Go `gearhead.NewGearHeadSoftware()` (takes no high score); `name` is "gearhead". */
export function createGearhead(): Software {
  throw new Error("TODO: createGearhead");
}
