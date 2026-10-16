// Firefly: the Galaga-style shooter (#34). Each stage opens with "STAGE n",
// then the enemies fly in on curves to a swaying formation and break off to
// dive at the firefly, dropping shots. Headless and on ticks (ADR 0002, ADR
// 0003); every random choice goes through src/engine/rng.ts. draw.ts draws it.

import { noAdvantages, type FireflyAdvantages } from "./advantages.ts";
import { sounds } from "../engine/assets.ts";
import type { Sound } from "../engine/audio.ts";
import type { Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import type { FireflySnapshot } from "../game/snapshot.ts";
import type { FixedViewport } from "../game/software.ts";
import { cabinetHeight, cabinetWidth } from "../ui/cabinet.ts";
import { imageFireflyBackground } from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { ScoreDials } from "../ui/scoreDials.ts";
import { drawFirefly } from "./draw.ts";
import type { Enemy, Shot, Spark, Vec } from "./entity.ts";
import { newPathPatternFunc, pathLength, type BezierConfig, type Path } from "./pattern.ts";
import {
  diveWeight,
  difficulty,
  type Difficulty,
  type EnemyKind,
  enemyHalfSize,
  enemyHp,
  enemySpeed,
  entryWaveGap,
  entryPairOffset,
  entrySpacing,
  entryWaves,
  type EntryCurve,
  fieldHeight,
  fieldWidth,
  firstShotDelay,
  formation,
  hitEffectTicks,
  points,
  respawnTicks,
  shotSpacing,
  type Slot,
  shotSpeed,
  sparkCooldown,
  sparkSpeed,
  stageIntroTicks,
  formationPos,
  swayOffset,
  type FormationPhase,
  type FormationState,
} from "./rules.ts";

/** The firefly's row and where it starts, centred. */
export const playerY = 264;
const playerHalfWidth = 8;
const playerStart: Vec = { x: fieldWidth / 2, y: playerY };

/**
 * The curves each wave flies in on, ending at the enemy's own slot. The top
 * ones swoop down and loop round; the lower ones come in low from a side and
 * climb. `beside` is the way the second of a pair sits off the first.
 */
const entryCurves: Readonly<Record<EntryCurve, { curve: Omit<BezierConfig, "p3">; beside: Vec }>> = {
  topCentre: {
    curve: { p0: { x: 96, y: -16 }, p1: { x: 96, y: 170 }, p2: { x: 210, y: 210 } },
    beside: { x: 0, y: 0 },
  },
  lowerLeft: {
    curve: { p0: { x: -16, y: 230 }, p1: { x: 170, y: 250 }, p2: { x: 170, y: 90 } },
    beside: { x: 0, y: 1 },
  },
  lowerRight: {
    curve: { p0: { x: 240, y: 230 }, p1: { x: 54, y: 250 }, p2: { x: 54, y: 90 } },
    beside: { x: 0, y: 1 },
  },
  topRight: {
    curve: { p0: { x: 176, y: -16 }, p1: { x: 176, y: 160 }, p2: { x: 24, y: 200 } },
    beside: { x: 1, y: 0 },
  },
  topLeft: { curve: { p0: { x: 48, y: -16 }, p1: { x: 48, y: 160 }, p2: { x: 200, y: 200 } }, beside: { x: -1, y: 0 } },
};

const shift = (p: Vec, d: Vec): Vec => ({ x: p.x + d.x * entryPairOffset, y: p.y + d.y * entryPairOffset });
const mirror = (p: Vec): Vec => ({ x: fieldWidth - p.x, y: p.y });
/** Where the second of a pair flies: mirrored on a split wave, else `beside` the first. */
const partner = (split: boolean, p: Vec, beside: Vec): Vec => (split ? mirror(p) : shift(p, beside));

/** Where a dive aims: the firefly's x, give or take this much. */
const diveAimSpread = 24;
/** A diving Moth leaves the screen this far below the bottom, then comes back in from above. */
const offscreenMargin = 24;

function followPath(e: Enemy, path: Path, speed = enemySpeed): void {
  e.path = path;
  e.t = 0;
  e.tStep = speed / Math.max(1, pathLength(path));
}

/** Height of the loop a diving Moth flies over its slot before it sweeps down. */
const mothLoopHeight = 32;

/**
 * Each kind's dive from `p0`, heading out to `side` through `p1` at the
 * firefly's x `aim`. The Owl swoops right at the firefly to eat it, then
 * flies back up. A Moth loops over its slot, then sweeps past the firefly and
 * off the bottom. A Wasp swoops down past the firefly and curves back up to
 * where it started, never leaving the field.
 */
function divePath(kind: EnemyKind, p0: Vec, p1: Vec, aim: number, side: number): Path {
  if (kind === "owl") return [{ p0, p1, p2: { x: aim, y: playerY - 100 }, p3: { x: aim, y: playerY } }];
  if (kind === "moth") {
    // Two half circles, out to `side` and up, then back down to the slot.
    const r = mothLoopHeight / 2;
    const top = { x: p0.x, y: p0.y - 2 * r };
    const k = (4 / 3) * r;
    return [
      { p0, p1: { x: p0.x + side * k, y: p0.y }, p2: { x: p0.x + side * k, y: top.y }, p3: top },
      { p0: top, p1: { x: p0.x - side * k, y: top.y }, p2: { x: p0.x - side * k, y: p0.y }, p3: p0 },
      { p0, p1, p2: { x: aim, y: playerY - 60 }, p3: { x: aim - side * 60, y: fieldHeight + offscreenMargin } },
    ];
  }
  const low = { x: aim, y: playerY - 24 };
  return [
    { p0, p1, p2: { x: aim + side * 40, y: low.y }, p3: low },
    { p0: low, p1: { x: aim - side * 40, y: low.y }, p2: { x: p0.x - side * 40, y: p0.y + 40 }, p3: p0 },
  ];
}

/** One enemy waiting to fly in along `curve`, which ends at its slot. */
function waveEnemy(slot: Slot, curve: Omit<BezierConfig, "p3">, wait: number): Enemy {
  const home = { x: slot.x, y: slot.y };
  const e: Enemy = {
    kind: slot.kind,
    row: slot.row,
    col: slot.col,
    home,
    state: "waiting",
    x: curve.p0.x,
    y: curve.p0.y,
    dx: 0,
    dy: 1,
    hp: enemyHp[slot.kind],
    deadFrames: 0,
    wait,
    path: null,
    t: 0,
    tStep: 0,
    shotsLeft: 0,
    shotTimer: 0,
    outOfFormation: false,
  };
  followPath(e, [{ ...curve, p3: home }]);
  return e;
}

/** A fresh stage: every slot filled, waiting to fly in wave by wave, two by two (`entryWaves`). */
export function newStageEnemies(): Enemy[] {
  const slots = formation();
  const slotAt = (ref: { row: number; col: number }): Slot => {
    const slot = slots.find((s) => s.row === ref.row && s.col === ref.col);
    if (slot === undefined) throw new Error(`no slot at row ${ref.row} col ${ref.col}`);
    return slot;
  };
  const order = (e: Enemy): number => slots.findIndex((s) => s.row === e.row && s.col === e.col);
  return (
    entryWaves
      .flatMap((wave, w) =>
        wave.pairs.flatMap((refs, p) =>
          refs.map((ref, side) => {
            const { curve: c, beside } = entryCurves[wave.curve];
            const move = (v: Vec): Vec => (side === 1 ? partner(wave.split, v, beside) : v);
            const curve = { p0: move(c.p0), p1: move(c.p1), p2: move(c.p2) };
            return waveEnemy(slotAt(ref), curve, stageIntroTicks + w * entryWaveGap + p * entrySpacing);
          }),
        ),
      )
      // In formation order, row by row, as the rest of the game keeps them.
      .toSorted((a, b) => order(a) - order(b))
  );
}

function play(s: Sound): void {
  s.rewind();
  s.play();
}

/**
 * The Firefly `Software`, played inside its cabinet (#15). Fields are public
 * so tests can stage states.
 */
export class FireflySoftware implements FixedViewport {
  readonly name = "firefly" as const;

  /** What the player's prizes change in this run (./advantages.ts). */
  readonly advantages: Readonly<FireflyAdvantages>;

  /** The hub high score this run is chasing; HI shows it until the score passes it. */
  readonly highScore: number;

  constructor(highScore = 0, advantages: Readonly<FireflyAdvantages> = noAdvantages) {
    this.highScore = highScore;
    this.advantages = advantages;
    this.lives = advantages.lives;
    this.dials = new ScoreDials(highScore);
  }

  stage = 1;
  stageTick = 0;
  lives: number;
  points = 0;
  over = false;
  player: Vec = { ...playerStart };
  respawn = 0;
  fireDelay = 0;
  sparks: Spark[] = [];
  enemies: Enemy[] = newStageEnemies();
  shots: Shot[] = [];
  diveTimer = difficulty(1).diveInterval;
  /** Ticks since the run started: drives the formation's sway and breath. */
  ticks = 0;
  /** Swaying while the stage's enemies fly in, breathing once every one has arrived. */
  formationPhase: FormationPhase = "sway";
  /** `ticks` when the formation began to breathe. */
  breatheFrom = 0;
  /** The score and high score on Sweet Sam's rolling dials (src/ui/scoreDials.ts). */
  readonly dials: ScoreDials;

  update(i: Input): void {
    if (this.over) return;

    if (this.stageTick === 0) play(sounds.stage);
    this.stageTick++;
    this.ticks++;

    if (this.respawn === 0) this.movePlayer(i);
    this.moveSparks();
    this.moveEnemies();
    this.moveShots();
    this.hitEnemies();
    if (this.respawn === 0) this.hitPlayer();
    this.endHitEffects();
    this.countDownRespawn();

    // With no lives left the run ends on this stage, even if the field is clear.
    if (this.enemies.length === 0 && this.lives > 0) this.nextStage();

    this.dials.tick(this.score(), this.highScore);
  }

  /** The formation's x offset this tick: 0 once it breathes. */
  sway(): number {
    return formationPos({ x: 0, y: 0 }, this.formation()).x;
  }

  /** Where the slot `home` is in the formation this tick. */
  private slotPos(home: { x: number; y: number }): { x: number; y: number } {
    return formationPos(home, this.formation());
  }

  private formation(): FormationState {
    return { phase: this.formationPhase, ticks: this.ticks, breatheFrom: this.breatheFrom };
  }

  /**
   * Starts the breathing once every enemy is in its slot, on a tick the sway
   * is centred so the formation does not jump.
   */
  private startBreathing(): void {
    if (this.formationPhase !== "sway" || swayOffset(this.ticks) !== 0) return;
    if (!this.enemies.every((e) => e.state === "formation" || e.deadFrames > 0)) return;
    this.formationPhase = "breathe";
    this.breatheFrom = this.ticks;
  }

  private movePlayer(i: Input): void {
    if (i.left && !i.right) this.player.x -= this.advantages.playerSpeed;
    if (i.right && !i.left) this.player.x += this.advantages.playerSpeed;
    this.player.x = Math.max(playerHalfWidth, Math.min(fieldWidth - playerHalfWidth, this.player.x));

    if (i.space && this.fireDelay === 0 && this.sparks.length < this.advantages.maxSparks) {
      this.sparks.push({ x: this.player.x, y: this.player.y - 10 });
      this.fireDelay = sparkCooldown;
      play(sounds.spark);
    }
    if (this.fireDelay > 0) this.fireDelay--;
  }

  private moveSparks(): void {
    for (const s of this.sparks) s.y -= sparkSpeed;
    this.sparks = this.sparks.filter((s) => s.y > -4);
  }

  private moveEnemies(): void {
    const d = difficulty(this.stage);
    for (const e of this.enemies) {
      if (e.deadFrames > 0) continue;
      const px = e.x;
      const py = e.y;
      switch (e.state) {
        case "waiting":
          if (--e.wait <= 0) e.state = "entering";
          break;
        case "entering":
        case "diving":
          this.stepPath(e);
          if (e.state === "diving") this.dropShot(e);
          break;
        case "joining": {
          const { x: tx, y: ty } = this.slotPos(e.home);
          const dist = Math.hypot(tx - e.x, ty - e.y);
          if (dist <= enemySpeed) {
            e.x = tx;
            e.y = ty;
            e.state = "formation";
            e.outOfFormation = false;
          } else {
            e.x += ((tx - e.x) / dist) * enemySpeed;
            e.y += ((ty - e.y) / dist) * enemySpeed;
          }
          break;
        }
        case "formation": {
          const p = this.slotPos(e.home);
          e.x = p.x;
          e.y = p.y;
          break;
        }
      }
      if (e.state === "formation") {
        e.dx = 0;
        e.dy = 1;
      } else if (e.x !== px || e.y !== py) {
        e.dx = e.x - px;
        e.dy = e.y - py;
      }
    }

    this.startBreathing();
    if (this.formationPhase !== "breathe" || this.respawn > 0) return;
    if (this.diveTimer > 0) this.diveTimer--;
    if (this.diveTimer > 0) return;
    this.diveTimer = d.diveInterval;
    for (let n = 0; n < d.diversPerDive; n++) this.startDive(d);
  }

  /** One step along the enemy's curve; at its end it heads for its slot. */
  private stepPath(e: Enemy): void {
    const path = e.path;
    if (path === null) throw new Error(`${e.state} enemy without a path`);
    e.t += e.tStep;
    const p = e.t >= 1 ? (path.at(-1)?.p3 ?? e) : newPathPatternFunc(path)(e.t);
    e.x = p.x;
    e.y = p.y;
    if (e.t < 1) return;
    e.path = null;
    e.state = "joining";
    if (e.y > fieldHeight) {
      // Off the bottom: come back in from above the slot.
      e.x = this.slotPos(e.home).x;
      e.y = -offscreenMargin;
    }
  }

  /** Picks an enemy in formation, Wasps most often, and sends it at the firefly. */
  private startDive(d: Difficulty): void {
    const candidates = this.enemies.filter((e) => e.state === "formation" && e.deadFrames === 0);
    const total = candidates.reduce((t, e) => t + diveWeight[e.kind], 0);
    if (total === 0) return;
    let pick = rng.intn(total);
    const e = candidates.find((c) => (pick -= diveWeight[c.kind]) < 0);
    if (e === undefined) return;

    const aim = Math.max(
      16,
      Math.min(fieldWidth - 16, this.player.x + rng.intn(2 * diveAimSpread + 1) - diveAimSpread),
    );
    const side = e.x < fieldWidth / 2 ? -1 : 1;
    const p0 = { x: e.x, y: e.y };
    const p1 = { x: e.x + side * 40, y: e.y - 30 };
    const path = divePath(e.kind, p0, p1, aim, side);
    e.state = "diving";
    e.outOfFormation = true;
    followPath(e, path, d.diveSpeed);
    e.shotsLeft = d.shotsPerDive;
    e.shotTimer = firstShotDelay;
  }

  /** A diving enemy above the firefly drops its shots, aimed down at it. */
  private dropShot(e: Enemy): void {
    if (e.shotsLeft === 0 || e.state !== "diving") return;
    if (e.shotTimer > 0) e.shotTimer--;
    if (e.shotTimer > 0 || e.y > playerY - 48 || this.respawn > 0) return;
    const ticksToPlayer = (playerY - e.y) / shotSpeed;
    const maxDrift = difficulty(this.stage).shotDrift;
    const drift = Math.max(-maxDrift, Math.min(maxDrift, (this.player.x - e.x) / ticksToPlayer));
    this.shots.push({ x: e.x, y: e.y + 8, dx: drift, dy: shotSpeed });
    e.shotsLeft--;
    e.shotTimer = shotSpacing;
  }

  private moveShots(): void {
    for (const s of this.shots) {
      s.x += s.dx;
      s.y += s.dy;
    }
    this.shots = this.shots.filter((s) => s.y < fieldHeight + 8);
  }

  private hitEnemies(): void {
    this.sparks = this.sparks.filter((s) => {
      const e = this.enemies.find(
        (en) =>
          en.deadFrames === 0 &&
          en.state !== "waiting" &&
          Math.abs(s.x - en.x) < enemyHalfSize[en.kind] + 2 &&
          Math.abs(s.y - en.y) < enemyHalfSize[en.kind] + 4,
      );
      if (e === undefined) return true;
      e.hp--;
      if (e.hp === 0) this.shootDown(e);
      play(sounds.hit);
      return false;
    });
  }

  /** A shot kills the enemy and scores it. */
  private shootDown(e: Enemy): void {
    this.destroy(e);
    this.points += points(e.kind, e.outOfFormation);
  }

  /** The enemy bursts and is gone, scoring nothing. */
  private destroy(e: Enemy): void {
    e.hp = 0;
    e.deadFrames = hitEffectTicks;
  }

  private hitPlayer(): void {
    const p = this.player;
    const body = this.enemies.find(
      (e) =>
        e.deadFrames === 0 &&
        e.state !== "waiting" &&
        Math.abs(e.x - p.x) < enemyHalfSize[e.kind] + 6 &&
        Math.abs(e.y - p.y) < enemyHalfSize[e.kind] + 6,
    );
    const shot = this.shots.find((s) => Math.abs(s.x - p.x) < 5 && Math.abs(s.y - p.y) < 7);
    if (body === undefined && shot === undefined) return;
    // A rammed enemy dies with the firefly but scores nothing.
    if (body !== undefined) this.destroy(body);
    if (shot !== undefined) this.shots = this.shots.filter((s) => s !== shot);
    this.loseLife();
  }

  /** The firefly is eaten or shot: one life gone, and the next after a pause. */
  loseLife(): void {
    this.lives--;
    this.respawn = respawnTicks;
    play(sounds.lifeLost);
  }

  private endHitEffects(): void {
    for (const e of this.enemies) if (e.deadFrames > 0) e.deadFrames--;
    this.enemies = this.enemies.filter((e) => e.hp > 0 || e.deadFrames > 0);
  }

  private countDownRespawn(): void {
    if (this.respawn === 0) return;
    if (--this.respawn > 0) return;
    if (this.lives === 0) {
      this.over = true;
      return;
    }
    this.player = { ...playerStart };
    // A fresh firefly starts with no enemy shot already falling on it.
    this.shots = [];
    this.fireDelay = 0;
  }

  jumpTo(stage: number): void {
    this.stage = stage - 1;
    this.nextStage();
  }

  private nextStage(): void {
    this.stage++;
    this.stageTick = 0;
    this.enemies = newStageEnemies();
    this.formationPhase = "sway";
    this.shots = [];
    this.diveTimer = difficulty(this.stage).diveInterval;
  }

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  /** A `FixedViewport`: `buffer` is 0; the 224x288 playfield fills the cabinet's screen. */
  draw(screen: Surface, _buffer: number): void {
    drawFirefly(screen, this);
  }

  gameOver(): boolean {
    return this.over;
  }

  score(): number {
    return this.points;
  }

  background(): Sprite {
    return imageFireflyBackground;
  }

  snapshot(): FireflySnapshot {
    return {
      stage: this.stage,
      stageTick: this.stageTick,
      lives: this.lives,
      score: this.points,
      over: this.over,
      player: { x: this.player.x, y: this.player.y },
      respawn: this.respawn,
      fireDelay: this.fireDelay,
      sparks: this.sparks.map((s) => ({ x: s.x, y: s.y })),
      enemies: this.enemies.map((e) => ({
        kind: e.kind,
        row: e.row,
        col: e.col,
        state: e.state,
        x: e.x,
        y: e.y,
        dx: e.dx,
        dy: e.dy,
        hp: e.hp,
        deadFrames: e.deadFrames,
        outOfFormation: e.outOfFormation,
      })),
      shots: this.shots.map((s) => ({ x: s.x, y: s.y, dx: s.dx, dy: s.dy })),
      diveTimer: this.diveTimer,
      sway: this.sway(),
      formationPhase: this.formationPhase,
    };
  }
}

/** A new run chasing `highScore`, with the advantages of the player's prizes (none by default). */
export function newFireflySoftware(
  highScore = 0,
  advantages: Readonly<FireflyAdvantages> = noAdvantages,
): FireflySoftware {
  return new FireflySoftware(highScore, advantages);
}
