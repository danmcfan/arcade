// The player's prizes in Firefly (#35): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the owned
// prizes when a run starts; with none, every value is the game's own
// (./rules.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";
import { maxSparks, playerSpeed, startLives } from "./rules.ts";

/** Firecracker: screen clears each stage gets, set off with a double tap of up (#268). */
export const firecrackerUses = 1;

/** Glow stick: sparks allowed on the screen at once (rather than 2). */
export const glowStickMaxSparks = 3;

/** Wings: the firefly's speed, in px per tick (25% faster than 2). */
export const wingsPlayerSpeed = 2.5;

/** The values a Firefly run starts with. */
export type FireflyAdvantages = {
  lives: number;
  /** Firecrackers each stage gets: up shoots down every enemy in the sky. */
  firecrackers: number;
  maxSparks: number;
  playerSpeed: number;
};

/** No prizes: the original game. */
export const noAdvantages: Readonly<FireflyAdvantages> = { lives: startLives, firecrackers: 0, maxSparks, playerSpeed };

/** Firefly's prizes, in the order the prize counter lists them. */
export const fireflyPrizes = [
  {
    id: "firecracker",
    name: "FIRECRACKER",
    price: 25,
    effect: "UP UP: CLEARS THE SKY",
    advantage: "firecrackers",
    give: (): number => firecrackerUses,
  },
  {
    id: "glowStick",
    name: "GLOW STICK",
    price: 50,
    effect: "3 SPARKS AT ONCE",
    advantage: "maxSparks",
    give: (): number => glowStickMaxSparks,
  },
  {
    id: "wings",
    name: "WINGS",
    price: 100,
    effect: "FIREFLY FLIES FASTER",
    advantage: "playerSpeed",
    give: (): number => wingsPlayerSpeed,
  },
] as const satisfies readonly PrizeSpec<FireflyAdvantages>[];

/** The advantages `owned` prizes give in Firefly; other minigames' prizes do nothing here. */
export function fireflyAdvantages(owned: readonly string[]): FireflyAdvantages {
  return advantagesFrom(noAdvantages, fireflyPrizes, owned);
}
