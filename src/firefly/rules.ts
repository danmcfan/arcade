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
 * Moths.
 */
const formationRows: readonly { kind: EnemyKind; count: number }[] = [
  { kind: "owl", count: 4 },
  { kind: "wasp", count: 8 },
  { kind: "wasp", count: 8 },
  { kind: "moth", count: 10 },
  { kind: "moth", count: 10 },
];
const formationTop = 40;
const rowSpacing = 16;
/** The px between neighbours in a row. */
const colSpacing = 16;

/** Every slot, row by row, left to right. */
export function formation(): Slot[] {
  return formationRows.flatMap(({ kind, count }, row) =>
    Array.from({ length: count }, (_, col) => ({
      kind,
      row,
      col,
      x: fieldWidth / 2 + (col - (count - 1) / 2) * colSpacing,
      y: formationTop + row * rowSpacing,
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
/** Enemies fly in in groups of this many, `entrySpacing` ticks apart, groups `entryGroupGap` ticks apart. */
export const entryGroupSize = 8;
export const entrySpacing = 6;
export const entryGroupGap = 70;

/** Speeds, in px per tick. Enemy speed is the same on every stage. */
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
export const enemyHalfSize: Readonly<Record<EnemyKind, number>> = { moth: 6, wasp: 6, owl: 6 };

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
}

const firstDiveInterval = 150;
const diveIntervalStep = 25;
const minDiveInterval = 40;
const firstDiversPerDive = 1;
const maxDiversPerDive = 4;
const firstShotsPerDive = 1;
const maxShotsPerDive = 4;

/** Stage `stage` (1 is the first): each one dives more often, with more divers and more shots, up to a cap. */
export function difficulty(stage: number): Difficulty {
  const n = stage - 1;
  return {
    diveInterval: Math.max(minDiveInterval, firstDiveInterval - n * diveIntervalStep),
    diversPerDive: Math.min(maxDiversPerDive, firstDiversPerDive + n),
    shotsPerDive: Math.min(maxShotsPerDive, firstShotsPerDive + n),
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
