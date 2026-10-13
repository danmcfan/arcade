// Port of internal/arcade/machine.go.
//
// Go machines call the minigame constructors directly. Here they go through a
// `SoftwareFactory` (src/game/registry.ts `createSoftware` in the real game) so
// the hub can be tested with fake software. The title image is identified by
// name (`ArcadeTitle`), which is also what the snapshot reports.

import type { Sprite } from "../engine/image.ts";
import { imageTitleFirefly, imageTitleBrassMonkey, imageTitleSweet } from "../engine/assets.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { checkCollision, tileSize, type Rect } from "./collision.ts";
import type { PrizeId } from "./prizes.ts";
import { newScreen, type Screen } from "./screen.ts";

/** Builds a minigame for a run: the hub high score and the prizes the player owns. */
export type SoftwareFactory = (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]) => Software;

/** Go `assets.ImageTitle*`, keyed by the title's name. */
export const titleImages: Readonly<Record<ArcadeTitle, Sprite>> = {
  brassMonkey: imageTitleBrassMonkey,
  sweet: imageTitleSweet,
  firefly: imageTitleFirefly,
};

export interface Machine {
  rect: Rect;
  /** Go `imageTitle`, by name; the sprite is `titleImages[title]`. */
  title: ArcadeTitle;
  newSoftware: (highScore: number, prizes: readonly PrizeId[]) => Software;
  /** Its screen: on while the player faces it. */
  screen: Screen;
}

export function newMachines(factory: SoftwareFactory): Machine[] {
  return [
    {
      rect: { x: tileSize * 6, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "brassMonkey",
      newSoftware: (highScore, prizes) => factory("brassMonkey", highScore, prizes),
      screen: newScreen(),
    },
    {
      rect: { x: tileSize * 9, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "sweet",
      newSoftware: (highScore, prizes) => factory("sweetSam", highScore, prizes),
      screen: newScreen(),
    },
    {
      rect: { x: tileSize * 12, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 },
      title: "firefly",
      newSoftware: (highScore, prizes) => factory("firefly", highScore, prizes),
      screen: newScreen(),
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
