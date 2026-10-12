// Port of internal/arcade/machine.go.
//
// Go machines call the minigame constructors directly. Here they go through a
// `SoftwareFactory` (src/game/registry.ts `createSoftware` in the real game) so
// the hub can be tested with fake software. The title image is identified by
// name (`ArcadeTitle`), which is also what the snapshot reports.

import type { Sprite } from "../engine/image.ts";
import { imageTitleFirefly, imageTitleGearhead, imageTitleSweet } from "../engine/assets.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { checkCollision, type Rect } from "./collision.ts";
import { tileSize } from "./state.ts";

export type SoftwareFactory = (name: SoftwareName, highScore: number) => Software;

/** Go `assets.ImageTitle*`, keyed by the title's name. */
export const titleImages: Readonly<Record<ArcadeTitle, Sprite>> = {
  gearhead: imageTitleGearhead,
  sweet: imageTitleSweet,
  firefly: imageTitleFirefly,
};

export interface Machine {
  rect: Rect;
  /** Go `imageTitle`, by name; the sprite is `titleImages[title]`. */
  title: ArcadeTitle;
  newSoftware: (highScore: number) => Software;
}

export function newMachines(factory: SoftwareFactory): Machine[] {
  return [
    {
      rect: { x: tileSize * 6, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "gearhead",
      newSoftware: (highScore) => factory("gearhead", highScore),
    },
    {
      rect: { x: tileSize * 9, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "sweet",
      newSoftware: (highScore) => factory("hive", highScore),
    },
    {
      rect: { x: tileSize * 12, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "firefly",
      newSoftware: (highScore) => factory("firefly", highScore),
    },
  ];
}

/** Go returns `(machine, bool)`; here the machine or `null`. */
export function findMachine(a: Rect, ms: readonly Machine[]): Machine | null {
  for (const m of ms) {
    if (checkCollision(a, m.rect)) {
      return m;
    }
  }
  return null;
}
