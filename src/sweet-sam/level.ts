// Sweet Sam's Level loop (#271): one module owns the maze, the bees, the
// honey drops, the release counters, the score and the state machine. Its
// interface is `step()`, read-only queries and `snapshot()`; its state (the
// Board, board.ts) is private, and the states, rules and helpers that change
// it (state.ts, update.ts, flower.ts, bonusEat.ts) run behind it. Headless
// (ADR 0003): sounds, shakes and bursts leave as `LevelEffect`s.

import type { Direction, Input } from "../engine/input.ts";
import { fnv1a32 } from "../engine/gomath.ts";
import type { SweetSamSnapshot } from "../game/snapshot.ts";
import { Board } from "./board.ts";
import type { LevelEffect } from "./levelEffect.ts";
import type { BonusEatPopup, FlowerPopup } from "./bonusEat.ts";
import { tickBonusEatPopups, tickFlowerPopup } from "./bonusEat.ts";
import { newItems, type Entity } from "./entity.ts";
import { afterDeath } from "./release.ts";
import { noAdvantages, smokeWarningTicks, type SweetSamAdvantages } from "./advantages.ts";

/** Ticks each grey or colour flash lasts while the smoke clears. */
const smokeFlashTicks = 8;
import type { LevelValues, Mode } from "./levels.ts";
import type { IntermissionPose, IntermissionScene } from "./intermission.ts";
import {
  DeathWaitState,
  FinalDeathWaitState,
  GameOverState,
  IntermissionState,
  LevelClearState,
  PauseState,
  PlayState,
  StartState,
  StateMachine,
  stateIDDeathWait,
  stateIDFinalDeathWait,
  stateIDGameOver,
  stateIDIntermission,
  stateIDLevelClear,
  stateIDPause,
  stateIDPlay,
  stateIDStart,
  type StateID,
} from "./state.ts";
import { restartRound } from "./update.ts";

/** The Level's part of the snapshot; the software adds the camera, particles and dials (with the high score). */
export type LevelSnapshot = Omit<SweetSamSnapshot, "shake" | "particlesActive" | "dials" | "highScore">;

/** A honey drop or pot, as a setup sees and places it. */
export interface ItemSetup {
  x: number;
  y: number;
  /** A honey pot rather than a drop. */
  power: boolean;
}

/** A bee's place and mood in a setup; unset fields keep the new round's values. */
export interface BeeSetup {
  /** Stands on the bear, out in the maze, free to leave and not turning round. */
  onPlayer?: boolean;
  x?: number;
  y?: number;
  dir?: Direction;
  home?: boolean;
  dotMinimum?: number;
  blueFrames?: number;
  eyes?: boolean;
}

/**
 * A position to start the Level from, in PLAY (tests and scenarios): unset
 * fields keep a fresh game's values, and the bear faces left as after READY.
 */
export interface LevelSetup {
  level?: number;
  lives?: number;
  score?: number;
  player?: { x?: number; y?: number; dir?: Direction };
  /** By index: red, pink, teal, orange. */
  bees?: readonly (BeeSetup | undefined)[];
  /** Maps each honey drop and pot of the maze: return null to take it away, or where it stands. */
  items?: (item: ItemSetup, index: number) => ItemSetup | null;
  /** The scatter/chase sequence: the next entry and the ticks left in the current one. */
  mode?: { index: number; ticks: number };
  scaredEatAwardNext?: number;
  flowerTicks?: number;
  /** A round after a lost life, with this many drops on the global counter (release.ts). */
  globalDots?: number;
}

/** The queries the drawing reads (draw.ts). */
export type LevelView = Pick<
  Level,
  | "state"
  | "score"
  | "lives"
  | "levelNumber"
  | "player"
  | "enemies"
  | "items"
  | "mode"
  | "startTicks"
  | "pelletAnimTick"
  | "flowerShowing"
  | "flowerPopup"
  | "popups"
  | "mazeFlash"
  | "smoked"
  | "intermission"
  | "intermissionPoses"
  | "deathFrame"
>;

export class Level {
  readonly #board: Board;
  readonly #stateMachine = new StateMachine();
  /** Kept to snapshot `respawnBlinkRemaining` whatever the current state. */
  readonly #startState: StartState;
  readonly #deathWait: DeathWaitState;
  readonly #finalDeathWait: FinalDeathWaitState;
  readonly #levelClear: LevelClearState;
  readonly #intermission: IntermissionState;

  constructor(
    advantages: Readonly<SweetSamAdvantages> = noAdvantages,
    effects: (e: LevelEffect) => void = (): void => {},
    setup?: LevelSetup,
  ) {
    const b = new Board(advantages, effects);
    this.#board = b;
    this.#startState = new StartState(b);
    this.#deathWait = new DeathWaitState(b);
    this.#finalDeathWait = new FinalDeathWaitState(b);
    this.#levelClear = new LevelClearState(b);
    this.#intermission = new IntermissionState(b);
    this.#stateMachine.registerState(stateIDStart, this.#startState);
    this.#stateMachine.registerState(stateIDPlay, new PlayState(b));
    this.#stateMachine.registerState(stateIDPause, new PauseState(b));
    this.#stateMachine.registerState(stateIDDeathWait, this.#deathWait);
    this.#stateMachine.registerState(stateIDFinalDeathWait, this.#finalDeathWait);
    this.#stateMachine.registerState(stateIDGameOver, new GameOverState());
    this.#stateMachine.registerState(stateIDLevelClear, this.#levelClear);
    this.#stateMachine.registerState(stateIDIntermission, this.#intermission);

    if (setup === undefined) {
      restartRound(b);
      this.#stateMachine.changeState(stateIDStart);
      return;
    }
    b.level = setup.level ?? b.level;
    restartRound(b);
    arrange(b, setup);
    this.#stateMachine.changeState(stateIDPlay);
  }

  /**
   * Advances one tick. The order is part of the spec: pelletAnimTick, state
   * machine, popups.
   */
  step(i: Input): void {
    const b = this.#board;
    b.pelletAnimTick++;
    this.#stateMachine.update(i);
    tickBonusEatPopups(b);
    tickFlowerPopup(b);
  }

  /** Test hook: start `level` from READY!, as a level clear would. */
  jumpTo(level: number): void {
    const b = this.#board;
    b.level = level;
    b.items = newItems();
    b.flowersShown = 0;
    restartRound(b);
    this.#stateMachine.changeState(stateIDStart);
  }

  state(): StateID {
    const state = this.#stateMachine.currentId();
    if (state === "") {
      throw new Error("sweetSam: snapshot before the state machine started");
    }
    return state;
  }

  score(): number {
    return this.#board.score;
  }

  lives(): number {
    return this.#board.lives;
  }

  /** The level being played, from 1. */
  levelNumber(): number {
    return this.#board.level;
  }

  gameOver(): boolean {
    return this.#board.lives <= 0 && this.#stateMachine.currentId() === stateIDGameOver;
  }

  /** How hard the current level is. */
  values(): LevelValues {
    return this.#board.values();
  }

  player(): Readonly<Entity> {
    return this.#board.player;
  }

  enemies(): readonly Readonly<Entity>[] {
    return this.#board.enemies;
  }

  movingEntities(): readonly Readonly<Entity>[] {
    return this.#board.movingEntities();
  }

  /** The maze's honey drops and pots by index; null where one was eaten. */
  items(): readonly (Readonly<Entity> | null)[] {
    return this.#board.items;
  }

  /** The scatter/chase sequence: the next entry, the current mode and its ticks left. */
  mode(): { index: number; current: Mode; ticks: number } {
    const b = this.#board;
    return { index: b.modeIndex, current: b.modeCurrent, ticks: b.modeTicks };
  }

  /** START ticks left before PLAY. */
  startTicks(): number {
    return this.#board.startTicks;
  }

  pelletAnimTick(): number {
    return this.#board.pelletAnimTick;
  }

  /** The bonus flower stands below the bee home. */
  flowerShowing(): boolean {
    return this.#board.flowerTicks > 0;
  }

  /** The points of the flower just eaten, while they show. */
  flowerPopup(): Readonly<FlowerPopup> | null {
    return this.#board.flowerPopup;
  }

  /** The points above the bees just eaten. */
  popups(): readonly Readonly<BonusEatPopup>[] {
    return this.#board.bonusEatPopups;
  }

  /** The maze shows its flash colours this tick (the level-clear flash). */
  /**
   * Whether the bear is drawn in smoke (#268): grey while a smoke bomb hides
   * it, flashing back into colour over its last `smokeWarningTicks`.
   */
  smoked(): boolean {
    const t = this.#board.smokeTicks;
    return t > 0 && (t > smokeWarningTicks || Math.trunc(t / smokeFlashTicks) % 2 === 1);
  }

  /** Smoke bombs this life has left, and ticks the bear stays hidden. */
  smoke(): { bombs: number; ticks: number } {
    return { bombs: this.#board.smokeBombs, ticks: this.#board.smokeTicks };
  }

  mazeFlash(): boolean {
    return this.#stateMachine.currentId() === stateIDLevelClear && this.#levelClear.flash();
  }

  /** The cutscene playing (after the level before this one), or null outside INTERMISSION. */
  intermission(): IntermissionScene | null {
    return this.#stateMachine.currentId() === stateIDIntermission ? this.#intermission.scene() : null;
  }

  /** The cutscene's actors at this tick, or null outside INTERMISSION. */
  intermissionPoses(): IntermissionPose[] | null {
    return this.#stateMachine.currentId() === stateIDIntermission ? this.#intermission.poses() : null;
  }

  /** The bear's death frame (0 dazed … 3 puddle) while a death wait runs; null otherwise. */
  deathFrame(): number | null {
    const id = this.#stateMachine.currentId();
    if (id === stateIDDeathWait) return this.#deathWait.deathFrame();
    if (id === stateIDFinalDeathWait) return this.#finalDeathWait.deathFrame();
    return null;
  }

  snapshot(): LevelSnapshot {
    const b = this.#board;
    const present: number[] = [];
    b.items.forEach((it, idx) => {
      if (it !== null) present.push(idx);
    });
    const p = b.player;
    return {
      state: this.state(),
      player: {
        x: p.x,
        y: p.y,
        dir: realDir(p.direction),
        frame: p.frame,
        hidden: p.hidden,
        velocity: p.velocity,
        turn: p.turn,
        cornering: p.cornering !== null,
      },
      enemies: b.enemies.map((e) => ({
        kind: realKind(e.kind),
        x: e.x,
        y: e.y,
        dir: realDir(e.direction),
        frame: e.frame,
        velocity: e.velocity,
        blue: e.blueFrames,
        flashFrames: e.flashFrames,
        flash: e.flash,
        home: e.home,
        dotMin: e.dotMinimum,
        held: e.held,
        eyes: e.eyes,
        reverse: e.reverseDirection,
        leaveRight: e.leaveRight,
        reverseTile: [e.reverseTile.x, e.reverseTile.y],
      })),
      items: present.length,
      itemsHash: fnv1a32(present),
      score: b.score,
      lives: b.lives,
      modeIndex: b.modeIndex,
      mode: b.modeCurrent,
      modeTicks: b.modeTicks,
      release: {
        globalDots: b.release.globalDots,
        idleTicks: b.release.idleTicks,
        elroySuspended: b.release.elroySuspended,
      },
      pauseTicks: b.pauseTicks,
      eatPauseTicks: b.eatPauseTicks,
      startTicks: b.startTicks,
      respawnBlinkRemaining: this.#startState.respawnBlinkRemaining,
      scaredEatAwardNext: b.scaredEatAwardNext,
      popups: b.bonusEatPopups.map((pop) => ({ x: pop.x, y: pop.y, frameIdx: pop.frameIdx, ticks: pop.ticksRemain })),
      pelletAnimTick: b.pelletAnimTick,
      level: b.level,
      mazeFlash: this.mazeFlash(),
      flower: { ticks: b.flowerTicks, shown: b.flowersShown },
      flowerPopup: b.flowerPopup === null ? null : { ...b.flowerPopup },
      deathFrame: this.deathFrame(),
    };
  }
}

/** Puts a new round where `setup` says. */
function arrange(b: Board, setup: LevelSetup): void {
  if (setup.globalDots !== undefined) {
    b.enemies = afterDeath(b.release, b.enemies);
    b.release.globalDots = setup.globalDots;
  }
  b.lives = setup.lives ?? b.lives;
  b.score = setup.score ?? b.score;
  const p = setup.player;
  b.player.x = p?.x ?? b.player.x;
  b.player.y = p?.y ?? b.player.y;
  b.player.direction = p?.dir ?? "LEFT";
  setup.bees?.forEach((bee, idx) => {
    const e = b.enemies[idx];
    if (bee === undefined || e === undefined) return;
    if (bee.onPlayer === true) {
      e.x = b.player.x;
      e.y = b.player.y;
      e.home = false;
      e.dotMinimum = 0;
    }
    e.x = bee.x ?? e.x;
    e.y = bee.y ?? e.y;
    e.direction = bee.dir ?? e.direction;
    e.home = bee.home ?? e.home;
    e.dotMinimum = bee.dotMinimum ?? e.dotMinimum;
    e.blueFrames = bee.blueFrames ?? e.blueFrames;
    e.eyes = bee.eyes ?? e.eyes;
  });
  const items = setup.items;
  if (items !== undefined) {
    b.items = b.items.map((it, idx) => {
      if (it === null) return null;
      const placed = items({ x: it.x, y: it.y, power: it.powerPellet }, idx);
      if (placed === null) return null;
      it.x = placed.x;
      it.y = placed.y;
      it.powerPellet = placed.power;
      return it;
    });
  }
  if (setup.mode !== undefined) {
    b.modeIndex = setup.mode.index;
    b.modeTicks = setup.mode.ticks;
    b.modeCurrent = b.values().modeSequence[setup.mode.index - 1]?.mode ?? b.modeCurrent;
  }
  b.scaredEatAwardNext = setup.scaredEatAwardNext ?? b.scaredEatAwardNext;
  b.flowerTicks = setup.flowerTicks ?? b.flowerTicks;
}

function realDir<T extends string>(d: T | ""): T {
  if (d === "") throw new Error("sweetSam: entity has no direction");
  return d;
}

function realKind<T extends string>(k: T | null): T {
  if (k === null) throw new Error("sweetSam: enemy has no kind");
  return k;
}
