// Per-tick state snapshots (§4.3). THIS FILE IS THE CONTRACT: the recorded
// traces (Go-recorded, or re-recorded from the TS game with `bun run traces`)
// hold exactly these JSON keys, every porter's `snapshot()`
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
import type { PrizeId } from "../arcade/prizes.ts";

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
export type ArcadeTitle = "brassMonkey" | "sweet" | "firefly";

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
   * `State.imageTitle`: the Brass Monkey title (`imageTitleBrassMonkey` here) → "brassMonkey",
   * `ImageTitleSweet` → "sweet", `ImageTitleFirefly` → "firefly", nil → null.
   */
  title: ArcadeTitle | null;
  /** The player's high score on each machine (Go had one `State.HighScore`). */
  highScores: { sweetSam: number; firefly: number; brassMonkey: number };
  /** Tokens left (no Go original); 0 means the next cabinet start is free play. */
  tokens: number;
  /** Tickets won so far (no Go original). */
  tickets: number;
  /**
   * Prizes the player owns, in catalogue order (no Go original, #22). The
   * key is absent while they own none, so the traces recorded before prizes
   * existed (which own none) still match key for key.
   */
  prizes?: PrizeId[];
}

/** How the running minigame was started (`RunKind` in src/arcade/wallet.ts). */
export type RunKindSnapshot = "paid" | "free" | "direct";

/**
 * A menu the Game shows: over a minigame, the minigame pause menu, its
 * controls panel or the payout; over the hub, the prize counter menu.
 */
export type GameMenu = "paused" | "controls" | "payout" | "prizeCounter";

export interface GameSnapshot extends SceneSnapshotBase {
  /** `Game.debugMode`. */
  debug: boolean;
  /** Name of the active `Game.software` after the tick, or null in the hub. */
  software: SoftwareName | null;
  arcade: ArcadeSnapshot;
  /** How the running minigame was started, or null in the hub (no Go original). */
  run: RunKindSnapshot | null;
  /** The menu over the minigame or the hub, or null (no Go original). */
  menu: GameMenu | null;
  /**
   * Selected item of the minigame pause menu (RESUME, CONTROLS, QUIT GAME)
   * or the prize counter (0-8 the prize shelf row by row, 9 BUY TOKEN, 10
   * CLOSE; `counterSlot` in ./menus.ts). Stays 1 (CONTROLS) while
   * the controls panel shows; 0 in the hub, the running minigame and the
   * payout.
   */
  cursor: number;
  /** The payout while it shows, else null. */
  payout: PayoutSnapshot | null;
  /** Snapshot of the active software (matches `software`), or null in the hub. */
  sw: SoftwareSnapshot | null;
  /**
   * Sound events in call order ("play:start", "rewind:laser", …) emitted
   * since the end of the previous tick. For tick 1 this also includes events
   * emitted while constructing the game and its initial software (Sweet Sam's
   * `StartState.OnEnter` plays "rewind:start", "play:start" at construction).
   * Go harness: install `OnSoundEvent` before `game.New(...)`, flush the
   * buffer into each tick's snapshot.
   */
  sounds: SoundEvent[];
}

/** The payout menu (src/game/payout.ts): no Go original. */
export interface PayoutSnapshot {
  /** Score still shown; spins down to 0. */
  score: number;
  /** Tickets shown so far; spins up to `total`. */
  tickets: number;
  /** Tickets this run pays (already added to `arcade.tickets`). */
  total: number;
  /** The run was free play: it pays nothing. */
  freePlay: boolean;
  /** The numbers or their reels are still moving; Space skips to the totals. */
  counting: boolean;
}

// ---------------------------------------------------------------------------
// sweetSam (the Go port's Sweet Sam package)

/** Go `StateID` values. */
export type SweetSamStateId = "START" | "PLAY" | "PAUSE" | "DEATHWAIT" | "FINALDEATHWAIT" | "GAMEOVER" | "LEVELCLEAR";

/** Enemy identity; Go compares `e.color` against `colorRed`, `colorPink`, `colorTeal`, `colorOrange`. */
export type SweetSamEnemyKind = "red" | "pink" | "teal" | "orange";

export interface SweetSamPlayerSnapshot {
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

export interface SweetSamEnemySnapshot {
  /** From `Entity.color` (see `SweetSamEnemyKind`). */
  kind: SweetSamEnemyKind;
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

export interface SweetSamPopupSnapshot {
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
export type SweetSamDialSnapshot = [settled: number, active: boolean, from: number, to: number, t: number];

export interface SweetSamSnapshot {
  /** `stateMachine.CurrentID()`. */
  state: SweetSamStateId;
  player: SweetSamPlayerSnapshot;
  /** `SweetSamSoftware.enemies` in slice order (red, pink, teal, orange as built by `newEnemies`). */
  enemies: SweetSamEnemySnapshot[];
  /** Number of non-nil entries in `SweetSamSoftware.items`. */
  items: number;
  /**
   * FNV-1a 32-bit (`fnv1a32` in src/engine/gomath.ts) over the indexes of the
   * non-nil `items` entries, ascending, each as a little-endian uint32.
   */
  itemsHash: number;
  /** `SweetSamSoftware.score`. */
  score: number;
  /** `SweetSamSoftware.lives`. */
  lives: number;
  /** `SweetSamSoftware.highScore`. */
  highScore: number;
  /** `SweetSamSoftware.modeIndex`. */
  modeIndex: number;
  /** `SweetSamSoftware.modeCurrent` as the Go `mode` int: 0 = modeScatter, 1 = modeChase. */
  mode: number;
  /** `SweetSamSoftware.modeTicks`. */
  modeTicks: number;
  /** `SweetSamSoftware.pauseTicks`. */
  pauseTicks: number;
  /** `SweetSamSoftware.startTicks`. */
  startTicks: number;
  /** `StartState.respawnBlinkRemaining` (the registered START state's field, whatever the current state). */
  respawnBlinkRemaining: number;
  /** `SweetSamSoftware.scaredEatAwardNext`. */
  scaredEatAwardNext: number;
  /** `SweetSamSoftware.bonusEatPopups` in slice order. */
  popups: SweetSamPopupSnapshot[];
  /**
   * Camera: `[shakeOffsetX, shakeOffsetY, shakeTicksRemaining, shakeIntensity]`.
   */
  shake: [ox: number, oy: number, ticks: number, intensity: number];
  /**
   * Count of pool entries with `Particle.Active`. Particle positions are
   * deliberately excluded: they come from `Sin/Cos` (fact 3).
   */
  particlesActive: number;
  /** `SweetSamSoftware.pelletAnimTick`. */
  pelletAnimTick: number;
  /** 12 dials: `scoreDial[0..5]` then `highScoreDial[0..5]`. */
  dials: SweetSamDialSnapshot[];
  /** The level being played, from 1 (#47). */
  level: number;
  /** START ticks left showing "LEVEL n" before READY (0 on level 1 and after a lost life). */
  levelBannerTicks: number;
  /** The maze is drawn in its flash colours this tick (the level-clear flash). */
  mazeFlash: boolean;
  /** The bonus flower: ticks it has left (0 = not there) and how many have appeared on this level. */
  flower: { ticks: number; shown: number };
  /** The points of the bonus flower just eaten, and the ticks they still show; null when none. */
  flowerPopup: { points: number; ticks: number } | null;
  /** The bear's death frame (0 dazed, 1 sinking, 2 flat, 3 puddle) during a death wait; null otherwise. */
  deathFrame: number | null;
}

// ---------------------------------------------------------------------------
// firefly (internal/firefly)

/** Firefly enemy kinds (`EnemyKind` in src/firefly/rules.ts). */
export type FireflyEnemyKind = "moth" | "wasp" | "owl";

/**
 * Where an enemy is in its life: waiting to fly in, on its entry curve,
 * flying straight to its slot, in the formation, or diving at the firefly.
 */
export type FireflyEnemyState = "waiting" | "entering" | "joining" | "formation" | "diving";

export interface FireflyEnemySnapshot {
  kind: FireflyEnemyKind;
  /** Its formation slot: row (0 at the top) and column. */
  row: number;
  col: number;
  state: FireflyEnemyState;
  x: number;
  y: number;
  /** Its last move, which the sprite faces. */
  dx: number;
  dy: number;
  /** Spark hits it can still take (an Owl at 1 is hurt). */
  hp: number;
  /** Ticks left of its hit effect once killed, else 0. */
  deadFrames: number;
  /** It dove and is not back in the formation yet: a kill scores the diving points. */
  outOfFormation: boolean;
}

export interface FireflyShotSnapshot {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface FireflySnapshot {
  /** The stage being played (1 is the first). */
  stage: number;
  /** Ticks since the stage started; "STAGE n" shows for the first `stageIntroTicks`. */
  stageTick: number;
  /** Lives left, the firefly in play included. */
  lives: number;
  score: number;
  /** The run is over: `gameOver()`. */
  over: boolean;
  /** The firefly's centre. */
  player: { x: number; y: number };
  /** Ticks until the firefly comes back (or the run ends) after losing a life; 0 while it is in play. */
  respawn: number;
  /** Ticks until the firefly can shoot again. */
  fireDelay: number;
  /** Sparks in flight: their centres. */
  sparks: { x: number; y: number }[];
  /** Every enemy of the stage still alive or showing its hit effect, in formation order. */
  enemies: FireflyEnemySnapshot[];
  /** Enemy shots in flight: centre and velocity. */
  shots: FireflyShotSnapshot[];
  /** Ticks until the next dive may start. */
  diveTimer: number;
  /** The formation's x offset this tick. */
  sway: number;
}

// ---------------------------------------------------------------------------
// brassMonkey (the Go port's Brass Monkey package)

/** A gear or an ember (`Hazard` in src/brass-monkey/play.ts). */
export interface BrassMonkeyHazardSnapshot {
  kind: "gear" | "ember";
  x: number;
  y: number;
  dir: -1 | 1;
  footing: "ground" | "air" | "climb";
}

/** Brass Monkey's run (`Run` in src/brass-monkey/play.ts); x is the monkey's middle and y the row its foot stands on. */
export interface BrassMonkeySnapshot {
  phase: "play" | "dying" | "clear" | "escape" | "over";
  phaseTicks: number;
  /** 0 the girder floor, 1 the conveyor floor. */
  floor: number;
  /** Escapes so far: each loop is harder. */
  loop: number;
  lives: number;
  score: number;
  highScore: number;
  bonus: number;
  x: number;
  y: number;
  footing: "ground" | "air" | "climb";
  vy: number;
  /** The walk cycle (0 up to 4), or the climb (0 up to 2). */
  frame: number;
  left: boolean;
  moving: boolean;
  hazards: BrassMonkeyHazardSnapshot[];
  /** Whether each of the floor's bolts has been collected. */
  bolts: boolean[];
  gearTimer: number;
  emberTimer: number;
}

/** What `Software.snapshot()` returns; `GameSnapshot.software` says which. */
export type SoftwareSnapshot = SweetSamSnapshot | FireflySnapshot | BrassMonkeySnapshot;

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

/** What `Scene.snapshot()` returns. */
export type SceneSnapshot = TitleSnapshot | GameSnapshot;
