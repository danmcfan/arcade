// The Level loop's state (#271): the maze, the bear, the bees, the honey
// drops, the release counters, the score and the timers. Only the Level
// module (level.ts and the states, rules and helpers it runs: state.ts,
// update.ts, flower.ts, bonusEat.ts) reads or writes it; everyone else goes
// through `Level`'s queries.

import type { SoundName } from "../engine/sounds.generated.ts";
import type { PremulColor } from "../engine/surface.ts";
import { extraLifeScore } from "./constants.ts";
import { newRelease, type Release } from "./release.ts";
import { Entity, newCorners, newItems, newPlayer } from "./entity.ts";
import { levelValues, modeScatter, type LevelValues, type Mode } from "./levels.ts";
import type { BonusEatPopup, FlowerPopup } from "./bonusEat.ts";
import type { SweetSamAdvantages } from "./advantages.ts";

/**
 * What the Level asks of the world around it, in the order it happens: a
 * sound, a screen shake, a burst of particles. The software wires them up;
 * the Level itself stays headless.
 */
export type LevelEffect =
  | { kind: "sound"; sound: SoundName }
  | { kind: "shake"; ticks: number; intensity: number }
  | { kind: "burst"; x: number; y: number; color: Readonly<PremulColor>; count: number };

export class Board {
  // Assigned by restartRound() in the Level's constructor (Go leaves them nil until then).
  player: Entity = newPlayer();
  enemies: Entity[] = [];
  items: (Entity | null)[] = newItems();
  readonly corners: Entity[] = newCorners();

  /** Which bees may leave the home (release.ts). */
  release: Release = newRelease();

  modeIndex = 0;
  modeCurrent: Mode = modeScatter;
  modeTicks = 0;

  pauseTicks = 0;
  /** Ticks the bear stands still after eating: 1 for a honey drop, 3 for a pot (Dossier, "Speed"). */
  eatPauseTicks = 0;

  startTicks = 0;

  lives: number;
  /** The level being played, from 1 (#47). */
  level = 1;
  /** START ticks left showing "LEVEL n" before READY; only after a level clear. */
  levelBannerTicks = 0;
  score = 0;
  readonly highScore: number;
  /** What the player's prizes change in this run (#22); `noAdvantages` without prizes. */
  readonly advantages: Readonly<SweetSamAdvantages>;

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

  readonly emit: (e: LevelEffect) => void;

  constructor(highScore: number, advantages: Readonly<SweetSamAdvantages>, emit: (e: LevelEffect) => void) {
    this.highScore = highScore;
    this.advantages = advantages;
    this.lives = advantages.lives;
    this.emit = emit;
  }

  sound(sound: SoundName): void {
    this.emit({ kind: "sound", sound });
  }

  /**
   * Adds points to the score. The first time a run reaches 10,000 it also
   * adds a life, once per run (Pac-Man's extra life, #154).
   */
  addScore(points: number): void {
    const before = this.score;
    this.score += points;
    if (before < extraLifeScore && this.score >= extraLifeScore) {
      this.lives++;
      this.sound("ticket");
    }
  }

  /** How hard the current level is. */
  values(): LevelValues {
    return levelValues(this.level);
  }

  /** The bees that are not eyes. */
  awakeBees(): Entity[] {
    return this.enemies.filter((b) => !b.eyes);
  }

  movingEntities(): Entity[] {
    return [this.player, ...this.enemies];
  }
}
