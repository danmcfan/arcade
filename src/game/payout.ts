// The payout: the menu shown when a minigame ends, which turns its score into
// tickets. The score spins down 100 at a time while the tickets spin up one
// at a time, on the shared slot-machine reels. Space skips to the totals,
// and Space again closes it. After free play it only shows the score.
// Pure game state: the Game plays the sounds and draws it.

import { bootReels, digits6, newDigitReels, syncAndTick, type DigitReels } from "../ui/digitReel.ts";
import type { PayoutSnapshot } from "./snapshot.ts";

/** Points per ticket. */
export const pointsPerTicket = 100;

/**
 * Ticks between two tickets. Longer than a digit spin (18 ticks), because a
 * reel ignores a new target while it is still spinning. There is no cap for
 * big scores: Space skips to the totals.
 */
export const ticksPerTicket = 20;

/** Tickets a run pays: 1 per 100 points rounded down, at least 1; none after free play. */
export function ticketsFor(score: number, freePlay: boolean): number {
  if (freePlay) return 0;
  return Math.max(1, Math.floor(score / pointsPerTicket));
}

export class Payout {
  /** Score still shown; counts down to 0. */
  score: number;
  /** Tickets shown so far; counts up to `total`. */
  tickets = 0;
  readonly total: number;
  /** The numbers or their reels are still moving. */
  counting: boolean;
  /** Closed: the Game returns to the hub. */
  done = false;
  readonly scoreReels: DigitReels = newDigitReels();
  readonly ticketReels: DigitReels = newDigitReels();
  private timer = 0;

  constructor(
    score: number,
    readonly freePlay: boolean,
  ) {
    this.score = score;
    this.total = ticketsFor(score, freePlay);
    this.counting = !freePlay;
    bootReels(this.scoreReels, score);
    bootReels(this.ticketReels, 0);
  }

  /** One tick; `space` is a Space press this tick. Returns true when a ticket was paid (play its sound). */
  step(space: boolean): boolean {
    if (this.done) return false;
    if (space) {
      if (this.counting) this.skip();
      else this.done = true;
      return false;
    }
    if (!this.counting) return false;

    let paid = false;
    if (this.score > 0 || this.tickets < this.total) {
      this.timer++;
      if (this.timer >= ticksPerTicket) {
        this.timer = 0;
        if (this.tickets < this.total) {
          this.tickets++;
          this.score = Math.max(0, this.score - pointsPerTicket);
          paid = true;
        } else {
          this.score = 0;
        }
      }
    }
    syncAndTick(this.scoreReels, digits6(this.score));
    syncAndTick(this.ticketReels, digits6(this.tickets));
    const settled = [...this.scoreReels, ...this.ticketReels].every((r) => !r.active);
    if (this.score === 0 && this.tickets === this.total && settled) this.counting = false;
    return paid;
  }

  private skip(): void {
    this.score = 0;
    this.tickets = this.total;
    this.counting = false;
    bootReels(this.scoreReels, 0);
    bootReels(this.ticketReels, this.total);
  }

  snapshot(): PayoutSnapshot {
    return {
      score: this.score,
      tickets: this.tickets,
      total: this.total,
      freePlay: this.freePlay,
      counting: this.counting,
    };
  }
}
