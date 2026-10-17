// What the player's prizes do in Firefly (#35). The hub hands over the owned
// prizes when a run starts; with none, every value is the game's own
// (./rules.ts).

import type { PrizeId } from "../arcade/prizes.ts";
import { maxSparks, playerSpeed, startLives } from "./rules.ts";

/** Lantern: extra lives a run starts with (4 rather than 3). */
export const lanternExtraLives = 1;

/** Glow stick: sparks allowed on the screen at once (rather than 2). */
export const glowStickMaxSparks = 3;

/** Wings: the firefly's speed, in px per tick (25% faster than 2). */
export const wingsPlayerSpeed = 2.5;

/** The values a Firefly run starts with. */
export interface FireflyAdvantages {
  lives: number;
  maxSparks: number;
  playerSpeed: number;
}

/** No prizes: the original game. */
export const noAdvantages: Readonly<FireflyAdvantages> = { lives: startLives, maxSparks, playerSpeed };

/** The advantages `owned` prizes give in Firefly; other minigames' prizes do nothing here. */
export function fireflyAdvantages(owned: readonly PrizeId[]): FireflyAdvantages {
  return {
    lives: startLives + (owned.includes("lantern") ? lanternExtraLives : 0),
    maxSparks: owned.includes("glowStick") ? glowStickMaxSparks : maxSparks,
    playerSpeed: owned.includes("wings") ? wingsPlayerSpeed : playerSpeed,
  };
}
