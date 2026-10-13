// Prizes: hub decorations bought at the prize counter with tickets. Once
// owned, a prize is always on: it shows by its minigame's cabinet and gives
// the player an advantage in every run of that minigame (the minigame applies
// it; for Sweet Sam see src/hive/advantages.ts). The catalogue is data, so a
// later minigame adds its prizes here. The purchase rule is pure, so the
// Game's menu and the tests share it.

import { imagePrizes } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { SoftwareName } from "../game/software.ts";
import { prizeRects } from "../ui/prizeArt.ts";

export type PrizeId = "honeyJar" | "runningShoes" | "sleepyBees";

/** Tickets each prize costs. */
export const honeyJarPrice = 25;
export const runningShoesPrice = 50;
export const sleepyBeesPrice = 100;

export interface Prize {
  id: PrizeId;
  /** Player-facing name, as the prize counter menu shows it. */
  name: string;
  /** Tickets it costs. */
  price: number;
  /** The minigame it gives an advantage in. */
  software: SoftwareName;
  /** Its decoration in the hub. */
  sprite: Sprite;
  /** Top-left of the decoration, in hub-image coordinates. It is not solid. */
  x: number;
  y: number;
}

function decoration(id: PrizeId): Sprite {
  const r = prizeRects[id];
  return sub(imagePrizes, r.x, 0, r.x + r.w, r.h);
}

/**
 * Every prize, in the order the prize counter menu lists them. The Sweet Sam
 * cabinet's art is x 72..87, y 40..63 of the hub image: the jar and the shoe
 * stand on the floor against either side of it, the picture hangs on the
 * wall above it.
 */
export const prizes: readonly Prize[] = [
  { id: "honeyJar", name: "HONEY JAR", price: honeyJarPrice, software: "hive", sprite: decoration("honeyJar"), x: 65, y: 55 },
  { id: "runningShoes", name: "RUNNING SHOES", price: runningShoesPrice, software: "hive", sprite: decoration("runningShoes"), x: 87, y: 58 },
  { id: "sleepyBees", name: "SLEEPY BEES", price: sleepyBeesPrice, software: "hive", sprite: decoration("sleepyBees"), x: 74, y: 28 },
];

const prizeIds: readonly string[] = prizes.map((p) => p.id);

export function isPrizeId(v: unknown): v is PrizeId {
  return typeof v === "string" && prizeIds.includes(v);
}

export function prize(id: PrizeId): Prize {
  return prizes.find((p) => p.id === id)!;
}

/** `ids` without repeats, in catalogue order: how owned prizes are kept. */
export function inCatalogueOrder(ids: readonly PrizeId[]): PrizeId[] {
  return prizes.filter((p) => ids.includes(p.id)).map((p) => p.id);
}

/** What the player has to spend and already owns. */
export interface PrizeWallet {
  tickets: number;
  prizes: readonly PrizeId[];
}

/** Whether a prize can be bought: "buy", "owned" (bought already) or "short" (too few tickets). */
export type PrizeOffer = "buy" | "owned" | "short";

export function prizeOffer(w: PrizeWallet, id: PrizeId): PrizeOffer {
  if (w.prizes.includes(id)) return "owned";
  return w.tickets >= prize(id).price ? "buy" : "short";
}

/** Every prize's offer, in catalogue order. */
export function prizeOffers(w: PrizeWallet): PrizeOffer[] {
  return prizes.map((p) => prizeOffer(w, p.id));
}

/** The wallet after buying prize `id`, or null when it can't be bought. */
export function buyPrize(w: PrizeWallet, id: PrizeId): { tickets: number; prizes: PrizeId[] } | null {
  if (prizeOffer(w, id) !== "buy") return null;
  return { tickets: w.tickets - prize(id).price, prizes: inCatalogueOrder([...w.prizes, id]) };
}
