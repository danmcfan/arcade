// Sweet Sam's intermissions (#160): Pac-Man's three cutscenes, after levels
// 2, 5 and 9 (Pac-Man Dossier, "The Basics"). Each scene is data: who is on
// screen, how big, and where they walk when, so new art (#199) can swap a
// sprite without touching the state machine. #199 added the red bee's torn
// wing to Acts II and III.

import type { Direction } from "../engine/input.ts";
import { propColumn, tearColumn } from "./art.ts";

/**
 * Who an actor is drawn as: the bear and the red bee from their sheets, or
 * (#199) the red bee tearing its wing (`tornBee`), and the props of its gag:
 * the torn wing, a dust puff and the nail, from intermission.png.
 */
export type IntermissionSprite = "bear" | "redBee" | "tornBee" | "wing" | "dust" | "nail";

/** Which frames a move shows: `count` frames from `first`, each held `every` ticks, counted from the move's start or the scene's. */
export interface IntermissionFrames {
  first: number;
  count: number;
  every: number;
  fromStart: boolean;
}

/**
 * One straight move from (`fromX`, `fromY`) at tick `from` to (`toX`, `toY`)
 * at tick `to`. y is pixels below the scene's row (`intermissionY`).
 */
export interface IntermissionMove {
  from: number;
  to: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  facing: Direction;
  /** The frames shown; null is the walk cycle, or its first frame standing still. */
  frames: IntermissionFrames | null;
}

export interface IntermissionActor {
  sprite: IntermissionSprite;
  /** 2 draws the actor twice as big (the big bear of Act I). */
  scale: number;
  /** Drawn in the sleepy (blue) colours. */
  frightened: boolean;
  /** The actor is on screen only during its moves; a move with `fromX === toX` stands still. */
  moves: readonly IntermissionMove[];
}

export interface IntermissionScene {
  name: string;
  /** Ticks the scene lasts before the next level starts. */
  ticks: number;
  actors: readonly IntermissionActor[];
}

/** Where one actor stands on one tick. */
export interface IntermissionPose {
  sprite: IntermissionSprite;
  scale: number;
  frightened: boolean;
  x: number;
  /** Pixels below the scene's row. */
  y: number;
  facing: Direction;
  /** The bear's and red bee's walk frame, 0..3, or the column in intermission.png for the others. */
  frame: number;
}

/** The row the actors walk along, in maze pixels: through the middle of the screen. */
export const intermissionY = 8 * 17.5;

/**
 * How far below the row the floor is: a bee that can no longer fly drops this
 * far, and the props stand on it (#199).
 */
export const intermissionFloor = 6;

/** Off-screen x on each side, far enough that a 16 px sprite is fully hidden. */
const offLeft = -16;
const offRight = 240;
const crossTicks = 160;
const walkFrameTicks = 6;
/** Ticks a dust puff lasts: its 3 frames of `dustPuffTicks / 3`. */
const dustPuffTicks = 18;
/** Ticks between dust puffs while the bee crawls home in Act III. */
const crawlDustEvery = 16;

function walk(from: number, to: number, fromX: number, toX: number): IntermissionMove {
  return { from, to, fromX, toX, fromY: 0, toY: 0, facing: toX < fromX ? "LEFT" : "RIGHT", frames: null };
}

/** `frames` from `first`: one held still when `count` is 1, else cycling every `every` ticks. */
function frames(first: number, count = 1, every = walkFrameTicks, fromStart = false): IntermissionFrames {
  return { first, count, every, fromStart };
}

/** A move showing `f`, from (fromX, fromY) to (toX, toY). */
function shown(
  f: IntermissionFrames,
  from: number,
  to: number,
  [fromX, fromY]: readonly [number, number],
  [toX, toY]: readonly [number, number],
  facing: Direction,
): IntermissionMove {
  return { from, to, fromX, toX, fromY, toY, facing, frames: f };
}

function actor(
  sprite: IntermissionSprite,
  moves: IntermissionMove[],
  scale = 1,
  frightened = false,
): IntermissionActor {
  return { sprite, scale, frightened, moves };
}

/** A dust puff on the floor at x, starting at tick `at`. */
function puff(at: number, x: number): IntermissionActor {
  const f = frames(propColumn.dust, 3, dustPuffTicks / 3, true);
  return actor("dust", [shown(f, at, at + dustPuffTicks - 1, [x, intermissionFloor], [x, intermissionFloor], "LEFT")]);
}

/** Act I: the red bee chases the bear off to the left; a big bear chases a frightened bee back. */
const actI: IntermissionScene = {
  name: "act-1",
  ticks: 460,
  actors: [
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("redBee", [walk(0, crossTicks + 20, offRight + 32, offLeft)]),
    actor("redBee", [walk(220, 220 + crossTicks, offLeft, offRight)], 1, true),
    actor("bear", [walk(240, 440, offLeft - 48, offRight + 48)], 2),
  ],
};

/** Where the red bee snags in Act II, and the nail it snags on, just behind it. */
const snagX = 128;
const nailX = snagX + 9;

/**
 * Act II (#199): the bear crosses; the red bee follows, its wing snags on a
 * nail, stretches and tears. The bee drops to the floor and turns to look at
 * the torn piece of wing fluttering down beside the nail.
 */
const actII: IntermissionScene = {
  name: "act-2",
  ticks: 320,
  actors: [
    actor("nail", [
      shown(frames(propColumn.nail), 0, 320, [nailX, intermissionFloor], [nailX, intermissionFloor], "LEFT"),
    ]),
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("redBee", [walk(0, 90, offRight + 32, snagX)]),
    actor("tornBee", [
      shown(frames(tearColumn.stretch), 91, 100, [snagX - 2, 0], [snagX - 2, 0], "LEFT"),
      shown(frames(tearColumn.stretch + 1), 101, 110, [snagX - 4, 0], [snagX - 4, 0], "LEFT"),
      shown(frames(tearColumn.stretch + 2), 111, 130, [snagX - 7, 0], [snagX - 7, 0], "LEFT"),
      shown(frames(tearColumn.torn, 2), 131, 136, [snagX - 7, 0], [snagX - 11, -2], "LEFT"),
      shown(frames(tearColumn.torn, 2), 137, 146, [snagX - 11, -2], [snagX - 11, intermissionFloor], "LEFT"),
      shown(
        frames(tearColumn.torn),
        147,
        200,
        [snagX - 11, intermissionFloor],
        [snagX - 11, intermissionFloor],
        "LEFT",
      ),
      shown(frames(tearColumn.torn), 201, 320, [snagX - 9, intermissionFloor], [snagX - 9, intermissionFloor], "RIGHT"),
    ]),
    actor("wing", [
      shown(frames(propColumn.wing, 2), 131, 174, [nailX - 3, -8], [nailX - 3, intermissionFloor], "LEFT"),
      shown(frames(propColumn.wing), 175, 320, [nailX - 3, intermissionFloor], [nailX - 3, intermissionFloor], "LEFT"),
    ]),
    puff(147, snagX - 11),
    puff(175, nailX - 3),
  ],
};

/** When and where the grounded bee crawls home in Act III. */
const crawlFrom = 230;
const crawlTo = 550;
const crawlFromX = -30;
const crawlToX = 250;
/** The dragged wing's centre behind the crawling bee, at the end of its thread. */
const wingBehind = 19;

/** The crawling bee's x at `tick`. */
function crawlX(tick: number): number {
  return crawlFromX + ((crawlToX - crawlFromX) * (tick - crawlFrom)) / (crawlTo - crawlFrom);
}

/**
 * Act III (#199): the red bee, its wing patched, chases the bear across; then
 * it comes back the other way on foot, crawling along the floor and dragging
 * the torn wing behind it on a thread, kicking up dust.
 */
const actIII: IntermissionScene = {
  name: "act-3",
  ticks: 580,
  actors: [
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("tornBee", [
      shown(frames(tearColumn.patched, 2), 0, crossTicks + 20, [offRight + 32, 0], [offLeft, 0], "LEFT"),
      shown(
        frames(tearColumn.crawl, 2, 5),
        crawlFrom,
        crawlTo,
        [crawlFromX, intermissionFloor],
        [crawlToX, intermissionFloor],
        "RIGHT",
      ),
    ]),
    actor("wing", [
      shown(
        frames(propColumn.wing),
        crawlFrom,
        crawlTo,
        [crawlFromX - wingBehind, intermissionFloor],
        [crawlToX - wingBehind, intermissionFloor],
        "RIGHT",
      ),
    ]),
    ...Array.from({ length: Math.trunc((crawlTo - crawlFrom) / crawlDustEvery) }, (_, i) => {
      const at = crawlFrom + i * crawlDustEvery;
      return puff(at, crawlX(at) - 12);
    }),
  ],
};

const scenes: ReadonlyMap<number, IntermissionScene> = new Map([
  [2, actI],
  [5, actII],
  [9, actIII],
]);

/** The scene played after clearing `level`, or null when the next level starts straight away. */
export function intermissionAfter(level: number): IntermissionScene | null {
  return scenes.get(level) ?? null;
}

/** The frame `m` shows on `tick`. */
function frameAt(m: IntermissionMove, tick: number): number {
  const f = m.frames;
  if (f === null) return m.fromX === m.toX ? 0 : Math.trunc(tick / walkFrameTicks) % 4;
  return f.first + (Math.trunc((f.fromStart ? tick - m.from : tick) / f.every) % f.count);
}

/** Everyone on screen `tick` ticks into `scene`, in draw order. */
export function intermissionPoses(scene: IntermissionScene, tick: number): IntermissionPose[] {
  const poses: IntermissionPose[] = [];
  for (const a of scene.actors) {
    const m = a.moves.find((mv) => tick >= mv.from && tick <= mv.to);
    if (m === undefined) continue;
    const t = m.to === m.from ? 0 : (tick - m.from) / (m.to - m.from);
    poses.push({
      sprite: a.sprite,
      scale: a.scale,
      frightened: a.frightened,
      x: m.fromX + (m.toX - m.fromX) * t,
      y: m.fromY + (m.toY - m.fromY) * t,
      facing: m.facing,
      frame: frameAt(m, tick),
    });
  }
  return poses;
}
