// Prizes: hub decorations bought at the prize counter with tickets. Once
// owned, a prize is always on: it shows by its minigame's cabinet and gives
// the player an advantage in every run of that minigame. Each minigame
// declares its own prizes and what they do (e.g. src/sweet-sam/advantages.ts);
// this catalogue derives from them and adds where each hangs on the wall. The
// Wallet (./wallet.ts) owns which are owned and the rule for buying them.

import { imagePrizes } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { SoftwareName } from "../game/software.ts";
import { prizeGreyY, prizeRects } from "../ui/prizeArt.ts";
import { minigame, minigames, type PrizeId } from "../game/minigames.ts";

export type { PrizeId };

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
 * Where each prize hangs: the hour on a clock face round its cabinet's top
 * (`hang`): Brass Monkey's at 9, 10:30 and 12, Firefly's at 3, 1:30 and 12,
 * and Sweet Sam's in a rainbow at 10:15, 12 and 1:45. A new prize needs its
 * hour here too; the compiler asks for it.
 */
const hours: Readonly<Record<PrizeId, number>> = {
  honeyJar: 10.25,
  runningShoes: 1.75,
  sleepyBees: 12,
  lantern: 3,
  glowStick: 1.5,
  wings: 12,
  oilCan: 9,
  springBoots: 12,
  pocketWatch: 10.5,
};

/**
 * Every prize, as its minigame declares it (src/game/minigames.ts), in the
 * order the prize counter menu lists them: each minigame's in turn, hung on
 * the wall round its cabinet.
 */
export const prizes: readonly Prize[] = minigames.flatMap((m) =>
  m.prizes.map(({ id, name, price, effect }) => ({
    id,
    name,
    price,
    effect,
    software: m.name,
    sprite: decoration(id),
    greySprite: decoration(id, prizeGreyY),
    ...hang(m.name, hours[id]),
  })),
);

const prizeIds: ReadonlySet<string> = new Set(prizes.map((p) => p.id));

export function isPrizeId(v: unknown): v is PrizeId {
  return typeof v === "string" && prizeIds.has(v);
}

export function prize(id: PrizeId): Prize {
  const found = prizes.find((p) => p.id === id);
  if (found === undefined) throw new Error(`prize: unknown prize id ${id}`);
  return found;
}
