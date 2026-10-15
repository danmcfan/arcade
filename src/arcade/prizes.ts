// Prizes: hub decorations bought at the prize counter with tickets. Once
// owned, a prize is always on: it shows by its minigame's cabinet and gives
// the player an advantage in every run of that minigame (the minigame applies
// it; for Sweet Sam see src/sweet-sam/advantages.ts). The catalogue is data, so a
// later minigame adds its prizes here. The Wallet (./wallet.ts) owns which are
// owned and the rule for buying them.

import { imagePrizes } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { SoftwareName } from "../game/software.ts";
import { prizeRects } from "../ui/prizeArt.ts";
import { minigame } from "../game/minigames.ts";

export type PrizeId =
  | "honeyJar"
  | "runningShoes"
  | "sleepyBees"
  | "lantern"
  | "glowStick"
  | "wings"
  | "oilCan"
  | "springBoots"
  | "pocketWatch";

/** Tickets each prize costs. */
export const honeyJarPrice = 25;
export const runningShoesPrice = 50;
export const sleepyBeesPrice = 100;
export const lanternPrice = 25;
export const glowStickPrice = 50;
export const wingsPrice = 100;
export const oilCanPrice = 25;
export const springBootsPrice = 50;
export const pocketWatchPrice = 100;

// Every prize hangs on the wall at an offset from its own cabinet, so it moves with it.
const sweetCabinet = minigame("sweetSam").hubRect;
const fireflyCabinet = minigame("firefly").hubRect;
const brassCabinet = minigame("brassMonkey").hubRect;

export interface Prize {
  id: PrizeId;
  /** Player-facing name, as the prize counter menu shows it. */
  name: string;
  /** Tickets it costs. */
  price: number;
  /** What it does, as the prize counter's info panel says it. */
  effect: string;
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
 * Every prize, in the order the prize counter menu lists them, each hung on
 * the wall around its cabinet (a cabinet's art is 16x24 from its rect's
 * top-left, `hubRect` in src/game/minigames.ts). Sweet Sam: the picture above the cabinet, the
 * jar and the shoes either side of the picture. Brass Monkey: the oil can on a
 * shelf left of the cabinet, the spring boots and the pocket watch on pegs
 * above it. Firefly: see below.
 */
export const prizes: readonly Prize[] = [
  {
    id: "honeyJar",
    name: "HONEY JAR",
    price: honeyJarPrice,
    effect: "+1 LIFE IN SWEET SAM",
    software: "sweetSam",
    sprite: decoration("honeyJar"),
    x: sweetCabinet.x - 9,
    y: sweetCabinet.y - 11,
  },
  {
    id: "runningShoes",
    name: "RUNNING SHOES",
    price: runningShoesPrice,
    effect: "SAM RUNS FASTER",
    software: "sweetSam",
    sprite: decoration("runningShoes"),
    x: sweetCabinet.x + 17,
    y: sweetCabinet.y - 9,
  },
  {
    id: "sleepyBees",
    name: "SLEEPY BEES",
    price: sleepyBeesPrice,
    effect: "BEES SLEEP LONGER",
    software: "sweetSam",
    sprite: decoration("sleepyBees"),
    x: sweetCabinet.x + 2,
    y: sweetCabinet.y - 12,
  },
  // The wall runs 11 px above the Firefly cabinet's top to 13 px below it.
  // The lantern hangs from its bracket right of the cabinet, the glow stick in
  // the gap left of it, the wings above it.
  {
    id: "lantern",
    name: "LANTERN",
    price: lanternPrice,
    effect: "+1 LIFE IN FIREFLY",
    software: "firefly",
    sprite: decoration("lantern"),
    x: fireflyCabinet.x + 17,
    y: fireflyCabinet.y - 4,
  },
  {
    id: "glowStick",
    name: "GLOW STICK",
    price: glowStickPrice,
    effect: "3 SPARKS AT ONCE",
    software: "firefly",
    sprite: decoration("glowStick"),
    x: fireflyCabinet.x - 4,
    y: fireflyCabinet.y - 6,
  },
  {
    id: "wings",
    name: "WINGS",
    price: wingsPrice,
    effect: "FIREFLY FLIES FASTER",
    software: "firefly",
    sprite: decoration("wings"),
    x: fireflyCabinet.x + 2,
    y: fireflyCabinet.y - 9,
  },
  {
    id: "oilCan",
    name: "OIL CAN",
    price: oilCanPrice,
    effect: "+1 LIFE IN BRASS MONKEY",
    software: "brassMonkey",
    sprite: decoration("oilCan"),
    x: brassCabinet.x - 13,
    y: brassCabinet.y + 1,
  },
  {
    id: "springBoots",
    name: "SPRING BOOTS",
    price: springBootsPrice,
    effect: "JUMP HIGHER",
    software: "brassMonkey",
    sprite: decoration("springBoots"),
    x: brassCabinet.x,
    y: brassCabinet.y - 13,
  },
  {
    id: "pocketWatch",
    name: "POCKET WATCH",
    price: pocketWatchPrice,
    effect: "SLOWER BONUS",
    software: "brassMonkey",
    sprite: decoration("pocketWatch"),
    x: brassCabinet.x + 14,
    y: brassCabinet.y - 12,
  },
];

const prizeIds: ReadonlySet<string> = new Set(prizes.map((p) => p.id));

export function isPrizeId(v: unknown): v is PrizeId {
  return typeof v === "string" && prizeIds.has(v);
}

export function prize(id: PrizeId): Prize {
  const found = prizes.find((p) => p.id === id);
  if (found === undefined) throw new Error(`prize: unknown prize id ${id}`);
  return found;
}
