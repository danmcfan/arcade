// The Wallet: the arcade's economy in one place. It owns the player's tokens,
// tickets, owned prizes and the hub high score, and every rule that changes
// them: what a cabinet start costs, what a run pays, and what the prize
// counter sells. Nothing else changes those numbers; the snapshot and the
// save are projections of `toProgress()`, and `version` tells the title scene
// when to save.

import type { RunKindSnapshot } from "../game/snapshot.ts";
import { prize, prizes, type PrizeId } from "./prizes.ts";

/** Tokens a New game starts with. */
export const startingTokens = 5;

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
 * The deal the token item offers: a token for `ticketsPerToken` tickets,
 * the last-chance token (all the tickets, even 0, when there are no tokens
 * and too few tickets), or nothing ("short": tokens left but too few tickets).
 */
export type TokenOffer = "token" | "lastChance" | "short";

/** Whether a prize can be bought: "buy", "owned" (bought already) or "short" (too few tickets). */
export type PrizeOffer = "buy" | "owned" | "short";

/** What the prize counter offers: the token, and every prize in catalogue order. */
export interface CounterOffers {
  token: TokenOffer;
  prizes: PrizeOffer[];
}

/** What the Wallet holds, as saved and restored. */
export interface WalletProgress {
  highScore: number;
  tokens: number;
  tickets: number;
  /** Owned prizes, in catalogue order. */
  prizes: PrizeId[];
}

const newGame: WalletProgress = { highScore: 0, tokens: startingTokens, tickets: 0, prizes: [] };

/** `ids` without repeats, in catalogue order: how owned prizes are kept. */
function inCatalogueOrder(ids: readonly PrizeId[]): PrizeId[] {
  return prizes.filter((p) => ids.includes(p.id)).map((p) => p.id);
}

export class Wallet {
  private _highScore: number;
  private _tokens: number;
  private _tickets: number;
  private _prizes: PrizeId[];
  private _version = 0;

  /** A New game's wallet, or one restored from a save. */
  constructor(from: WalletProgress = newGame) {
    this._highScore = from.highScore;
    this._tokens = from.tokens;
    this._tickets = from.tickets;
    this._prizes = inCatalogueOrder(from.prizes);
  }

  get highScore(): number {
    return this._highScore;
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
   * A run that ended (not quit): keep the best score as the high score, and
   * pay `ticketsFor(score)` for a paid run.
   * Returns the tickets paid.
   */
  settleRun(score: number, run: RunKind): number {
    const tickets = run === "paid" ? ticketsFor(score) : 0;
    if (score > this._highScore || tickets > 0) this._version++;
    this._highScore = Math.max(this._highScore, score);
    this._tickets += tickets;
    return tickets;
  }

  /** What the prize counter offers. */
  counter(): CounterOffers {
    return { token: this.tokenOffer(), prizes: prizes.map((p) => this.prizeOffer(p.id)) };
  }

  /** Buy a token or a prize at the counter; false when it can't be bought. */
  buy(item: "token" | PrizeId): boolean {
    if (item === "token") {
      switch (this.tokenOffer()) {
        case "token":
          this._tokens++;
          this._tickets -= ticketsPerToken;
          break;
        case "lastChance":
          this._tokens = 1;
          this._tickets = 0;
          break;
        case "short":
          return false;
      }
    } else {
      if (this.prizeOffer(item) !== "buy") return false;
      this._tickets -= prize(item).price;
      this._prizes = inCatalogueOrder([...this._prizes, item]);
    }
    this._version++;
    return true;
  }

  toProgress(): WalletProgress {
    return { highScore: this._highScore, tokens: this._tokens, tickets: this._tickets, prizes: [...this._prizes] };
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
