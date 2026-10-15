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
import { drawFirefly } from "./draw.ts";
import type { Enemy, Shot, Spark, Vec } from "./entity.ts";
import { newBezierPatternFunc, type BezierConfig } from "./pattern.ts";
import {
  diveWeight,
  difficulty,
  enemyHalfSize,
  enemyHp,
  enemySpeed,
  entryGroupGap,
  entryGroupSize,
  entrySpacing,
  fieldHeight,
  fieldWidth,
  firstShotDelay,
  formation,
  hitEffectTicks,
  points,
  respawnTicks,
  shotMaxDrift,
  shotSpacing,
  shotSpeed,
  sparkCooldown,
  sparkSpeed,
  stageIntroTicks,
  swayOffset,
} from "./rules.ts";

/** The firefly's row and where it starts, centred. */
export const playerY = 264;
const playerHalfWidth = 8;
const playerStart: Vec = { x: fieldWidth / 2, y: playerY };

/**
 * The curves enemies fly in on, by group: from the top swinging right, from
 * the top swinging left, then low from the left and from the right. Each ends
 * at the enemy's own slot.
 */
const entryCurves: readonly Omit<BezierConfig, "p3">[] = [
  { p0: { x: 96, y: -16 }, p1: { x: 96, y: 170 }, p2: { x: 210, y: 210 } },
  { p0: { x: 128, y: -16 }, p1: { x: 128, y: 170 }, p2: { x: 14, y: 210 } },
  { p0: { x: -16, y: 230 }, p1: { x: 170, y: 250 }, p2: { x: 170, y: 90 } },
  { p0: { x: 240, y: 230 }, p1: { x: 54, y: 250 }, p2: { x: 54, y: 90 } },
];

/** Where a dive aims: the firefly's x, give or take this much. */
const diveAimSpread = 24;
/** A diving Moth or Wasp leaves the screen this far below the bottom, then comes back in from above. */
const offscreenMargin = 24;

/** Rough length of a curve, from 16 straight pieces. */
function curveLength(c: BezierConfig): number {
  const f = newBezierPatternFunc(c);
  let len = 0;
  let prev = f(0);
  for (let i = 1; i <= 16; i++) {
    const p = f(i / 16);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

function followPath(e: Enemy, path: BezierConfig): void {
  e.path = path;
  e.t = 0;
  e.tStep = enemySpeed / Math.max(1, curveLength(path));
}

/** A fresh stage: every slot filled, waiting to fly in group by group. */
export function newStageEnemies(): Enemy[] {
  return formation().map((slot, i) => {
    const group = Math.trunc(i / entryGroupSize);
    const curve = entryCurves[group % entryCurves.length] ?? entryCurves[0];
    if (curve === undefined) throw new Error("no entry curves");
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
      wait: stageIntroTicks + group * entryGroupGap + (i % entryGroupSize) * entrySpacing,
      path: null,
      t: 0,
      tStep: 0,
      shotsLeft: 0,
      shotTimer: 0,
      outOfFormation: false,
    };
    followPath(e, { ...curve, p3: home });
    return e;
  });
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
  /** Ticks since the run started: drives the formation's sway. */
  ticks = 0;

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

    if (this.enemies.length === 0) this.nextStage();
  }

  /** The formation's x offset this tick. */
  sway(): number {
    return swayOffset(this.ticks);
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
    const sway = this.sway();
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
          this.stepPath(e, sway);
          if (e.state === "diving") this.dropShot(e);
          break;
        case "joining": {
          const tx = e.home.x + sway;
          const ty = e.home.y;
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
        case "formation":
          e.x = e.home.x + sway;
          e.y = e.home.y;
          break;
      }
      if (e.state === "formation") {
        e.dx = 0;
        e.dy = 1;
      } else if (e.x !== px || e.y !== py) {
        e.dx = e.x - px;
        e.dy = e.y - py;
      }
    }

    const allIn = this.enemies.every((e) => e.state !== "waiting" && e.state !== "entering");
    if (!allIn || this.respawn > 0) return;
    if (this.diveTimer > 0) this.diveTimer--;
    if (this.diveTimer > 0) return;
    this.diveTimer = d.diveInterval;
    for (let n = 0; n < d.diversPerDive; n++) this.startDive(d.shotsPerDive);
  }

  /** One step along the enemy's curve; at its end it heads for its slot. */
  private stepPath(e: Enemy, sway: number): void {
    const path = e.path;
    if (path === null) throw new Error(`${e.state} enemy without a path`);
    e.t += e.tStep;
    const p = e.t >= 1 ? path.p3 : newBezierPatternFunc(path)(e.t);
    e.x = p.x;
    e.y = p.y;
    if (e.t < 1) return;
    e.path = null;
    e.state = "joining";
    if (e.y > fieldHeight) {
      // Off the bottom: come back in from above the slot.
      e.x = e.home.x + sway;
      e.y = -offscreenMargin;
    }
  }

  /** Picks an enemy in formation, Wasps most often, and sends it at the firefly. */
  private startDive(shots: number): void {
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
    // The Owl swoops right at the firefly to eat it, then flies back up; the
    // others sweep past it and off the bottom.
    const path: BezierConfig =
      e.kind === "owl"
        ? { p0, p1, p2: { x: aim, y: playerY - 100 }, p3: { x: aim, y: playerY } }
        : { p0, p1, p2: { x: aim, y: playerY - 60 }, p3: { x: aim - side * 60, y: fieldHeight + offscreenMargin } };
    e.state = "diving";
    e.outOfFormation = true;
    followPath(e, path);
    e.shotsLeft = shots;
    e.shotTimer = firstShotDelay;
  }

  /** A diving enemy above the firefly drops its shots, aimed down at it. */
  private dropShot(e: Enemy): void {
    if (e.shotsLeft === 0 || e.state !== "diving") return;
    if (e.shotTimer > 0) e.shotTimer--;
    if (e.shotTimer > 0 || e.y > playerY - 48 || this.respawn > 0) return;
    const ticksToPlayer = (playerY - e.y) / shotSpeed;
    const drift = Math.max(-shotMaxDrift, Math.min(shotMaxDrift, (this.player.x - e.x) / ticksToPlayer));
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
      if (e.hp === 0) {
        this.destroy(e);
        this.points += points(e.kind, e.outOfFormation);
      }
      play(sounds.hit);
      return false;
    });
  }

  /** The enemy bursts and is gone; any points are the caller's to award. */
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

  private nextStage(): void {
    this.stage++;
    this.stageTick = 0;
    this.enemies = newStageEnemies();
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
