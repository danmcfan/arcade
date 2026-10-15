// How hard each Sweet Sam level is (#47). Level 1 is the Go game; each level
// after it has faster bees, shorter sleepy time, shorter scatter and longer
// chase, and bees that leave home sooner. From `levelCap` on nothing changes.
// The bear's speed is the same on every level.

import { blueFramesDuration, framesPerSecond } from "./constants.ts";
import { goDotMinimums, velocityEnemyNormal, type DotMinimums } from "./entity.ts";

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
  /** A bee's speed per tick while awake and out of the tunnel. */
  beeVelocity: number;
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

function elroy(drops1: number, velocity1: number, velocity2: number): [ElroyStep, ElroyStep] {
  return [
    { dropsLeft: drops1, velocity: velocity1 },
    { dropsLeft: drops1 / 2, velocity: velocity2 },
  ];
}

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

// Bee speeds stay in (0.5, 1]: steps of at most 1 px always land within
// `distanceThreshold` (0.5 px) of every corner, and steps over 0.5 px leave
// it on the next tick, so a bee neither misses a turn nor turns twice.
// levels.test.ts and corners.test.ts check every value against the maze.
// Elroy's thresholds are Pac-Man's (Dossier, Table A.1); its speeds add
// 1/32 and 1/16 px/tick (Pac-Man's +5%/+10% steps, scaled) but stop at 1, so from level 3 the
// second step changes only red's scatter target, and on level 5 both do.

// Tuned with scripts/sweet-sam-bot.ts (#47): with a fifth of a second's
// reaction time, a good run (the top quarter of 200 seeds) scores about what
// it did when every level was level 1; the bonus flower makes up for most of
// what the harder levels take.

/** Levels 1 to `levelCap`, in order. */
const levels: readonly LevelValues[] = [
  {
    beeVelocity: velocityEnemyNormal,
    sleepyFrames: blueFramesDuration,
    modeSequence,
    dotMinimums: goDotMinimums,
    idleReleaseTicks: framesPerSecond * 4,
    elroy: elroy(20, 0.96875, 1),
  },
  {
    beeVelocity: 0.953125,
    sleepyFrames: framesPerSecond * 9,
    modeSequence: modes([7, 6, 5, 4], [20, 21, 22]),
    dotMinimums: { pink: 0, teal: 25, orange: 50 },
    idleReleaseTicks: framesPerSecond * 4,
    elroy: elroy(30, 0.984375, 1),
  },
  {
    beeVelocity: 0.96875,
    sleepyFrames: framesPerSecond * 8,
    modeSequence: modes([7, 6, 4, 3], [21, 22, 24]),
    dotMinimums: { pink: 0, teal: 20, orange: 40 },
    idleReleaseTicks: framesPerSecond * 4,
    elroy: elroy(40, 1, 1),
  },
  {
    beeVelocity: 0.984375,
    sleepyFrames: framesPerSecond * 7,
    modeSequence: modes([7, 5, 4, 2], [21, 23, 26]),
    dotMinimums: { pink: 0, teal: 15, orange: 30 },
    idleReleaseTicks: framesPerSecond * 4,
    elroy: elroy(40, 1, 1),
  },
  {
    beeVelocity: 1,
    sleepyFrames: framesPerSecond * 6,
    modeSequence: modes([7, 5, 3, 1], [22, 24, 28]),
    dotMinimums: { pink: 0, teal: 10, orange: 20 },
    idleReleaseTicks: framesPerSecond * 3,
    elroy: elroy(40, 1, 1),
  },
];

/** The values for `level` (1-based); levels past `levelCap` play as `levelCap`. */
export function levelValues(level: number): LevelValues {
  const row = levels[Math.min(Math.max(level, 1), levelCap) - 1];
  if (row === undefined) throw new Error(`sweetSam: no values for level ${level}`);
  return { ...row, sleepyFrames: Math.max(row.sleepyFrames, sleepyFramesMinimum) };
}
