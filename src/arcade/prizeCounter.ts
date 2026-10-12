// The prize counter: where the player spends tickets on tokens. It stands
// against the bottom wall of the hub, across the room from the cabinets, and
// is solid like a wall. The purchase rule is pure, so the Game's menu and the
// tests share it.

import type { Rect } from "./collision.ts";

/** Tickets one token costs at the normal price. */
export const ticketsPerToken = 5;

/**
 * Where the counter stands, in hub-image coordinates: centred on the floor,
 * its bottom edge on the bottom wall (y 120). Its top edge stays below the
 * player's start position, so a new game does not start at the counter.
 */
export const counterRect: Readonly<Rect> = { x: 60, y: 106, w: 40, h: 14 };

/** The player's tokens and tickets. */
export interface Wallet {
  tokens: number;
  tickets: number;
}

/**
 * The deal the token item offers: a token for `ticketsPerToken` tickets,
 * the last-chance token (all the tickets, even 0, when there are no tokens
 * and too few tickets), or nothing ("short": tokens left but too few tickets).
 */
export type TokenOffer = "token" | "lastChance" | "short";

export function tokenOffer(w: Wallet): TokenOffer {
  if (w.tickets >= ticketsPerToken) return "token";
  if (w.tokens === 0) return "lastChance";
  return "short";
}

/** The wallet after buying one token, or null when it can't be bought. */
export function buyToken(w: Wallet): Wallet | null {
  switch (tokenOffer(w)) {
    case "token":
      return { tokens: w.tokens + 1, tickets: w.tickets - ticketsPerToken };
    case "lastChance":
      return { tokens: 1, tickets: 0 };
    case "short":
      return null;
  }
}
