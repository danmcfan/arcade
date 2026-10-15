// Prizes: hub decorations bought at the prize counter with tickets. Once
// owned, a prize is always on: it shows by its minigame's cabinet and gives
// the player an advantage in every run of that minigame (the minigame applies
// it; for Sweet Sam see src/sweet-sam/advantages.ts). The catalogue is data, so a
// later minigame adds its prizes here. The Wallet (./wallet.ts) owns which are
// owned and the rule for buying them.

import { imagePrizes } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { SoftwareName } from "../game/software.ts";
import { prizeGreyY, prizeRects } from "../ui/prizeArt.ts";
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

/** Every decoration's art is one box this many pixels square (src/ui/prizeArt.ts). */
export const prizeBox = 8;

/**
 * The circle a cabinet's prizes hang on: centred over the cabinet, this far
 * below its top, this many pixels out to each prize's centre.
 */
const arcDrop = 4;
const arcRadius = 15;

/**
 * The top-left of a prize's box at `hour` on a clock face round `cabinet`'s
 * top (12 straight above, 9 to its left, 3 to its right), so it moves with
 * the cabinet.
 */
function hang(cabinet: SoftwareName, hour: number): { x: number; y: number } {
  const c = minigame(cabinet).hubRect;
  const angle = (hour / 12) * 2 * Math.PI;
  const cx = c.x + c.w / 2 + arcRadius * Math.sin(angle);
  const cy = c.y + arcDrop - arcRadius * Math.cos(angle);
  return { x: Math.round(cx - prizeBox / 2), y: Math.round(cy - prizeBox / 2) };
}

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
  /** The decoration greyed out, for the prize counter's owned prizes. */
  greySprite: Sprite;
  /** Top-left of the decoration, in hub-image coordinates. It is not solid. */
  x: number;
  y: number;
}

function decoration(id: PrizeId, y = 0): Sprite {
  const r = prizeRects[id];
  return sub(imagePrizes, r.x, y, r.x + r.w, y + r.h);
}

/**
 * Every prize, in the order the prize counter menu lists them, each hung on
 * the wall around its cabinet (`hang`): the 100-ticket prize at 12 o'clock.
 * Brass Monkey's arc runs 9 to 12, Firefly's 3 to 12, and Sweet Sam's
 * rainbow 10:15 to 1:45.
 */
export const prizes: readonly Prize[] = [
  {
    id: "honeyJar",
    name: "HONEY JAR",
    price: honeyJarPrice,
    effect: "+1 LIFE IN SWEET SAM",
    software: "sweetSam",
    sprite: decoration("honeyJar"),
    greySprite: decoration("honeyJar", prizeGreyY),
    ...hang("sweetSam", 10.25),
  },
  {
    id: "runningShoes",
    name: "RUNNING SHOES",
    price: runningShoesPrice,
    effect: "SAM RUNS FASTER",
    software: "sweetSam",
    sprite: decoration("runningShoes"),
    greySprite: decoration("runningShoes", prizeGreyY),
    ...hang("sweetSam", 1.75),
  },
  {
    id: "sleepyBees",
    name: "SLEEPY BEES",
    price: sleepyBeesPrice,
    effect: "BEES SLEEP LONGER",
    software: "sweetSam",
    sprite: decoration("sleepyBees"),
    greySprite: decoration("sleepyBees", prizeGreyY),
    ...hang("sweetSam", 12),
  },
  {
    id: "lantern",
    name: "LANTERN",
    price: lanternPrice,
    effect: "+1 LIFE IN FIREFLY",
    software: "firefly",
    sprite: decoration("lantern"),
    greySprite: decoration("lantern", prizeGreyY),
    ...hang("firefly", 3),
  },
  {
    id: "glowStick",
    name: "GLOW STICK",
    price: glowStickPrice,
    effect: "3 SPARKS AT ONCE",
    software: "firefly",
    sprite: decoration("glowStick"),
    greySprite: decoration("glowStick", prizeGreyY),
    ...hang("firefly", 1.5),
  },
  {
    id: "wings",
    name: "WINGS",
    price: wingsPrice,
    effect: "FIREFLY FLIES FASTER",
    software: "firefly",
    sprite: decoration("wings"),
    greySprite: decoration("wings", prizeGreyY),
    ...hang("firefly", 12),
  },
  {
    id: "oilCan",
    name: "OIL CAN",
    price: oilCanPrice,
    effect: "+1 LIFE IN BRASS MONKEY",
    software: "brassMonkey",
    sprite: decoration("oilCan"),
    greySprite: decoration("oilCan", prizeGreyY),
    ...hang("brassMonkey", 9),
  },
  {
    id: "springBoots",
    name: "SPRING BOOTS",
    price: springBootsPrice,
    effect: "JUMP HIGHER",
    software: "brassMonkey",
    sprite: decoration("springBoots"),
    greySprite: decoration("springBoots", prizeGreyY),
    ...hang("brassMonkey", 12),
  },
  {
    id: "pocketWatch",
    name: "POCKET WATCH",
    price: pocketWatchPrice,
    effect: "SLOWER BONUS",
    software: "brassMonkey",
    sprite: decoration("pocketWatch"),
    greySprite: decoration("pocketWatch", prizeGreyY),
    ...hang("brassMonkey", 10.5),
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
