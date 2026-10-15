// Prizes: hub decorations bought at the prize counter with tickets. Once
// owned, a prize is always on: it shows by its minigame's cabinet and gives
// the player an advantage in every run of that minigame (the minigame applies
// it; for Sweet Sam see src/sweet-sam/advantages.ts). The catalogue is data, so a
// later minigame adds its prizes here. The Wallet (./wallet.ts) owns which are
// owned and the rule for buying them.

import { imagePrizes } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { prizeRects } from "../ui/prizeArt.ts";
import { cabinetRects } from "./machine.ts";

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
export const prizeBox = 16;

/** Where a prize hangs around its cabinet. */
type Spot = "left" | "above" | "right";

/**
 * How a cabinet's side prizes hang: an arch drops them level with the
 * cabinet's top, a rainbow keeps them up by the prize above it.
 */
type Shape = "arch" | "rainbow";

/** The middle cabinet's prizes make a rainbow, the outer cabinets' arches. */
const shapes: Readonly<Record<ArcadeTitle, Shape>> = { brassMonkey: "arch", sweet: "rainbow", firefly: "arch" };

/** Pixels between a side prize's box and its cabinet. */
const sideGap = 4;
/** Pixels between the box above a cabinet and the cabinet's top. */
const aboveGap = 2;
/** How far a rainbow's sides sit below the box above the cabinet. */
const rainbowDrop = 2;

/**
 * The top-left of a prize's box at `spot` around `cabinet`, so it moves with
 * the cabinet. Each gap between cabinets (24 px) holds the middle cabinet's
 * rainbow side above its neighbour's arch side.
 */
function hang(cabinet: ArcadeTitle, spot: Spot): { x: number; y: number } {
  const c = cabinetRects[cabinet];
  const above = c.y - aboveGap - prizeBox;
  if (spot === "above") return { x: c.x, y: above };
  const x = spot === "left" ? c.x - sideGap - prizeBox : c.x + c.w + sideGap;
  return { x, y: shapes[cabinet] === "arch" ? c.y : above + rainbowDrop };
}

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
 * Every prize, in the order the prize counter menu lists them, each hung on
 * the wall around its cabinet (`hang`): the 100-ticket prize above it, the
 * others either side.
 */
export const prizes: readonly Prize[] = [
  {
    id: "honeyJar",
    name: "HONEY JAR",
    price: honeyJarPrice,
    software: "sweetSam",
    sprite: decoration("honeyJar"),
    ...hang("sweet", "left"),
  },
  {
    id: "runningShoes",
    name: "RUNNING SHOES",
    price: runningShoesPrice,
    software: "sweetSam",
    sprite: decoration("runningShoes"),
    ...hang("sweet", "right"),
  },
  {
    id: "sleepyBees",
    name: "SLEEPY BEES",
    price: sleepyBeesPrice,
    software: "sweetSam",
    sprite: decoration("sleepyBees"),
    ...hang("sweet", "above"),
  },
  {
    id: "lantern",
    name: "LANTERN",
    price: lanternPrice,
    software: "firefly",
    sprite: decoration("lantern"),
    ...hang("firefly", "right"),
  },
  {
    id: "glowStick",
    name: "GLOW STICK",
    price: glowStickPrice,
    software: "firefly",
    sprite: decoration("glowStick"),
    ...hang("firefly", "left"),
  },
  {
    id: "wings",
    name: "WINGS",
    price: wingsPrice,
    software: "firefly",
    sprite: decoration("wings"),
    ...hang("firefly", "above"),
  },
  {
    id: "oilCan",
    name: "OIL CAN",
    price: oilCanPrice,
    software: "brassMonkey",
    sprite: decoration("oilCan"),
    ...hang("brassMonkey", "left"),
  },
  {
    id: "springBoots",
    name: "SPRING BOOTS",
    price: springBootsPrice,
    software: "brassMonkey",
    sprite: decoration("springBoots"),
    ...hang("brassMonkey", "above"),
  },
  {
    id: "pocketWatch",
    name: "POCKET WATCH",
    price: pocketWatchPrice,
    software: "brassMonkey",
    sprite: decoration("pocketWatch"),
    ...hang("brassMonkey", "right"),
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
