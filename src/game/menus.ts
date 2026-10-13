// Labels for the menus the Game draws: the minigame pause menu and its
// controls panel, and the prize counter menu (a token, the prizes, CLOSE)
// over the hub. (The title
// scene's menus are in src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { ticketsPerToken, type TokenOffer } from "../arcade/prizeCounter.ts";
import { prizes, type Prize, type PrizeOffer } from "../arcade/prizes.ts";
import { moveControl, type ControlRow } from "../ui/menu.ts";
import type { SoftwareName } from "./software.ts";

export const minigamePauseMenu = ["RESUME", "CONTROLS", "QUIT GAME"] as const;
/** Index of QUIT GAME in `minigamePauseMenu`. */
export const quitGameIndex = 2;
/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

const standardControls: readonly ControlRow[] = [
  moveControl,
  { keys: [["SPACE"]], label: "ACTION" },
  { keys: [["ESC"]], label: "PAUSE" },
];

/** Each minigame's controls panel. For now every minigame has the same three rows. */
export const minigameControls: Readonly<Record<SoftwareName, readonly ControlRow[]>> = {
  sweetSam: standardControls,
  firefly: standardControls,
  brassMonkey: standardControls,
};

export const prizeCounterTitle = "PRIZE COUNTER";

/** The token item's label for each offer; "short" is the normal price, greyed out. */
export const tokenItemLabels: Readonly<Record<TokenOffer, string>> = {
  token: `TOKEN: ${ticketsPerToken} TICKETS`,
  lastChance: "LAST CHANCE: ALL TICKETS",
  short: `TOKEN: ${ticketsPerToken} TICKETS`,
};

/** A prize's item: its name and price, or OWNED once bought. */
export function prizeItemLabel(p: Prize, offer: PrizeOffer): string {
  return offer === "owned" ? `${p.name}: OWNED` : `${p.name}: ${p.price} TICKETS`;
}

export const closeItem = "CLOSE";
/** Index of the token item in the prize counter menu. */
export const tokenItemIndex = 0;
/** Index of the first prize in the prize counter menu; the rest follow in catalogue order. */
export const firstPrizeIndex = 1;
/** Index of CLOSE in the prize counter menu. */
export const closeItemIndex = firstPrizeIndex + prizes.length;

/** The prize counter menu: the token, each prize (`offers` in catalogue order), then CLOSE. */
export function prizeCounterItems(offer: TokenOffer, offers: readonly PrizeOffer[]): readonly string[] {
  const prizeItems = prizes.map((p, i) => {
    const prizeOffer = offers[i];
    if (prizeOffer === undefined) throw new Error(`prize counter: no offer for ${p.id}`);
    return prizeItemLabel(p, prizeOffer);
  });
  return [tokenItemLabels[offer], ...prizeItems, closeItem];
}
