// The bonus flower (#47): it appears below the bee home twice per level, once
// the bear has eaten `flowerDrops` honey drops (smoke pots count), and stays
// `flowerTicks` unless the bear eats it first. Eating it scores the level's
// `flowerPoints`, shown in the pixel font where it stood.

import { sounds } from "../engine/assets.ts";
import { playSound } from "../engine/audio.ts";
import { framesPerSecond } from "./constants.ts";
import { flowerPopupTicks } from "./bonusEat.ts";
import { collideWithDistance, distanceThreshold } from "./update.ts";
import { Entity, newItems } from "./entity.ts";
import type { SweetSamSoftware } from "./software.ts";

/** Honey drops eaten on a level when the first and the second flower appear. */
export const flowerDrops = [70, 170] as const;
/** Ticks a flower stays when the bear doesn't eat it. */
export const flowerTicks = framesPerSecond * 10;
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
      const points = s.values().flowerPoints;
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
    s.flowerTicks = flowerTicks;
    s.flowersShown++;
  }
}

/** Honey drops and smoke pots eaten on this level. */
export function itemsEaten(s: SweetSamSoftware): number {
  return itemCount - s.items.filter((it) => it !== null).length;
}
