// Per-tick state snapshots (§4.3). THIS FILE IS THE CONTRACT: the Go golden
// harness (T2) emits exactly these JSON keys, every porter's `snapshot()`
// returns exactly these keys, and `test/parity/harness.ts` diffs them
// field for field. Do not add, rename or drop keys without updating all three.
//
// Conventions
// - One JSON object per tick (JSONL), written AFTER the tick's update. The
//   object written after the Nth `step()` has `tick: N` (the first is 1).
// - Go `int` fields are integers; Go `float64` fields are serialized with
//   Go's JSON encoder (shortest round-trip), compared exactly.
// - Go `nil` becomes JSON `null`; Go empty slices must serialize as `[]`,
//   never `null` (Go harness: initialize with `make`/`[]T{}`).
// - Tuples (`[x, y]`, `shake`, `dials`) are JSON arrays.
// - Directions use the Go string values "UP" | "DOWN" | "LEFT" | "RIGHT".

import type { Direction } from "../engine/input.ts";
import type { SoundEvent } from "../engine/audio.ts";
import type { SoftwareName } from "./software.ts";

/** Fields every top-level scene snapshot carries. */
export interface SceneSnapshotBase {
  /** Number of `step()` calls completed (1 after the first tick). */
  tick: number;
  /** `rng.state()` (uint32) after the tick: catches any change in random-call order. */
  rng: number;
}

// ---------------------------------------------------------------------------
// game (internal/game + internal/arcade)

/** Title image shown by the hub: Go `State.imageTitle` (nil → null). */
export type ArcadeTitle = "gearhead" | "sweet" | "firefly";

export interface ArcadePlayerSnapshot {
  /** `entity.X` (float64). */
  x: number;
  /** `entity.Y` (float64). */
  y: number;
  /** `entity.Direction` (arcade.Direction string). */
  dir: Direction;
  /** `entity.Frame` (float64). */
  frame: number;
}

export interface ArcadeSnapshot {
  player: ArcadePlayerSnapshot;
  /** `State.melodyPlaying`. */
  melodyPlaying: boolean;
  /**
   * `State.imageTitle`: `assets.ImageTitleGearhead` → "gearhead",
   * `ImageTitleSweet` → "sweet", `ImageTitleFirefly` → "firefly", nil → null.
   */
  title: ArcadeTitle | null;
  /** `State.HighScore`. */
  highScore: number;
}

export interface GameSnapshot extends SceneSnapshotBase {
  /** `Game.debugMode`. */
  debug: boolean;
  /** Name of the active `Game.software` after the tick, or null in the hub. */
  software: SoftwareName | null;
  arcade: ArcadeSnapshot;
  /** Snapshot of the active software (matches `software`), or null in the hub. */
  sw: SoftwareSnapshot | null;
  /**
   * Sound events in call order ("play:start", "rewind:laser", …) emitted
   * since the end of the previous tick. For tick 1 this also includes events
   * emitted while constructing the game and its initial software (hive's
   * `StartState.OnEnter` plays "rewind:start", "play:start" at construction).
   * Go harness: install `OnSoundEvent` before `game.New(...)`, flush the
   * buffer into each tick's snapshot.
   */
  sounds: SoundEvent[];
}

// ---------------------------------------------------------------------------
// hive (internal/hive)

/** Go `StateID` values. */
export type HiveStateId = "START" | "PLAY" | "PAUSE" | "DEATHWAIT" | "FINALDEATHWAIT" | "GAMEOVER";

/** Enemy identity; Go compares `e.color` against `colorRed`, `colorPink`, `colorTeal`, `colorOrange`. */
export type HiveEnemyKind = "red" | "pink" | "teal" | "orange";

export interface HivePlayerSnapshot {
  /** `Entity.X`. */
  x: number;
  /** `Entity.Y`. */
  y: number;
  /** `Entity.Direction`. */
  dir: Direction;
  /** `Entity.Frame` (float64). */
  frame: number;
  /** `Entity.Hidden`. */
  hidden: boolean;
  /** `Entity.Velocity`. */
  velocity: number;
}

export interface HiveEnemySnapshot {
  /** From `Entity.color` (see `HiveEnemyKind`). */
  kind: HiveEnemyKind;
  /** `Entity.X`. */
  x: number;
  /** `Entity.Y`. */
  y: number;
  /** `Entity.Direction`. */
  dir: Direction;
  /** `Entity.Frame` (float64). */
  frame: number;
  /** `Entity.Velocity`. */
  velocity: number;
  /** `Entity.BlueFrames`. */
  blue: number;
  /** `Entity.FlashFrames`. */
  flashFrames: number;
  /** `Entity.Flash`. */
  flash: boolean;
  /** `Entity.home`. */
  home: boolean;
  /** `Entity.dotMinimum`. */
  dotMin: number;
  /** `Entity.reverseDirection`. */
  reverse: boolean;
  /** `Entity.reverseTile` as `[x, y]`. */
  reverseTile: [number, number];
}

export interface HivePopupSnapshot {
  /** `bonusEatPopup.x`. */
  x: number;
  /** `bonusEatPopup.y`. */
  y: number;
  /** `bonusEatPopup.frameIdx`. */
  frameIdx: number;
  /** `bonusEatPopup.ticksRemain`. */
  ticks: number;
}

/**
 * One rolling digit: `[SettledDigit, active, from, to, t]` from `DigitReel`
 * (`SettledDigit`, `active`, `from`, `to` ints/bool; `t` float64).
 */
export type HiveDialSnapshot = [settled: number, active: boolean, from: number, to: number, t: number];

export interface HiveSnapshot {
  /** `stateMachine.CurrentID()`. */
  state: HiveStateId;
  player: HivePlayerSnapshot;
  /** `HiveSoftware.enemies` in slice order (red, pink, teal, orange as built by `newEnemies`). */
  enemies: HiveEnemySnapshot[];
  /** Number of non-nil entries in `HiveSoftware.items`. */
  items: number;
  /**
   * FNV-1a 32-bit (`fnv1a32` in src/engine/gomath.ts) over the indexes of the
   * non-nil `items` entries, ascending, each as a little-endian uint32.
   */
  itemsHash: number;
  /** `HiveSoftware.score`. */
  score: number;
  /** `HiveSoftware.lives`. */
  lives: number;
  /** `HiveSoftware.highScore`. */
  highScore: number;
  /** `HiveSoftware.modeIndex`. */
  modeIndex: number;
  /** `HiveSoftware.modeCurrent` as the Go `mode` int: 0 = modeScatter, 1 = modeChase. */
  mode: number;
  /** `HiveSoftware.modeTicks`. */
  modeTicks: number;
  /** `HiveSoftware.pauseTicks`. */
  pauseTicks: number;
  /** `HiveSoftware.startTicks`. */
  startTicks: number;
  /** `StartState.respawnBlinkRemaining` (the registered START state's field, whatever the current state). */
  respawnBlinkRemaining: number;
  /** `HiveSoftware.scaredEatAwardNext`. */
  scaredEatAwardNext: number;
  /** `HiveSoftware.bonusEatPopups` in slice order. */
  popups: HivePopupSnapshot[];
  /**
   * Camera: `[shakeOffsetX, shakeOffsetY, shakeTicksRemaining, shakeIntensity]`.
   */
  shake: [ox: number, oy: number, ticks: number, intensity: number];
  /**
   * Count of pool entries with `Particle.Active`. Particle positions are
   * deliberately excluded: they come from `Sin/Cos` (fact 3).
   */
  particlesActive: number;
  /** `HiveSoftware.pelletAnimTick`. */
  pelletAnimTick: number;
  /** `HiveSoftware.cabinetJoystickFrame`. */
  joystick: number;
  /** 12 dials: `scoreDial[0..5]` then `highScoreDial[0..5]`. */
  dials: HiveDialSnapshot[];
}

// ---------------------------------------------------------------------------
// firefly (internal/firefly)

export interface FireflyBulletSnapshot {
  /** `entity.Position.x`. */
  x: number;
  /** `entity.Position.y`. */
  y: number;
}

export interface FireflyBugSnapshot {
  /** Which bezier the bug follows: "L" = `leftBezierConfig`, "R" = `rightBezierConfig`. */
  pattern: "L" | "R";
  /** `entity.Position.x`. */
  x: number;
  /** `entity.Position.y`. */
  y: number;
  /** `entity.Direction.x`. */
  dx: number;
  /** `entity.Direction.y`. */
  dy: number;
  /** `entity.Duration` (float64; negative until spawned). */
  duration: number;
  /** `entity.DeadFrames`. */
  deadFrames: number;
}

export interface FireflySnapshot {
  /** `FireFlySoftware.player.Position`. */
  player: { x: number; y: number };
  /** `FireFlySoftware.fireDelay`. */
  fireDelay: number;
  /** `FireFlySoftware.bullets` in slice order. */
  bullets: FireflyBulletSnapshot[];
  /** `FireFlySoftware.bugs` in slice order. */
  bugs: FireflyBugSnapshot[];
}

// ---------------------------------------------------------------------------
// gearhead (internal/gearhead)

export interface GearheadSnapshot {
  /** `player.Position.X`. */
  x: number;
  /** `player.Position.Y`. */
  y: number;
  /** `player.Frame` (float64). */
  frame: number;
  /** `player.Left`. */
  left: boolean;
  /** `player.Moving`. */
  moving: boolean;
}

/** What `Software.snapshot()` returns; `GameSnapshot.software` says which. */
export type SoftwareSnapshot = HiveSnapshot | FireflySnapshot | GearheadSnapshot;

// ---------------------------------------------------------------------------
// wave (internal/wave, lab scene)

/** One `grid.Cell`. */
export interface WaveCellSnapshot {
  /** `Cell.Possible`, in slice order. */
  possible: number[];
  /** `Cell.Collapsed`. */
  collapsed: boolean;
}

export interface WaveSnapshot extends SceneSnapshotBase {
  /** `grid.CollapsedCount`. */
  collapsed: number;
  /** `grid.Width` (the current grid is square). */
  width: number;
  /**
   * FNV-1a 32-bit over, for each cell with `Collapsed && len(Possible) == 1`
   * in Draw order (x outer, y inner), the little-endian uint32 triple
   * `x, y, Possible[0]`.
   */
  cellsHash: number;
  /**
   * Full grid, `Cells[x][y]`. Present only when the snapshot is taken with
   * `{ full: true }`, which the harness does on the scenario's last tick
   * (Go harness: on the last JSONL line only). Omitted (key absent) otherwise.
   */
  cells?: WaveCellSnapshot[][];
}

// ---------------------------------------------------------------------------
// lumberjack (internal/lumberjack, lab scene)

export interface LumberjackPlayerSnapshot {
  /** `Player.PositionX`. */
  x: number;
  /** `Player.PositionY`. */
  y: number;
  /** `Player.Direction` (lumberjack.Direction string). */
  dir: Direction;
  /** `Player.FrameX`. */
  frameX: number;
  /** `Player.FrameY`. */
  frameY: number;
  /** `Player.FrameCounter`. */
  frameCounter: number;
  /** `Player.Moving`. */
  moving: boolean;
  /** `Player.Acting`. */
  acting: boolean;
}

export interface LumberjackTreeSnapshot {
  /** `Tree.PositionX`. */
  x: number;
  /** `Tree.PositionY`. */
  y: number;
  /** `Tree.Theta` (float64). */
  theta: number;
  /** `Tree.ThetaIncreasing`. */
  thetaInc: boolean;
  /** `Tree.Shaking`. */
  shaking: boolean;
  /** `Tree.ShakeRight`. */
  shakeRight: boolean;
  /** `Tree.Behind`. */
  behind: boolean;
  /** `Tree.Transparent`. */
  transparent: boolean;
  /** `Tree.Health` (float64; goes negative). */
  health: number;
}

export interface LumberjackSnapshot extends SceneSnapshotBase {
  player: LumberjackPlayerSnapshot;
  /** The global `trees` slice, in order. */
  trees: LumberjackTreeSnapshot[];
}

/** What `Scene.snapshot()` returns. */
// ---------------------------------------------------------------------------
// title (src/title): no Go original, so no parity trace.

/** Which screen the title scene shows. */
export type TitlePhase = "menu" | "confirm" | "intro" | "playing" | "paused" | "controls";

export interface TitleSnapshot extends SceneSnapshotBase {
  phase: TitlePhase;
  /** Labels of the menu on screen ("menu", "confirm" and "paused" phases), else []. */
  items: string[];
  /** Index into `items` of the selected entry (0 when there is no menu). */
  cursor: number;
  /** A save exists, so "Continue" can be chosen. */
  canContinue: boolean;
  /** The hosted Game's snapshot once a game is running, else null. */
  game: GameSnapshot | null;
}

export type SceneSnapshot = TitleSnapshot | GameSnapshot | WaveSnapshot | LumberjackSnapshot;
