// Port of the Go Sweet Sam minigame's software.go (docs/port-notes.md gives its
// old Go name). Its constants live in ./constants.ts.

import { newRelease, type Release } from "./release.ts";
import type { Input } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imageSweetSamMaze, sounds } from "../engine/assets.ts";
import { playSound } from "../engine/audio.ts";
import { extraLifeScore } from "./constants.ts";
import { fnv1a32 } from "../engine/gomath.ts";
import type { FixedViewport } from "../game/software.ts";
import type { SweetSamDialSnapshot, SweetSamSnapshot } from "../game/snapshot.ts";
import { CameraSystem } from "./camera.ts";
import { ParticleSystem } from "./particle.ts";
import type { BonusEatPopup, FlowerPopup } from "./bonusEat.ts";
import { cabinetHeight, cabinetWidth } from "../ui/cabinet.ts";
import { type DigitReel } from "../ui/digitReel.ts";
import { ScoreDials } from "../ui/scoreDials.ts";
import { Entity, newCorners, newItems, newPlayer } from "./entity.ts";
import {
  DeathWaitState,
  FinalDeathWaitState,
  GameOverState,
  LevelClearState,
  levelClearFlashTicks,
  levelClearTicks,
  PauseState,
  PlayState,
  StartState,
  StateMachine,
  stateIDDeathWait,
  stateIDFinalDeathWait,
  stateIDGameOver,
  stateIDLevelClear,
  stateIDPause,
  stateIDPlay,
  stateIDStart,
} from "./state.ts";
import { deathFrameAt, deathRoundDelayTicks, restartRound, update } from "./update.ts";
import { levelValues, modeScatter, type LevelValues, type Mode } from "./levels.ts";
import { draw } from "./draw.ts";
import { noAdvantages, type SweetSamAdvantages } from "./advantages.ts";

export class SweetSamSoftware implements FixedViewport {
  readonly name = "sweetSam";

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

  /** Which bees may leave the home (release.ts). */
  release: Release = newRelease();

  modeIndex = 0;
  modeCurrent: Mode = modeScatter;
  modeTicks = 0;

  pauseTicks = 0;

  startTicks = 0;

  lives = 0;
  /** The level being played, from 1 (#47). */
  level = 1;
  /** START ticks left showing "LEVEL n" before READY; only after a level clear. */
  levelBannerTicks = 0;
  /** Go `score` (renamed: `score()` is the Software method). */
  scoreValue = 0;
  highScore: number;
  /** What the player's prizes change in this run (#22); `noAdvantages` without prizes. */
  readonly advantages: Readonly<SweetSamAdvantages>;

  readonly dials: ScoreDials;

  /** Advances every Sweet Sam update; food atlases cycle (tick/holdTicks % frameCount) per pellet row. */
  pelletAnimTick = 0;

  /** Transient sprites when eating scared bees (bonusEat.ts). */
  bonusEatPopups: BonusEatPopup[] = [];
  /** Ticks the bonus flower has left; 0 when there is none (#47). */
  flowerTicks = 0;
  /** Bonus flowers shown so far on this level. */
  flowersShown = 0;
  /** The points of the flower just eaten, while they show. */
  flowerPopup: FlowerPopup | null = null;
  /** Index for next 200→400→800→1600 payout while bees stay scared. */
  scaredEatAwardNext = 0;

  constructor(highscore: number, advantages: Readonly<SweetSamAdvantages> = noAdvantages) {
    this.highScore = highscore;
    this.advantages = advantages;

    this.startState = new StartState(this);
    this.stateMachine.registerState(stateIDStart, this.startState);
    this.stateMachine.registerState(stateIDPlay, new PlayState(this));
    this.stateMachine.registerState(stateIDPause, new PauseState(this));
    this.stateMachine.registerState(stateIDDeathWait, new DeathWaitState(this));
    this.stateMachine.registerState(stateIDFinalDeathWait, new FinalDeathWaitState(this));
    this.stateMachine.registerState(stateIDGameOver, new GameOverState());
    this.stateMachine.registerState(stateIDLevelClear, new LevelClearState(this));

    this.lives = advantages.lives;
    this.scoreValue = 0;
    this.items = newItems();

    this.dials = new ScoreDials(highscore);

    restartRound(this);

    this.stateMachine.changeState(stateIDStart);
  }

  /**
   * Adds points to the score. The first time a run reaches 10,000 it also
   * adds a life, once per run (Pac-Man's extra life, #154).
   */
  addScore(points: number): void {
    const before = this.scoreValue;
    this.scoreValue += points;
    if (before < extraLifeScore && this.scoreValue >= extraLifeScore) {
      this.lives++;
      playSound(sounds.ticket);
    }
  }

  /** Go `Score()`. */
  score(): number {
    return this.scoreValue;
  }

  background(): Sprite {
    return imageSweetSamMaze;
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

  /** How hard the current level is. */
  values(): LevelValues {
    return levelValues(this.level);
  }

  /** The maze shows its flash colours this tick (the level-clear flash). */
  mazeFlash(): boolean {
    if (this.stateMachine.currentId() !== stateIDLevelClear) return false;
    return Math.trunc((levelClearTicks - this.pauseTicks) / levelClearFlashTicks) % 2 === 1;
  }

  /** The bear's death frame (0 dazed … 3 puddle) while a death wait runs; null otherwise. */
  deathFrame(): number | null {
    const id = this.stateMachine.currentId();
    if (id !== stateIDDeathWait && id !== stateIDFinalDeathWait) return null;
    return deathFrameAt(deathRoundDelayTicks - this.pauseTicks);
  }

  /** The bees that are not eyes. */
  awakeBees(): Entity[] {
    return this.enemies.filter((b) => !b.eyes);
  }

  movingEntities(): Entity[] {
    return [this.player, ...this.enemies];
  }

  snapshot(): SweetSamSnapshot {
    const state = this.stateMachine.currentId();
    if (state === "") {
      throw new Error("sweetSam: snapshot before the state machine started");
    }
    const present: number[] = [];
    this.items.forEach((it, idx) => {
      if (it !== null) present.push(idx);
    });
    const p = this.player;
    return {
      state,
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
        held: e.held,
        eyes: e.eyes,
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
      release: {
        globalDots: this.release.globalDots,
        idleTicks: this.release.idleTicks,
        elroySuspended: this.release.elroySuspended,
      },
      pauseTicks: this.pauseTicks,
      startTicks: this.startTicks,
      respawnBlinkRemaining: this.startState.respawnBlinkRemaining,
      scaredEatAwardNext: this.scaredEatAwardNext,
      popups: this.bonusEatPopups.map((b) => ({ x: b.x, y: b.y, frameIdx: b.frameIdx, ticks: b.ticksRemain })),
      shake: [
        this.camera.shakeOffsetX,
        this.camera.shakeOffsetY,
        this.camera.shakeTicksRemaining,
        this.camera.shakeIntensity,
      ],
      particlesActive: this.particles.activeCount(),
      pelletAnimTick: this.pelletAnimTick,
      dials: [...this.dials.score.map(dial), ...this.dials.high.map(dial)],
      level: this.level,
      levelBannerTicks: this.levelBannerTicks,
      mazeFlash: this.mazeFlash(),
      flower: { ticks: this.flowerTicks, shown: this.flowersShown },
      flowerPopup: this.flowerPopup === null ? null : { ...this.flowerPopup },
      deathFrame: this.deathFrame(),
    };
  }
}

function dial(r: DigitReel): SweetSamDialSnapshot {
  return [r.settledDigit, r.active, r.from, r.to, r.t];
}

function realDir<T extends string>(d: T | ""): T {
  if (d === "") throw new Error("sweetSam: entity has no direction");
  return d;
}

function realKind<T extends string>(k: T | null): T {
  if (k === null) throw new Error("sweetSam: enemy has no kind");
  return k;
}
