// The player's prizes in Sweet Sam (#22): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./levels.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";

/** Lives a run starts with. */
export const startingLives = 3;

/** Honey jar: extra lives a run starts with. */
export const honeyJarExtraLives = 1;

/** Running shoes: the bear's normal speed (`LevelValues.bearVelocity`) is 12.5% faster on every level. */
export const runningShoesSpeedFactor = 1.125;

/** Sleepy bees: each level's sleepy time is multiplied by this (9 s rather than 6 on level 1). */
export const sleepyBeesFactor = 1.5;

/** The values a Sweet Sam run starts with. */
export type SweetSamAdvantages = {
  lives: number;
  /** Multiplies the level's bear speed while no bee is sleepy (`LevelValues.bearVelocity`). */
  playerSpeedFactor: number;
  /** Multiplies the level's sleepy time (`LevelValues.sleepyFrames`). */
  sleepyFactor: number;
};

/** No prizes: the original game. */
export const noAdvantages: Readonly<SweetSamAdvantages> = {
  lives: startingLives,
  playerSpeedFactor: 1,
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
    advantage: "playerSpeedFactor",
    give: (): number => runningShoesSpeedFactor,
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
