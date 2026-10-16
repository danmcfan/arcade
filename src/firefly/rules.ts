// Firefly's numbers: the formation, how each stage gets harder, and the
// points. Every tuning value is a named constant here; game.ts plays them.

/** The playfield: the cabinet screen, 224×288. */
export const fieldWidth = 224;
export const fieldHeight = 288;

export type EnemyKind = "moth" | "wasp" | "owl";

/** One place in the formation: its row (0 at the top), column and centre at sway 0. */
export interface Slot {
  kind: EnemyKind;
  row: number;
  col: number;
  x: number;
  y: number;
}

/**
 * The formation's rows from the top: 4 Owls, 2 rows of 8 Wasps, 2 rows of 10
 * Moths, and the px between neighbours (the Owls are twice the size).
 */
const formationRows: readonly { kind: EnemyKind; count: number; spacing: number }[] = [
  { kind: "owl", count: 4, spacing: 28 },
  { kind: "wasp", count: 8, spacing: 16 },
  { kind: "wasp", count: 8, spacing: 16 },
  { kind: "moth", count: 10, spacing: 16 },
  { kind: "moth", count: 10, spacing: 16 },
];
const formationTop = 40;
const rowSpacing = 16;

/** Every slot, row by row, left to right. */
export function formation(): Slot[] {
  return formationRows.flatMap(({ kind, count, spacing }, row) =>
    Array.from({ length: count }, (_, col) => ({
      kind,
      row,
      col,
      x: fieldWidth / 2 + (col - (count - 1) / 2) * spacing,
      y: formationTop + (row === 0 ? 0 : 4 + row * rowSpacing),
    })),
  );
}

/** How far the formation sways either side, in px, and the ticks of one full sway. */
export const swayAmplitude = 8;
const swayPeriod = 128;

/** The formation's x offset at `tick`: a triangle wave between ±`swayAmplitude`, whole pixels. */
export function swayOffset(tick: number): number {
  const phase = (tick % swayPeriod) / swayPeriod;
  const tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return Math.round(tri * swayAmplitude);
}

/** Lives at the start of a run. No extra lives come from score. */
export const startLives = 3;

/** Ticks the "STAGE n" text shows before the enemies fly in. */
export const stageIntroTicks = 120;
/** Where a wave flies in from (game.ts holds the curves). */
export type EntryCurve = "topCentre" | "lowerLeft" | "lowerRight" | "topRight" | "topLeft";

/** A formation place by row and column. */
export interface SlotRef {
  row: number;
  col: number;
}

/**
 * One entry wave: the curve it flies in on and its 4 pairs of slots, in the
 * order they set off. The two of a pair fly side by side: the first on the
 * curve, the second `entryPairOffset` px beside it, or mirrored when the wave
 * is `split` (wave 1 comes in as two mirrored streams).
 */
export interface EntryWave {
  curve: EntryCurve;
  split: boolean;
  pairs: readonly (readonly [SlotRef, SlotRef])[];
}

const pair = (a: [number, number], b: [number, number]): readonly [SlotRef, SlotRef] => [
  { row: a[0], col: a[1] },
  { row: b[0], col: b[1] },
];

/**
 * Galaga's 5 waves of 8 (Bees are Moths, Butterflies Wasps, Boss Galaga Owls):
 * 4 Wasps and 4 Moths from the top centre, split; 4 Owls and 4 Wasps from the
 * lower left; 8 Wasps from the lower right; 8 Moths from the top right; 8
 * Moths from the top left.
 */
export const entryWaves: readonly EntryWave[] = [
  {
    curve: "topCentre",
    split: true,
    pairs: [pair([1, 3], [3, 4]), pair([1, 4], [3, 5]), pair([2, 3], [4, 4]), pair([2, 4], [4, 5])],
  },
  {
    curve: "lowerLeft",
    split: false,
    pairs: [pair([0, 0], [1, 0]), pair([0, 1], [1, 1]), pair([0, 2], [1, 6]), pair([0, 3], [1, 7])],
  },
  {
    curve: "lowerRight",
    split: false,
    pairs: [pair([1, 2], [1, 5]), pair([2, 0], [2, 1]), pair([2, 2], [2, 5]), pair([2, 6], [2, 7])],
  },
  {
    curve: "topRight",
    split: false,
    pairs: [pair([3, 6], [3, 7]), pair([3, 8], [3, 9]), pair([4, 6], [4, 7]), pair([4, 8], [4, 9])],
  },
  {
    curve: "topLeft",
    split: false,
    pairs: [pair([3, 0], [3, 1]), pair([3, 2], [3, 3]), pair([4, 0], [4, 1]), pair([4, 2], [4, 3])],
  },
];

/** Pairs of a wave set off `entrySpacing` ticks apart, waves `entryWaveGap` ticks apart. */
export const entrySpacing = 12;
export const entryWaveGap = 70;
/** How far the second of a pair flies beside the first, in px. */
export const entryPairOffset = 16;

/** Speeds, in px per tick. Divers speed up on later stages (`Difficulty.diveSpeed`). */
export const playerSpeed = 2;
export const sparkSpeed = 6;
export const enemySpeed = 2;
export const shotSpeed = 3;
/** The most an enemy shot drifts sideways per tick, aiming at the firefly. */
export const shotMaxDrift = 1;

/** Sparks on the screen at once, and the fewest ticks between two. */
export const maxSparks = 2;
export const sparkCooldown = 8;

/** Ticks after a dive starts before its first shot, and between its shots. */
export const firstShotDelay = 18;
export const shotSpacing = 14;

/** How likely each kind is to be picked for a dive, relative to the others. Wasps dive most. */
export const diveWeight: Readonly<Record<EnemyKind, number>> = { moth: 2, wasp: 5, owl: 2 };

/** Spark hits to kill each kind. */
export const enemyHp: Readonly<Record<EnemyKind, number>> = { moth: 1, wasp: 1, owl: 2 };
/** Half the hit box of each kind, in px: a spark or the firefly touching it hits. */
export const enemyHalfSize: Readonly<Record<EnemyKind, number>> = { moth: 6, wasp: 6, owl: 10 };

/** Ticks the hit effect plays on a killed enemy (5 frames of 15). */
export const hitEffectTicks = 75;
/** Ticks from losing a life to the next firefly, or to game over after the last. */
export const respawnTicks = 150;

/** What each stage asks of the player. */
export interface Difficulty {
  /** Ticks between two dives starting. */
  diveInterval: number;
  /** Enemies that break off together in each dive. */
  diversPerDive: number;
  /** Shots each diving enemy drops. */
  shotsPerDive: number;
  /** Speed of a diving enemy, in px per tick. Entering and joining the formation stay at `enemySpeed`. */
  diveSpeed: number;
  /** The most a shot drifts sideways per tick, aiming at the firefly. */
  shotDrift: number;
}

const firstDiveInterval = 150;
const diveIntervalStep = 25;
const minDiveInterval = 40;
const firstDiversPerDive = 1;
const maxDiversPerDive = 4;
const firstShotsPerDive = 1;
const maxShotsPerDive = 4;
/** Dive speed and shot drift grow by these fractions each stage after `lastFlatStage`, up to `lastHarderStage`. */
const lastFlatStage = 5;
const lastHarderStage = 10;
const diveSpeedGrowth = 0.05;
const shotDriftGrowth = 0.1;

/**
 * Stage `stage` (1 is the first): each one dives more often, with more divers
 * and more shots, up to a cap. From stage 6 to 10 divers also fly faster and
 * shots aim harder; from stage 10 on every stage is the same.
 */
export function difficulty(stage: number): Difficulty {
  const n = stage - 1;
  const late = Math.max(0, Math.min(lastHarderStage, stage) - lastFlatStage);
  return {
    diveInterval: Math.max(minDiveInterval, firstDiveInterval - n * diveIntervalStep),
    diversPerDive: Math.min(maxDiversPerDive, firstDiversPerDive + n),
    shotsPerDive: Math.min(maxShotsPerDive, firstShotsPerDive + n),
    diveSpeed: enemySpeed * (1 + diveSpeedGrowth * late),
    shotDrift: shotMaxDrift * (1 + shotDriftGrowth * late),
  };
}

/**
 * Points for a kill in formation and while diving (Galaga's). A good run, about
 * four stages, scores 10,000 to 15,000: what a good Sweet Sam run scores.
 */
const killPoints: Readonly<Record<EnemyKind, { formation: number; diving: number }>> = {
  moth: { formation: 50, diving: 100 },
  wasp: { formation: 80, diving: 160 },
  owl: { formation: 150, diving: 400 },
};

export function points(kind: EnemyKind, diving: boolean): number {
  const p = killPoints[kind];
  return diving ? p.diving : p.formation;
}
