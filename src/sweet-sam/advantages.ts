// What the player's prizes do in Sweet Sam (#22). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./levels.ts), so the parity fixtures (which own no prizes) are unchanged.

import type { PrizeId } from "../arcade/prizes.ts";
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

/** Sleepy bees: each level's sleepy time is multiplied by this (15 s rather than 10 on level 1). */
export const sleepyBeesFactor = 1.5;

/** The values a Sweet Sam run starts with. */
export interface SweetSamAdvantages {
  lives: number;
  /** The bear's speed while no bee is scared. */
  playerVelocity: number;
  /** Multiplies the level's sleepy time (`LevelValues.sleepyFrames`). */
  sleepyFactor: number;
}

/** No prizes: the original game. */
export const noAdvantages: Readonly<SweetSamAdvantages> = {
  lives: startingLives,
  playerVelocity: velocityPlayerNormal,
  sleepyFactor: 1,
};

/** The advantages `owned` prizes give in Sweet Sam; other minigames' prizes do nothing here. */
export function sweetSamAdvantages(owned: readonly PrizeId[]): SweetSamAdvantages {
  return {
    lives: startingLives + (owned.includes("honeyJar") ? honeyJarExtraLives : 0),
    playerVelocity: owned.includes("runningShoes") ? runningShoesPlayerVelocity : noAdvantages.playerVelocity,
    sleepyFactor: owned.includes("sleepyBees") ? sleepyBeesFactor : noAdvantages.sleepyFactor,
  };
}
