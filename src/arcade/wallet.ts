// The Wallet: the arcade's economy in one place. It owns the player's tokens,
// tickets, owned prizes and the player's high score on each machine, and every rule that changes
// them: what a cabinet start costs, what a run pays, what the change machine
// exchanges and what the prize counter sells. Nothing else changes those numbers; the snapshot and the
// save are projections of `toProgress()`, and `version` tells the title scene
// when to save.

import type { RunKindSnapshot } from "../game/snapshot.ts";
import type { SoftwareName } from "../game/software.ts";
import { prize, prizes, type PrizeId } from "./prizes.ts";

/** Tokens a New game starts with. */
export const startingTokens = 5;

/** A high score per machine. */
export type HighScores = Readonly<Record<SoftwareName, number>>;

/** A high score per machine, each one `of` its machine. */
export function eachMachine(of: (machine: SoftwareName) => number): HighScores {
  return { sweetSam: of("sweetSam"), firefly: of("firefly"), brassMonkey: of("brassMonkey") };
}

/**
 * Each machine's house high score: fixed by the arcade, the same for every
 * save. A strong run with no prizes falls short; one with that machine's
 * prizes beats it.
 */
export const houseHighScores: HighScores = { sweetSam: 30000, firefly: 40000, brassMonkey: 25000 };

/** A New game's player high scores. */
export const noHighScores: HighScores = eachMachine(() => 0);

/** Tickets one token costs at the normal price. */
export const ticketsPerToken = 5;

/** Points per ticket. */
export const pointsPerTicket = 100;

/** Tickets a paid run scoring `score` pays: 1 per 100 points rounded down, at least 1. */
export function ticketsFor(score: number): number {
  return Math.max(1, Math.floor(score / pointsPerTicket));
}

/**
 * How a minigame was started: at a cabinet for a token ("paid"), at a cabinet
 * with no tokens ("free", free play), or straight from `game.New(software)`
 * without the hub ("direct": the parity fixtures and
 * `?scene=game&software=`), which costs nothing and pays nothing.
 */
export type RunKind = RunKindSnapshot;

/**
 * What a press of the change machine does: a token for `ticketsPerToken`
 * tickets, the last-chance token (all the tickets, even 0, when there are no
 * tokens and too few tickets), or nothing ("short": tokens left but too few
 * tickets).
 */
export type TokenOffer = "token" | "lastChance" | "short";

/** Whether a prize can be bought: "buy", "owned" (bought already) or "short" (too few tickets). */
export type PrizeOffer = "buy" | "owned" | "short";

/** What the prize counter offers: every prize in catalogue order. */
export interface CounterOffers {
  prizes: PrizeOffer[];
}

/** What the Wallet holds, as saved and restored. */
export interface WalletProgress {
  /** The player's high score on each machine. */
  highScores: HighScores;
  tokens: number;
  tickets: number;
  /** Owned prizes, in catalogue order. */
  prizes: PrizeId[];
}

const newGame: WalletProgress = { highScores: noHighScores, tokens: startingTokens, tickets: 0, prizes: [] };

/** `ids` without repeats, in catalogue order: how owned prizes are kept. */
function inCatalogueOrder(ids: readonly PrizeId[]): PrizeId[] {
  return prizes.filter((p) => ids.includes(p.id)).map((p) => p.id);
}

export class Wallet {
  private _highScores: Record<SoftwareName, number>;
  private _tokens: number;
  private _tickets: number;
  private _prizes: PrizeId[];
  private _version = 0;

  /** A New game's wallet, or one restored from a save. */
  constructor(from: WalletProgress = newGame) {
    this._highScores = { ...from.highScores };
    this._tokens = from.tokens;
    this._tickets = from.tickets;
    this._prizes = inCatalogueOrder(from.prizes);
  }

  /** The player's high score on `machine`. */
  highScore(machine: SoftwareName): number {
    return this._highScores[machine];
  }

  /** The player's high score on `machine` once it beats the house high score; null while it does not. */
  beatenHighScore(machine: SoftwareName): number | null {
    return this.beaten(machine) ? this._highScores[machine] : null;
  }

  /** Beaten: the player's high score on `machine` is above its house high score. */
  beaten(machine: SoftwareName): boolean {
    return this._highScores[machine] > houseHighScores[machine];
  }

  /** What the machine's HI shows: the house high score until it is beaten, then the player's. */
  shownHighScore(machine: SoftwareName): number {
    return this.beaten(machine) ? this._highScores[machine] : houseHighScores[machine];
  }

  get tokens(): number {
    return this._tokens;
  }

  get tickets(): number {
    return this._tickets;
  }

  /** Owned prizes, in catalogue order. */
  get prizes(): readonly PrizeId[] {
    return this._prizes;
  }

  /** Goes up on every change, so a caller can tell the Wallet changed without comparing fields. */
  get version(): number {
    return this._version;
  }

  owns(id: PrizeId): boolean {
    return this._prizes.includes(id);
  }

  /** A cabinet start: spend a token, or play free when there are none. */
  startRun(): "paid" | "free" {
    if (this._tokens === 0) return "free";
    this._tokens--;
    this._version++;
    return "paid";
  }

  /**
   * A run on `machine` that ended (not quit): keep the best score as the
   * player's high score on that machine, and pay `ticketsFor(score)` for a paid run.
   * Returns the tickets paid.
   */
  settleRun(machine: SoftwareName, score: number, run: RunKind): number {
    const tickets = run === "paid" ? ticketsFor(score) : 0;
    if (score > this._highScores[machine] || tickets > 0) this._version++;
    this._highScores[machine] = Math.max(this._highScores[machine], score);
    this._tickets += tickets;
    return tickets;
  }

  /** What the prize counter offers. */
  counter(): CounterOffers {
    return { prizes: prizes.map((p) => this.prizeOffer(p.id)) };
  }

  /** Whether `buy(id)` would succeed: the prize counter greys out the rest. */
  canBuy(id: PrizeId): boolean {
    return this.prizeOffer(id) === "buy";
  }

  /** Buy a prize at the counter; false when it can't be bought. */
  buy(id: PrizeId): boolean {
    if (this.prizeOffer(id) !== "buy") return false;
    this._tickets -= prize(id).price;
    this._prizes = inCatalogueOrder([...this._prizes, id]);
    this._version++;
    return true;
  }

  /** One press of the change machine: trade tickets for a token if it can, and say which deal it was. */
  exchange(): TokenOffer {
    const offer = this.tokenOffer();
    switch (offer) {
      case "token":
        this._tokens++;
        this._tickets -= ticketsPerToken;
        break;
      case "lastChance":
        this._tokens = 1;
        this._tickets = 0;
        break;
      case "short":
        return offer;
    }
    this._version++;
    return offer;
  }

  toProgress(): WalletProgress {
    return {
      highScores: { ...this._highScores },
      tokens: this._tokens,
      tickets: this._tickets,
      prizes: [...this._prizes],
    };
  }

  private tokenOffer(): TokenOffer {
    if (this._tickets >= ticketsPerToken) return "token";
    if (this._tokens === 0) return "lastChance";
    return "short";
  }

  private prizeOffer(id: PrizeId): PrizeOffer {
    if (this.owns(id)) return "owned";
    return this._tickets >= prize(id).price ? "buy" : "short";
  }
}
