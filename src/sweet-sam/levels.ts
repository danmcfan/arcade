// How hard each Sweet Sam level is: Pac-Man's values (Dossier, Table A.1,
// "Scatter, Chase, Repeat..." and "Home Sweet Home") up to `levelCap`, after
// which nothing changes.

import { framesPerSecond } from "./constants.ts";
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

/** The level from which the values stop changing (Dossier, Table A.1's last row). */
export const levelCap = 21;

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
  /** Ticks a smoke pot keeps the bees sleepy, before prizes; 0 means it only turns them round. */
  sleepyFrames: number;
  /** Times a sleepy bee flashes white before it wakes. */
  flashes: number;
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
 * level 21 (nor do the bees sleep), so the sleepy speeds there, never used,
 * are the bear's own and level 20's bees'.
 */
const speedRows: readonly (readonly [number, Speeds])[] = [
  [1, { bear: 80, bearSleepy: 90, bee: 75, beeSleepy: 50, tunnel: 40, elroy1: 80, elroy2: 85 }],
  [2, { bear: 90, bearSleepy: 95, bee: 85, beeSleepy: 55, tunnel: 45, elroy1: 90, elroy2: 95 }],
  [5, { bear: 100, bearSleepy: 100, bee: 95, beeSleepy: 60, tunnel: 50, elroy1: 100, elroy2: 105 }],
  [21, { bear: 90, bearSleepy: 90, bee: 95, beeSleepy: 60, tunnel: 50, elroy1: 100, elroy2: 105 }],
];

const px = (percent: number): number => (velocityMax * percent) / 100;

/** Scatter and chase phases from seconds; the last chase never ends. */
function modes(...seconds: readonly number[]): ModeConfig[] {
  return [...seconds, -1].map((sec, i) => ({
    mode: i % 2 === 0 ? modeScatter : modeChase,
    ticks: sec === -1 ? -1 : Math.round(framesPerSecond * sec),
  }));
}

// Speeds over 1 px/tick move in sub-steps of at most 1 px (update.ts
// `moveEntity`), so no speed in the table skips a corner. corners.test.ts
// checks every value against the maze.

/** Dossier, "Scatter, Chase, Repeat...": levels 2–4, then 5 on. The last scatter lasts one tick. */
const modesLevel2 = modes(7, 20, 7, 20, 5, 1033, 1 / framesPerSecond);
const modesLevel5 = modes(5, 20, 5, 20, 5, 1037, 1 / framesPerSecond);

/** Table A.1's fright: seconds sleepy (0: a pot only turns the bees round) and flashes. */
interface Fright {
  readonly seconds: number;
  readonly flashes: number;
}

/** Fright by level, 1 to `levelCap`. */
const frights: readonly Fright[] = [
  { seconds: 6, flashes: 5 },
  { seconds: 5, flashes: 5 },
  { seconds: 4, flashes: 5 },
  { seconds: 3, flashes: 5 },
  { seconds: 2, flashes: 5 },
  { seconds: 5, flashes: 5 },
  { seconds: 2, flashes: 5 },
  { seconds: 2, flashes: 5 },
  { seconds: 1, flashes: 3 },
  { seconds: 5, flashes: 5 },
  { seconds: 2, flashes: 5 },
  { seconds: 1, flashes: 3 },
  { seconds: 1, flashes: 3 },
  { seconds: 3, flashes: 5 },
  { seconds: 1, flashes: 3 },
  { seconds: 1, flashes: 3 },
  { seconds: 0, flashes: 0 },
  { seconds: 1, flashes: 3 },
  { seconds: 0, flashes: 0 },
  { seconds: 0, flashes: 0 },
  { seconds: 0, flashes: 0 },
];

/** Table A.1's Elroy 1 threshold in drops left, by the first level of each row; Elroy 2 is half of it. */
const elroyRows: readonly (readonly [number, number])[] = [
  [1, 20],
  [2, 30],
  [3, 40],
  [6, 50],
  [9, 60],
  [12, 80],
  [15, 100],
  [19, 120],
];

/** Dossier, "Scatter, Chase, Repeat...", by the first level of each row. */
const modeRows: readonly (readonly [number, readonly ModeConfig[]])[] = [
  [1, modeSequence],
  [2, modesLevel2],
  [5, modesLevel5],
];

/** Dossier, "Home Sweet Home": Inky 0 and Clyde 50 on level 2, everyone 0 from level 3. */
const dotRows: readonly (readonly [number, DotMinimums])[] = [
  [1, goDotMinimums],
  [2, { pink: 0, teal: 0, orange: 50 }],
  [3, { pink: 0, teal: 0, orange: 0 }],
];

/** Seconds without an eaten drop before the preferred bee leaves the home. */
const idleRows: readonly (readonly [number, number])[] = [
  [1, 4],
  [5, 3],
];

/** The value of the last row of `rows` (by first level) that `level` has reached. */
function fromRow<T>(rows: readonly (readonly [number, T])[], level: number): T {
  let value = rows[0]?.[1];
  for (const [from, v] of rows) if (level >= from) value = v;
  if (value === undefined) throw new Error("sweetSam: empty level rows");
  return value;
}

/** The values for `level` (1-based); levels past `levelCap` play as `levelCap`. */
export function levelValues(level: number): LevelValues {
  const n = Math.min(Math.max(level, 1), levelCap);
  const fright = frights[n - 1];
  if (fright === undefined) throw new Error(`sweetSam: no fright for level ${n}`);
  const v = fromRow(speedRows, n);
  const elroyDrops = fromRow(elroyRows, n);
  return {
    bearVelocity: px(v.bear),
    bearSleepyVelocity: px(v.bearSleepy),
    beeVelocity: px(v.bee),
    sleepyBeeVelocity: px(v.beeSleepy),
    tunnelVelocity: px(v.tunnel),
    sleepyFrames: framesPerSecond * fright.seconds,
    flashes: fright.flashes,
    modeSequence: fromRow(modeRows, n),
    dotMinimums: fromRow(dotRows, n),
    idleReleaseTicks: framesPerSecond * fromRow(idleRows, n),
    elroy: [
      { dropsLeft: elroyDrops, velocity: px(v.elroy1) },
      { dropsLeft: elroyDrops / 2, velocity: px(v.elroy2) },
    ],
  };
}
