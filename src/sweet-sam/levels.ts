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
  /** Points for eating the bonus flower. */
  flowerPoints: number;
}

/** Four scatters and the three chases between them, in seconds; the last chase never ends. */
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

/** Levels 1 to `levelCap`, in order. */
const levels: readonly LevelValues[] = [
  {
    beeVelocity: velocityEnemyNormal,
    sleepyFrames: blueFramesDuration,
    modeSequence,
    dotMinimums: goDotMinimums,
    flowerPoints: 100,
  },
  {
    beeVelocity: 0.96875,
    sleepyFrames: framesPerSecond * 8,
    modeSequence: modes([6, 6, 4, 4], [22, 22, 22]),
    dotMinimums: { pink: 0, teal: 20, orange: 45 },
    flowerPoints: 300,
  },
  {
    beeVelocity: 0.96875,
    sleepyFrames: framesPerSecond * 7,
    modeSequence: modes([5, 5, 4, 3], [24, 24, 24]),
    dotMinimums: { pink: 0, teal: 10, orange: 30 },
    flowerPoints: 500,
  },
  {
    beeVelocity: 1,
    sleepyFrames: framesPerSecond * 6,
    modeSequence: modes([4, 4, 3, 2], [26, 26, 26]),
    dotMinimums: { pink: 0, teal: 0, orange: 20 },
    flowerPoints: 700,
  },
  {
    beeVelocity: 1,
    sleepyFrames: framesPerSecond * 5,
    modeSequence: modes([3, 3, 2, 1], [28, 28, 28]),
    dotMinimums: { pink: 0, teal: 0, orange: 10 },
    flowerPoints: 1000,
  },
];

/** The values for `level` (1-based); levels past `levelCap` play as `levelCap`. */
export function levelValues(level: number): LevelValues {
  const row = levels[Math.min(Math.max(level, 1), levelCap) - 1];
  if (row === undefined) throw new Error(`sweetSam: no values for level ${level}`);
  return { ...row, sleepyFrames: Math.max(row.sleepyFrames, sleepyFramesMinimum) };
}
