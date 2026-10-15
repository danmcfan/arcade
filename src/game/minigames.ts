// Every minigame, described once (#51): its names, where its cabinet stands
// in the hub, its title card, its cabinet strip, its controls panel and how
// to start a run (the sounds the minigame pause menu silences are its Channel,
// declared with each sound in src/ui/sounds.ts). The hub's
// machines, the scoreboard, the pause menu and the verify cabinet walks all
// read this list; adding a minigame means a new entry here plus its own
// module. The snapshot names (`SoftwareName`, `ArcadeTitle`) stay hand-written
// in the contract (ADR 0004); `descriptors` fails to compile when a
// `SoftwareName` has no entry.

import type { Rect } from "../arcade/collision.ts";
import { tileSize } from "../arcade/collision.ts";
import type { PrizeId } from "../arcade/prizes.ts";
import { imageCabinet, imageCabinetBrassMonkey, imageCabinetFirefly } from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { brassMonkeyAdvantages } from "../brass-monkey/advantages.ts";
import { newBrassMonkeySoftware } from "../brass-monkey/game.ts";
import { fireflyAdvantages } from "../firefly/advantages.ts";
import { newFireflySoftware } from "../firefly/game.ts";
import { sweetSamAdvantages } from "../sweet-sam/advantages.ts";
import { SweetSamSoftware } from "../sweet-sam/software.ts";
import { standardControls, type ControlRow } from "../ui/menu.ts";
import type { TickerInk } from "../ui/tickerArt.ts";
import type { ArcadeTitle } from "./snapshot.ts";
import type { Software, SoftwareName } from "./software.ts";

/** What a run starts from: the hub high score and the prizes the player owns. */
export interface MinigameStart {
  highScore: number;
  prizes: readonly PrizeId[];
}

/** A minigame's title card: its name as the LED scoreboard spells it, in its cabinet's lit colour. */
export interface TitleCard {
  text: string;
  ink: TickerInk;
}

export interface Minigame {
  /** Its code name, which the snapshot reports (`GameSnapshot.software`). */
  readonly name: SoftwareName;
  /** Its title image, by name (`ArcadeSnapshot.title`); also keys its hub art and attract loop. */
  readonly title: ArcadeTitle;
  readonly titleCard: TitleCard;
  /** Where its cabinet stands in the hub: its art's top-left is the rect's (src/ui/hubArt.ts). */
  readonly hubRect: Readonly<Rect>;
  /** The cabinet outline it plays inside, recoloured from the cabinet strip (art/cabinets.json). */
  readonly cabinetStrip: Sprite;
  /** Its controls panel in the minigame pause menu. */
  readonly controls: readonly ControlRow[];
  /** A new run; a `FixedViewport` (its cabinet outline, drawn with `buffer` 0). */
  create(start: MinigameStart): Software;
}

/**
 * Cabinets are 40 px apart (Go had them 24 apart, at tiles 6, 9 and 12), so
 * each cabinet's prizes have wall room around it (#72).
 */
function cabinetAt(tileX: number): Rect {
  return { x: tileSize * tileX, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2 };
}

const descriptors: { readonly [N in SoftwareName]: Minigame & { readonly name: N } } = {
  sweetSam: {
    name: "sweetSam",
    title: "sweet",
    titleCard: { text: "SWEET SAM", ink: "yellow" },
    hubRect: cabinetAt(9),
    cabinetStrip: imageCabinet,
    controls: standardControls,
    // Go's Sweet Sam constructor; it enters START, which plays "rewind:start" then "play:start".
    create: ({ highScore, prizes }) => new SweetSamSoftware(highScore, sweetSamAdvantages(prizes)),
  },
  firefly: {
    name: "firefly",
    title: "firefly",
    titleCard: { text: "FIREFLY", ink: "cyan" },
    hubRect: cabinetAt(14),
    cabinetStrip: imageCabinetFirefly,
    controls: standardControls,
    // Firefly takes no high score, as in Go.
    create: ({ prizes }) => newFireflySoftware(fireflyAdvantages(prizes)),
  },
  brassMonkey: {
    name: "brassMonkey",
    title: "brassMonkey",
    titleCard: { text: "BRASS MONKEY", ink: "green" },
    hubRect: cabinetAt(4),
    cabinetStrip: imageCabinetBrassMonkey,
    controls: standardControls,
    create: ({ highScore, prizes }) => newBrassMonkeySoftware(highScore, brassMonkeyAdvantages(prizes)),
  },
};

/** Every minigame, one entry each. */
export const minigames: readonly Minigame[] = Object.values(descriptors);

export function minigame(name: SoftwareName): Minigame {
  return descriptors[name];
}

/** The minigame whose cabinet shows `title`. */
export function minigameTitled(title: ArcadeTitle): Minigame {
  const m = minigames.find((g) => g.title === title);
  if (m === undefined) throw new Error(`no minigame is titled ${title}`);
  return m;
}

/**
 * Builds the named minigame for a run (the hub's `SoftwareFactory`). The
 * Game imports it from here, not ./registry.ts, so there is no import cycle
 * through the scene factories.
 */
export function createSoftware(name: SoftwareName, highScore: number, prizes: readonly PrizeId[] = []): Software {
  return minigame(name).create({ highScore, prizes });
}
