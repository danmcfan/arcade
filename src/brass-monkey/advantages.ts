// The player's prizes in Brass Monkey (#40): each one's name, price and effect text
// beside the advantage it changes (#272). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./tuning.ts).

import { advantagesFrom, type PrizeSpec } from "../game/prize.ts";
import { bonusTicks, jumpSpeed, startLives } from "./tuning.ts";

/** Oil can: extra lives a run starts with (4 rather than 3). */
export const oilCanExtraLives = 1;

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
  /** A jump's upward speed, px a tick. */
  jumpSpeed: number;
  /** Ticks between the bonus's steps down. */
  bonusTicks: number;
};

/** No prizes: the game as #39 tuned it. */
export const noAdvantages: Readonly<BrassMonkeyAdvantages> = { lives: startLives, jumpSpeed, bonusTicks };

/** Brass Monkey's prizes, in the order the prize counter lists them. */
export const brassMonkeyPrizes = [
  {
    id: "oilCan",
    name: "OIL CAN",
    price: 25,
    effect: "+1 LIFE IN BRASS MONKEY",
    advantage: "lives",
    give: (lives: number): number => lives + oilCanExtraLives,
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
