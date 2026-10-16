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

/** Ticks of one breath, and how much wider the formation is at its fullest (1/8 more). */
export const breathePeriod = 128;
const breatheGrowth = 1 / 8;
/** The point the formation breathes out from: the playfield's centre column, the top row. */
const breatheCentre = { x: fieldWidth / 2, y: formationTop };

/** The formation's scale `tick` ticks into breathing: 1 at the start of each breath, widest halfway. */
export function breathe(tick: number): number {
  const phase = (tick % breathePeriod) / breathePeriod;
  return 1 + breatheGrowth * (phase < 0.5 ? phase * 2 : 2 - phase * 2);
}

/**
 * What the formation is doing: swaying side to side while enemies fly in,
 * then breathing (expanding and contracting) once every one has arrived.
 */
export type FormationPhase = "sway" | "breathe";

/** The formation's clock: its phase, the stage tick, and the tick breathing began. */
export interface FormationState {
  phase: FormationPhase;
  ticks: number;
  breatheFrom: number;
}

/**
 * Where `slot` is in the formation `state`, in whole pixels: shifted by the
 * sway, or scaled out from the centre by the breath.
 */
export function formationPos(slot: { x: number; y: number }, state: FormationState): { x: number; y: number } {
  if (state.phase === "sway") return { x: slot.x + swayOffset(state.ticks), y: slot.y };
  const scale = breathe(state.ticks - state.breatheFrom);
  // Round away from the centre either side, so mirrored slots stay mirrored.
  const out = (d: number): number => Math.sign(d) * Math.round(Math.abs(d) * scale);
  return { x: breatheCentre.x + out(slot.x - breatheCentre.x), y: breatheCentre.y + out(slot.y - breatheCentre.y) };
}

/** Lives at the start of a run. */
export const startLives = 3;

/** Galaga's default bonus fighters: a life at `first` and `second` points, then every `every` after (#230). */
export const extraLifeThresholds = { first: 20_000, second: 70_000, every: 70_000 } as const;

/** The score of the next extra life after `score`: 20,000, 70,000, 140,000, 210,000 and so on. */
export function nextExtraLife(score: number): number {
  const { first, second, every } = extraLifeThresholds;
  if (score < first) return first;
  if (score < second) return second;
  return second + (Math.floor((score - second) / every) + 1) * every;
}

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

/**
 * The Owl's tractor beam (Galaga's Boss): a beam dive stops `beamHeight` px above
 * the firefly's row, in the bottom third, and beams for `beamTicks`. A firefly
 * whose centre is within `beamWidth` / 2 of the Owl's x is captured.
 */
export const beamHeight = 72;
export const beamWidth = 24;
export const beamTicks = 180;
/** The chance an Owl's dive is a beam dive, while no captive is held and no beam is on. */
export const beamDiveChance = 0.5;
/** Px per tick the beam pulls a captured firefly up to its Owl. */
export const captivePullSpeed = 1;
/** A captive sits this far above its Owl's centre. */
export const captiveOffset = 16;

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

/** A diving Owl shot after `escortsKilled` of its escorts: 400, 800 or 1600 (Galaga's escort-kill bonus). */
const owlEscortPoints: readonly number[] = [400, 800, 1600];

export function points(kind: EnemyKind, diving: boolean, escortsKilled = 0): number {
  const p = killPoints[kind];
  if (kind === "owl" && diving) return owlEscortPoints[escortsKilled] ?? p.diving;
  return diving ? p.diving : p.formation;
}
