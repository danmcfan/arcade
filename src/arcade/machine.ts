// Port of internal/arcade/machine.go.
//
// Go machines call the minigame constructors directly. Here they go through a
// `SoftwareFactory` (src/game/minigames.ts `createSoftware` in the real game) so
// the hub can be tested with fake software. The title image is identified by
// name (`ArcadeTitle`), which is also what the snapshot reports.

import type { Software, SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { minigames } from "../game/minigames.ts";
import { checkCollision, type Rect } from "./collision.ts";
import type { PrizeId } from "./prizes.ts";
import { newScreen, type Screen } from "./screen.ts";

/** Builds a minigame for a run: the high score its HI shows and the prizes the player owns. */
export type SoftwareFactory = (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]) => Software;

export interface Machine {
  /** Its minigame: whose high scores it keeps. */
  name: SoftwareName;
  rect: Rect;
  /** Go `imageTitle`, by name; the LED scoreboard shows its name (src/arcade/ticker.ts). */
  title: ArcadeTitle;
  newSoftware: (highScore: number, prizes: readonly PrizeId[]) => Software;
  /** Its screen: on while the player faces it. */
  screen: Screen;
}

/**
 * One machine per minigame, left to right as their cabinets stand
 * (src/game/minigames.ts `hubRect`), the order screens.png's rows follow.
 */
export function newMachines(factory: SoftwareFactory): Machine[] {
  return minigames
    .toSorted((a, b) => a.hubRect.x - b.hubRect.x)
    .map((m) => ({
      name: m.name,
      rect: { ...m.hubRect },
      title: m.title,
      newSoftware: (highScore, prizes) => factory(m.name, highScore, prizes),
      screen: newScreen(),
    }));
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
