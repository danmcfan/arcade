// What the player's prizes do in Sweet Sam (#22). The hub hands over the
// owned prizes when a run starts; with none, every value is the Go
// original's, so the parity fixtures (which own no prizes) are unchanged.

import type { PrizeId } from "../arcade/prizes.ts";
import { blueFramesDuration, framesPerSecond } from "./constants.ts";
import { velocityPlayerNormal, velocityPlayerPower } from "./entity.ts";

/** Lives a run starts with. */
export const startingLives = 3;

/** Honey jar: extra lives a run starts with. */
export const honeyJarExtraLives = 1;

/**
 * Running shoes: the bear's normal speed, per tick. It is the power-pellet
 * speed (12.5% faster), which the maze already handles: steps of 9/8 px
 * always land within 0.5 px of every corner, so turns work as before.
 */
export const runningShoesPlayerVelocity = velocityPlayerPower;

/** Sleepy bees: how long a power pellet scares the bees, in ticks (15 s rather than 10). */
export const sleepyBeesBlueFrames = framesPerSecond * 15;

/** The values a Sweet Sam run starts with. */
export interface HiveAdvantages {
  lives: number;
  /** The bear's speed while no bee is scared. */
  playerVelocity: number;
  /** Ticks a power pellet scares the bees for. */
  blueFrames: number;
}

/** No prizes: the original game. */
export const noAdvantages: Readonly<HiveAdvantages> = {
  lives: startingLives,
  playerVelocity: velocityPlayerNormal,
  blueFrames: blueFramesDuration,
};

/** The advantages `owned` prizes give in Sweet Sam; other minigames' prizes do nothing here. */
export function hiveAdvantages(owned: readonly PrizeId[]): HiveAdvantages {
  return {
    lives: startingLives + (owned.includes("honeyJar") ? honeyJarExtraLives : 0),
    playerVelocity: owned.includes("runningShoes") ? runningShoesPlayerVelocity : noAdvantages.playerVelocity,
    blueFrames: owned.includes("sleepyBees") ? sleepyBeesBlueFrames : noAdvantages.blueFrames,
  };
}
