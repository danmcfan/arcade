// Port of internal/hive/software.go (constants live in ./constants.ts).

import type { Input } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imageHive } from "../engine/assets.ts";
import { fnv1a32 } from "../engine/gomath.ts";
import type { FixedViewport } from "../game/software.ts";
import type { HiveDialSnapshot, HiveSnapshot } from "../game/snapshot.ts";
import { CameraSystem } from "./camera.ts";
import { ParticleSystem } from "./particle.ts";
import type { BonusEatPopup } from "./bonusEat.ts";
import { cabinetHeight, cabinetWidth } from "./cabinet.ts";
import { digits6, newDigitReels, type DigitReel, type DigitReels } from "./digitReel.ts";
import { Entity, newCorners, newItems, newPlayer } from "./entity.ts";
import {
  DeathWaitState,
  FinalDeathWaitState,
  GameOverState,
  PauseState,
  PlayState,
  StartState,
  StateMachine,
  stateIDDeathWait,
  stateIDFinalDeathWait,
  stateIDGameOver,
  stateIDPause,
  stateIDPlay,
  stateIDStart,
} from "./state.ts";
import { modeScatter, restartRound, update, type Mode } from "./update.ts";
import { draw, type DrawCache } from "./draw.ts";

export { framesPerSecond, blueFramesDuration } from "./constants.ts";

export class HiveSoftware implements FixedViewport {
  readonly name = "hive";

  readonly stateMachine = new StateMachine();
  /** Kept to snapshot `respawnBlinkRemaining` whatever the current state. */
  readonly startState: StartState;

  readonly camera = new CameraSystem();
  readonly particles = new ParticleSystem();

  // Assigned by restartRound() in the constructor (Go leaves them nil until then).
  player: Entity = newPlayer();
  enemies: Entity[] = [];
  items: (Entity | null)[] = [];
  readonly corners: Entity[] = newCorners();

  modeIndex = 0;
  modeCurrent: Mode = modeScatter;
  modeTicks = 0;

  pauseTicks = 0;

  startTicks = 0;

  lives = 0;
  /** Go `HiveSoftware.score` (renamed: `score()` is the Software method). */
  scoreValue = 0;
  highScore: number;

  readonly scoreDial: DigitReels = newDigitReels();
  readonly highScoreDial: DigitReels = newDigitReels();

  /** Advances every Hive update; food atlases cycle (tick/holdTicks % frameCount) per pellet row. */
  pelletAnimTick = 0;

  /** Transient sprites when eating scared bees (bonusEat.ts). */
  bonusEatPopups: BonusEatPopup[] = [];
  /** Index for next 200→400→800→1600 payout while bees stay scared. */
  scaredEatAwardNext = 0;

  cabinetJoystickFrame = 0;

  /** Lazily created draw resources (Go `digitDialScratch`); never touched by update (D12). */
  drawCache: DrawCache = { digitDialScratch: null };

  constructor(highscore: number) {
    this.highScore = highscore;

    this.startState = new StartState(this);
    this.stateMachine.registerState(stateIDStart, this.startState);
    this.stateMachine.registerState(stateIDPlay, new PlayState(this));
    this.stateMachine.registerState(stateIDPause, new PauseState(this));
    this.stateMachine.registerState(stateIDDeathWait, new DeathWaitState(this));
    this.stateMachine.registerState(stateIDFinalDeathWait, new FinalDeathWaitState(this));
    this.stateMachine.registerState(stateIDGameOver, new GameOverState());

    this.lives = 3;
    this.scoreValue = 0;
    this.items = newItems();

    const z = digits6(0);
    this.scoreDial.forEach((r, i) => r.boot(z[i] ?? 0));
    let hc = highscore;
    if (hc < 0) {
      hc = 0;
    }
    if (hc > 999_999) {
      hc = 999_999;
    }
    const hd = digits6(hc);
    this.highScoreDial.forEach((r, i) => r.boot(hd[i] ?? 0));

    restartRound(this);

    this.stateMachine.changeState(stateIDStart);
  }

  /** Go `Score()`. */
  score(): number {
    return this.scoreValue;
  }

  background(): Sprite {
    return imageHive;
  }

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  update(i: Input): void {
    update(this, i);
  }

  draw(screen: Surface, _buffer: number): void {
    draw(this, screen);
  }

  gameOver(): boolean {
    return this.lives <= 0 && this.stateMachine.currentId() === stateIDGameOver;
  }

  movingEntities(): Entity[] {
    return [this.player, ...this.enemies];
  }

  snapshot(): HiveSnapshot {
    const state = this.stateMachine.currentId();
    if (state === "") {
      throw new Error("hive: snapshot before the state machine started");
    }
    const present: number[] = [];
    this.items.forEach((it, idx) => {
      if (it !== null) present.push(idx);
    });
    const p = this.player;
    const dial = (r: DigitReel): HiveDialSnapshot => [r.settledDigit, r.active, r.from, r.to, r.t];
    return {
      state,
      player: { x: p.x, y: p.y, dir: realDir(p.direction), frame: p.frame, hidden: p.hidden, velocity: p.velocity },
      enemies: this.enemies.map((e) => ({
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
        reverse: e.reverseDirection,
        reverseTile: [e.reverseTile.x, e.reverseTile.y],
      })),
      items: present.length,
      itemsHash: fnv1a32(present),
      score: this.scoreValue,
      lives: this.lives,
      highScore: this.highScore,
      modeIndex: this.modeIndex,
      mode: this.modeCurrent,
      modeTicks: this.modeTicks,
      pauseTicks: this.pauseTicks,
      startTicks: this.startTicks,
      respawnBlinkRemaining: this.startState.respawnBlinkRemaining,
      scaredEatAwardNext: this.scaredEatAwardNext,
      popups: this.bonusEatPopups.map((b) => ({ x: b.x, y: b.y, frameIdx: b.frameIdx, ticks: b.ticksRemain })),
      shake: [this.camera.shakeOffsetX, this.camera.shakeOffsetY, this.camera.shakeTicksRemaining, this.camera.shakeIntensity],
      particlesActive: this.particles.activeCount(),
      pelletAnimTick: this.pelletAnimTick,
      joystick: this.cabinetJoystickFrame,
      dials: [...this.scoreDial.map(dial), ...this.highScoreDial.map(dial)],
    };
  }
}

function realDir<T extends string>(d: T | ""): T {
  if (d === "") throw new Error("hive: entity has no direction");
  return d;
}

function realKind<T extends string>(k: T | null): T {
  if (k === null) throw new Error("hive: enemy has no kind");
  return k;
}
