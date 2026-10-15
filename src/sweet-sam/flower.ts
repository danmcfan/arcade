// The bonus flower (#47): it appears below the bee home twice per level, once
// the bear has eaten `flowerDrops` honey drops (smoke pots count), and stays
// 9 to 10 s unless the bear eats it first. Eating it scores the level's
// `flowerPoints`, shown in the pixel font where it stood. The kinds and points
// are Pac-Man's fruit table (#68, the Dossier's Table A.1).

import { sounds } from "../engine/assets.ts";
import { playSound } from "../engine/audio.ts";
import * as rng from "../engine/rng.ts";
import { framesPerSecond } from "./constants.ts";
import { flowerPopupTicks } from "./bonusEat.ts";
import { collideWithDistance, distanceThreshold } from "./update.ts";
import { Entity, newItems } from "./entity.ts";
import type { SweetSamSoftware } from "./software.ts";

/** Honey drops eaten on a level when the first and the second flower appear. */
export const flowerDrops = [70, 170] as const;
/** The shortest and longest stay, in ticks, when the bear doesn't eat it. */
export const flowerStayMin = framesPerSecond * 9;
export const flowerStayMax = framesPerSecond * 10;

/** Points per flower kind; kind k is frame k of flower.png. */
const kindPoints = [100, 300, 500, 700, 1000, 2000, 3000, 5000] as const;
/** The first level of each kind after the first: 2, 3–4, 5–6, 7–8, 9–10, 11–12, 13 on. */
const kindFirstLevel = [2, 3, 5, 7, 9, 11, 13] as const;
export const flowerKinds = kindPoints.length;

/** The flower kind (0-based frame) for `level` (1-based). */
export function flowerKind(level: number): number {
  return kindFirstLevel.filter((first) => level >= first).length;
}

/** Points for eating the flower on `level`. */
export function flowerPoints(level: number): number {
  const points = kindPoints[flowerKind(level)];
  if (points === undefined) throw new Error(`sweetSam: no flower for level ${level}`);
  return points;
}

/**
 * A stay between 9 s and 10 s from the seeded rng, as in Pac-Man. It reads
 * the rng's state rather than drawing from it, so the draws stay in the Go
 * game's order and the Go reference trace still matches.
 */
export function flowerStayTicks(): number {
  return flowerStayMin + (rng.state() % (flowerStayMax - flowerStayMin + 1));
}
/** Where the flower stands: the corridor below the bee home, centred under it. */
export const flowerX = 112;
export const flowerY = 164;
/** Items on a full maze: what "eaten" counts down from. */
const itemCount = newItems().length;

const flowerSpot = new Entity();
flowerSpot.x = flowerX;
flowerSpot.y = flowerY;

/**
 * Runs at the end of a PLAY tick, after the items: the bear eats a flower
 * it stands on, otherwise the flower's time runs down; then a new flower
 * appears when enough honey drops are gone.
 */
export function updateFlower(s: SweetSamSoftware): void {
  if (s.flowerTicks > 0) {
    if (collideWithDistance(flowerSpot, s.player, distanceThreshold)) {
      const points = flowerPoints(s.level);
      s.scoreValue += points;
      s.flowerPopup = { points, ticks: flowerPopupTicks };
      s.flowerTicks = 0;
      playSound(sounds.sweetFlower);
    } else {
      s.flowerTicks--;
    }
  }

  const next = flowerDrops[s.flowersShown];
  if (next !== undefined && itemsEaten(s) >= next) {
    s.flowerTicks = flowerStayTicks();
    s.flowersShown++;
  }
}

/** Honey drops and smoke pots eaten on this level. */
export function itemsEaten(s: SweetSamSoftware): number {
  return itemCount - s.items.filter((it) => it !== null).length;
}
