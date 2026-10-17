// How hard each Sweet Sam level is (#47). Level 1 is the Go game; each level
// after it has faster bees, shorter sleepy time, shorter scatter and longer
// chase, and bees that leave home sooner. From `levelCap` on nothing changes
// but the speeds, which follow Pac-Man's (Dossier, Table A.1) to level 21.

import { blueFramesDuration, framesPerSecond } from "./constants.ts";
import { goDotMinimums, velocityMax, type DotMinimums } from "./entity.ts";

/** Go `type mode int`; the snapshot carries the raw int. */
export type Mode = 0 | 1;
export const modeScatter: Mode = 0;
export const modeChase: Mode = 1;

export interface ModeConfig {
  readonly mode: Mode;
  readonly ticks: number;
}

export const modeSequence: readonly ModeConfig[] = [
  { mode: modeScatter, ticks: framesPerSecond * 7 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 7 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 5 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 5 },
  { mode: modeChase, ticks: -1 },
];

/** The level from which the values stop changing. */
export const levelCap = 5;

/** Sleepy time never drops below this, so smoke pots always matter. */
export const sleepyFramesMinimum = framesPerSecond * 4;

export interface LevelValues {
  /** The bear's speed per tick while no bee is sleepy. */
  bearVelocity: number;
  /** The bear's speed per tick while a bee is sleepy. */
  bearSleepyVelocity: number;
  /** A bee's speed per tick while awake and out of the tunnel. */
  beeVelocity: number;
  /** A sleepy bee's speed per tick. */
  sleepyBeeVelocity: number;
  /** A bee's speed per tick in the tunnel. */
  tunnelVelocity: number;
  /** Ticks a smoke pot keeps the bees sleepy, before prizes. */
  sleepyFrames: number;
  /** Scatter and chase phases, in order; the last never ends. */
  modeSequence: readonly ModeConfig[];
  dotMinimums: DotMinimums;
  /** Ticks without an eaten drop before the preferred bee leaves the home. */
  idleReleaseTicks: number;
  /** Cruise Elroy: red's two speed-ups as the honey drops run out. */
  elroy: readonly [ElroyStep, ElroyStep];
}

/** Red flies at `velocity` once `dropsLeft` or fewer honey drops remain. */
export interface ElroyStep {
  readonly dropsLeft: number;
  readonly velocity: number;
}

/** A level's values but its speeds, and Elroy's first threshold (the second is half of it). */
type LevelRow = Omit<
  LevelValues,
  "bearVelocity" | "bearSleepyVelocity" | "beeVelocity" | "sleepyBeeVelocity" | "tunnelVelocity" | "elroy"
> & { readonly elroyDrops: number };

/** One row of the Dossier's Table A.1, in percent of `velocityMax`. */
interface Speeds {
  readonly bear: number;
  readonly bearSleepy: number;
  readonly bee: number;
  readonly beeSleepy: number;
  readonly tunnel: number;
  readonly elroy1: number;
  readonly elroy2: number;
}

/**
 * Table A.1 by the first level of each row. Pac-Man has no fright from
 * level 21, so the sleepy speeds there (reached only through the smoke pots
 * Sweet Sam keeps) are the bear's own and level 20's bees'.
 */
const speedRows: readonly (readonly [number, Speeds])[] = [
  [1, { bear: 80, bearSleepy: 90, bee: 75, beeSleepy: 50, tunnel: 40, elroy1: 80, elroy2: 85 }],
  [2, { bear: 90, bearSleepy: 95, bee: 85, beeSleepy: 55, tunnel: 45, elroy1: 90, elroy2: 95 }],
  [5, { bear: 100, bearSleepy: 100, bee: 95, beeSleepy: 60, tunnel: 50, elroy1: 100, elroy2: 105 }],
  [21, { bear: 90, bearSleepy: 90, bee: 95, beeSleepy: 60, tunnel: 50, elroy1: 100, elroy2: 105 }],
];

function speeds(level: number): Speeds {
  let row = speedRows[0]?.[1];
  for (const [from, s] of speedRows) if (level >= from) row = s;
  if (row === undefined) throw new Error("sweetSam: no speed rows");
  return row;
}

const px = (percent: number): number => (velocityMax * percent) / 100;

/**
 * Four scatters and the three chases between them, in seconds; the last
 * chase never ends. As in Pac-Man, the first scatter stays 7 s on every
 * level: the later scatters shorten and the chases lengthen.
 */
function modes(
  scatter: readonly [number, number, number, number],
  chase: readonly [number, number, number],
): ModeConfig[] {
  return scatter.flatMap((s, i): ModeConfig[] => [
    { mode: modeScatter, ticks: framesPerSecond * s },
    { mode: modeChase, ticks: i < chase.length ? framesPerSecond * (chase[i] ?? 0) : -1 },
  ]);
}

// Speeds over 1 px/tick move in sub-steps of at most 1 px (update.ts
// `moveEntity`), so no speed in the table skips a corner. corners.test.ts
// checks every value against the maze.

// Tuned with a scripted bot (#47, since removed): with a fifth of a second's
// reaction time, a good run (the top quarter of 200 seeds) scores about what
// it did when every level was level 1; the bonus flower makes up for most of
// what the harder levels take.

/** Levels 1 to `levelCap`, in order. */
const levels: readonly LevelRow[] = [
  {
    sleepyFrames: blueFramesDuration,
    modeSequence,
    dotMinimums: goDotMinimums,
    idleReleaseTicks: framesPerSecond * 4,
    elroyDrops: 20,
  },
  {
    sleepyFrames: framesPerSecond * 9,
    modeSequence: modes([7, 6, 5, 4], [20, 21, 22]),
    dotMinimums: { pink: 0, teal: 25, orange: 50 },
    idleReleaseTicks: framesPerSecond * 4,
    elroyDrops: 30,
  },
  {
    sleepyFrames: framesPerSecond * 8,
    modeSequence: modes([7, 6, 4, 3], [21, 22, 24]),
    dotMinimums: { pink: 0, teal: 20, orange: 40 },
    idleReleaseTicks: framesPerSecond * 4,
    elroyDrops: 40,
  },
  {
    sleepyFrames: framesPerSecond * 7,
    modeSequence: modes([7, 5, 4, 2], [21, 23, 26]),
    dotMinimums: { pink: 0, teal: 15, orange: 30 },
    idleReleaseTicks: framesPerSecond * 4,
    elroyDrops: 40,
  },
  {
    sleepyFrames: framesPerSecond * 6,
    modeSequence: modes([7, 5, 3, 1], [22, 24, 28]),
    dotMinimums: { pink: 0, teal: 10, orange: 20 },
    idleReleaseTicks: framesPerSecond * 3,
    elroyDrops: 40,
  },
];

/** The values for `level` (1-based); levels past `levelCap` play as `levelCap`. */
export function levelValues(level: number): LevelValues {
  const row = levels[Math.min(Math.max(level, 1), levelCap) - 1];
  if (row === undefined) throw new Error(`sweetSam: no values for level ${level}`);
  const v = speeds(level);
  const { elroyDrops, ...rest } = row;
  return {
    ...rest,
    sleepyFrames: Math.max(row.sleepyFrames, sleepyFramesMinimum),
    bearVelocity: px(v.bear),
    bearSleepyVelocity: px(v.bearSleepy),
    beeVelocity: px(v.bee),
    sleepyBeeVelocity: px(v.beeSleepy),
    tunnelVelocity: px(v.tunnel),
    elroy: [
      { dropsLeft: elroyDrops, velocity: px(v.elroy1) },
      { dropsLeft: elroyDrops / 2, velocity: px(v.elroy2) },
    ],
  };
}
