// What the player's prizes do in Brass Monkey (#40). The hub hands over the
// owned prizes when a run starts; with none, every value is the game's own
// (./tuning.ts).

import type { PrizeId } from "../arcade/prizes.ts";
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
export interface BrassMonkeyAdvantages {
  lives: number;
  /** A jump's upward speed, px a tick. */
  jumpSpeed: number;
  /** Ticks between the bonus's steps down. */
  bonusTicks: number;
}

/** No prizes: the game as #39 tuned it. */
export const noAdvantages: Readonly<BrassMonkeyAdvantages> = { lives: startLives, jumpSpeed, bonusTicks };

/** The advantages `owned` prizes give in Brass Monkey; other minigames' prizes do nothing here. */
export function brassMonkeyAdvantages(owned: readonly PrizeId[]): BrassMonkeyAdvantages {
  return {
    lives: startLives + (owned.includes("oilCan") ? oilCanExtraLives : 0),
    jumpSpeed: owned.includes("springBoots") ? springBootsJumpSpeed : jumpSpeed,
    bonusTicks: owned.includes("pocketWatch") ? pocketWatchBonusTicks : bonusTicks,
  };
}
