// The prize counter: where the player spends tickets on tokens, at the prize
// desk (src/arcade/desk.ts). The purchase rule is pure, so the Game's menu and
// the tests share it.

/** Tickets one token costs at the normal price. */
export const ticketsPerToken = 5;

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
      break;
  }
  return null;
}
