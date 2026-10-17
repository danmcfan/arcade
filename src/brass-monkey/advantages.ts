// The player's prizes in Brass Monkey (#40): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./tuning.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";
import { bonusTicks, jumpSpeed, startLives } from "./tuning.ts";

/** Umbrella: hazards a run shrugs off; the first to touch the monkey bounces away (#268). */
export const umbrellaHits = 1;

/**
 * Spring boots: a jump's upward speed, in px a tick. With `gravity` the
 * monkey rises 19.125 px rather than 15: still less than the 20 px a fall may
 * drop (`maxFall`) and less than the closest girder above any girder (21 px),
 * so it lands back where it jumped and can't skip a ladder.
 */
export const springBootsJumpSpeed = 2.25;

/** Pocket watch: the bonus drops a step every this many ticks rather than `bonusTicks` (120). */
export const pocketWatchBonusTicks = 180;

/** The values a Brass Monkey run starts with. */
export type BrassMonkeyAdvantages = {
  lives: number;
  /** Hazards the run shrugs off: each touch uses one, and the hazard bounces away. */
  umbrellas: number;
  /** A jump's upward speed, px a tick. */
  jumpSpeed: number;
  /** Ticks between the bonus's steps down. */
  bonusTicks: number;
};

/** No prizes: the game as #39 tuned it. */
export const noAdvantages: Readonly<BrassMonkeyAdvantages> = { lives: startLives, umbrellas: 0, jumpSpeed, bonusTicks };

/** Brass Monkey's prizes, in the order the prize counter lists them. */
export const brassMonkeyPrizes = [
  {
    id: "umbrella",
    name: "UMBRELLA",
    price: 25,
    effect: "FIRST HIT BOUNCES OFF",
    advantage: "umbrellas",
    give: (): number => umbrellaHits,
  },
  {
    id: "springBoots",
    name: "SPRING BOOTS",
    price: 50,
    effect: "JUMP HIGHER",
    advantage: "jumpSpeed",
    give: (): number => springBootsJumpSpeed,
  },
  {
    id: "pocketWatch",
    name: "POCKET WATCH",
    price: 100,
    effect: "SLOWER BONUS",
    advantage: "bonusTicks",
    give: (): number => pocketWatchBonusTicks,
  },
] as const satisfies readonly PrizeSpec<BrassMonkeyAdvantages>[];

/** The advantages `owned` prizes give in Brass Monkey; other minigames' prizes do nothing here. */
export function brassMonkeyAdvantages(owned: readonly string[]): BrassMonkeyAdvantages {
  return advantagesFrom(noAdvantages, brassMonkeyPrizes, owned);
}
