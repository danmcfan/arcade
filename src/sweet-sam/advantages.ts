// The player's prizes in Sweet Sam (#22): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./levels.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";

/** Lives a run starts with. */
export const startingLives = 3;

/** Smoke bomb: uses a life gets, each one turning the bear invisible to the bees (#268). */
export const smokeBombUses = 1;

/** Ticks a smoke bomb keeps the bear invisible: 5 s, about level 2's sleepy time (Dossier, Table A.1). */
export const smokeTicks = 300;

/** Ticks before the smoke clears that the bear flashes back into colour, as a warning. */
export const smokeWarningTicks = 60;

/** Running shoes: the bear's normal speed (`LevelValues.bearVelocity`) is 12.5% faster on every level. */
export const runningShoesSpeedFactor = 1.125;

/** Sleepy bees: each level's sleepy time is multiplied by this (9 s rather than 6 on level 1). */
export const sleepyBeesFactor = 1.5;

/** The values a Sweet Sam run starts with. */
export type SweetSamAdvantages = {
  lives: number;
  /** Smoke bombs each life gets: the action button turns the bear invisible to the bees for `smokeTicks`. */
  smokeBombs: number;
  /** Multiplies the level's bear speed while no bee is sleepy (`LevelValues.bearVelocity`). */
  playerSpeedFactor: number;
  /** Multiplies the level's sleepy time (`LevelValues.sleepyFrames`). */
  sleepyFactor: number;
};

/** No prizes: the original game. */
export const noAdvantages: Readonly<SweetSamAdvantages> = {
  lives: startingLives,
  smokeBombs: 0,
  playerSpeedFactor: 1,
  sleepyFactor: 1,
};

/** Sweet Sam's prizes, in the order the prize counter lists them. */
export const sweetSamPrizes = [
  {
    id: "smokeBomb",
    name: "SMOKE BOMB",
    price: 25,
    effect: "SPACE: HIDE FROM BEES",
    advantage: "smokeBombs",
    give: (): number => smokeBombUses,
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
