// The player's prizes in Sweet Sam (#22): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./levels.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";
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
export type SweetSamAdvantages = {
  lives: number;
  /** The bear's speed while no bee is scared. */
  playerVelocity: number;
  /** Multiplies the level's sleepy time (`LevelValues.sleepyFrames`). */
  sleepyFactor: number;
};

/** No prizes: the original game. */
export const noAdvantages: Readonly<SweetSamAdvantages> = {
  lives: startingLives,
  playerVelocity: velocityPlayerNormal,
  sleepyFactor: 1,
};

/** Sweet Sam's prizes, in the order the prize counter lists them. */
export const sweetSamPrizes = [
  {
    id: "honeyJar",
    name: "HONEY JAR",
    price: 25,
    effect: "+1 LIFE IN SWEET SAM",
    advantage: "lives",
    give: (lives: number): number => lives + honeyJarExtraLives,
  },
  {
    id: "runningShoes",
    name: "RUNNING SHOES",
    price: 50,
    effect: "SAM RUNS FASTER",
    advantage: "playerVelocity",
    give: (): number => runningShoesPlayerVelocity,
  },
  {
    id: "sleepyBees",
    name: "SLEEPY BEES",
    price: 100,
    effect: "BEES SLEEP LONGER",
    advantage: "sleepyFactor",
    give: (): number => sleepyBeesFactor,
  },
] as const satisfies readonly PrizeSpec<SweetSamAdvantages>[];

/** The advantages `owned` prizes give in Sweet Sam; other minigames' prizes do nothing here. */
export function sweetSamAdvantages(owned: readonly string[]): SweetSamAdvantages {
  return advantagesFrom(noAdvantages, sweetSamPrizes, owned);
}
