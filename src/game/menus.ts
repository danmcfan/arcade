// Labels for the menus the Game draws: the minigame pause menu (each
// minigame's controls panel is in ./minigames.ts), and the prize counter menu
// (a token, the prizes, CLOSE) over the hub. (The title scene's menus are in
// src/title/menus.ts; the drawing is in src/ui/menu.ts.)

import { prizes, type PrizeId } from "../arcade/prizes.ts";
import { ticketsPerToken, type TokenOffer, type Wallet } from "../arcade/wallet.ts";
import type { MenuItem } from "./menu.ts";

/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

export const prizeCounterTitle = "PRIZE COUNTER";

/** The token item's label and price for each offer; "short" is the normal price, greyed out. */
export const tokenItems: Readonly<Record<TokenOffer, { label: string; value: string }>> = {
  token: { label: "TOKEN", value: `${ticketsPerToken}` },
  lastChance: { label: "LAST CHANCE", value: "ALL" },
  short: { label: "TOKEN", value: `${ticketsPerToken}` },
};

export const closeItem = "CLOSE";

/** What the Game does for the minigame pause menu's items. */
export interface MinigamePauseActions {
  resume: () => void;
  controls: () => void;
  quit: () => void;
}

/** The minigame pause menu: Resume, Controls, and Quit game (with NO TICKETS beside it). */
export function minigamePauseItems(a: MinigamePauseActions): MenuItem[] {
  return [
    { label: "RESUME", enabled: true, choose: a.resume },
    { label: "CONTROLS", enabled: true, choose: a.controls },
    { label: "QUIT GAME", note: quitGameNote, enabled: true, choose: a.quit },
  ];
}

/**
 * The prize counter menu: the token, each prize (in catalogue order, its
 * price or OWNED), then CLOSE. Each item asks the Wallet whether it can be
 * bought, and choosing it buys it.
 */
export function prizeCounterItems(wallet: Wallet, close: () => void): MenuItem[] {
  const buy = (item: "token" | PrizeId): void => {
    wallet.buy(item);
  };
  const token = tokenItems[wallet.counter().token];
  return [
    { ...token, enabled: wallet.canBuy("token"), choose: (): void =>{  buy("token"); } },
    ...prizes.map((p) => ({
      label: p.name,
      value: wallet.owns(p.id) ? "OWNED" : `${p.price}`,
      enabled: wallet.canBuy(p.id),
      choose: (): void =>{  buy(p.id); },
    })),
    { label: closeItem, value: "", enabled: true, choose: close },
  ];
}
