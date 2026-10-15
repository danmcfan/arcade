// Labels for the menus the Game draws: the minigame pause menu (each
// minigame's controls panel is in ./minigames.ts), and the prize counter menu
// (a token, the prizes, CLOSE) over the hub. (The title scene's menus are in
// src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { prizes, type Prize } from "../arcade/prizes.ts";
import { ticketsPerToken, type CounterOffers, type PrizeOffer, type TokenOffer } from "../arcade/wallet.ts";

export const minigamePauseMenu = ["RESUME", "CONTROLS", "QUIT GAME"] as const;
/** Index of QUIT GAME in `minigamePauseMenu`. */
export const quitGameIndex = 2;
/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

export const prizeCounterTitle = "PRIZE COUNTER";

/** One prize counter item: its name on the left, its price in tickets (or OWNED, ALL) on the right. */
export interface CounterItem {
  label: string;
  value: string;
}

/** The token item for each offer; "short" is the normal price, greyed out. */
export const tokenItems: Readonly<Record<TokenOffer, CounterItem>> = {
  token: { label: "TOKEN", value: `${ticketsPerToken}` },
  lastChance: { label: "LAST CHANCE", value: "ALL" },
  short: { label: "TOKEN", value: `${ticketsPerToken}` },
};

/** A prize's item: its name and price, or OWNED once bought. */
export function prizeItem(p: Prize, offer: PrizeOffer): CounterItem {
  return { label: p.name, value: offer === "owned" ? "OWNED" : `${p.price}` };
}

export const closeItem = "CLOSE";
/** Index of the token item in the prize counter menu. */
export const tokenItemIndex = 0;
/** Index of the first prize in the prize counter menu; the rest follow in catalogue order. */
export const firstPrizeIndex = 1;
/** Index of CLOSE in the prize counter menu. */
export const closeItemIndex = firstPrizeIndex + prizes.length;

/** The prize counter menu: the token, each prize (in catalogue order), then CLOSE. */
export function prizeCounterItems(offers: CounterOffers): readonly CounterItem[] {
  const prizeItems = prizes.map((p, i) => {
    const prizeOffer = offers.prizes[i];
    if (prizeOffer === undefined) throw new Error(`prize counter: no offer for ${p.id}`);
    return prizeItem(p, prizeOffer);
  });
  return [tokenItems[offers.token], ...prizeItems, { label: closeItem, value: "" }];
}
