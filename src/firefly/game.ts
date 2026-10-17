// Firefly: the Galaga-style shooter (#34). Each stage opens with "STAGE n",
// then the enemies fly in on curves to a swaying formation and break off to
// dive at the firefly, dropping shots. Headless and on ticks (ADR 0002, ADR
// 0003); every random choice goes through src/engine/rng.ts. draw.ts draws it.

import { scoreDialsAt } from "../ui/hudArt";
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
import { ScoreDials } from "../ui/dials.ts";
import { drawFirefly } from "./draw.ts";
import type { Bonus, Captive, Enemy, Shot, Spark, Vec } from "./entity.ts";
import { newPathPatternFunc, pathLength, type BezierConfig, type Path, type PatternFunc } from "./pattern.ts";
import {
  beamDiveChance,
  beamHeight,
  beamTicks,
  beamWidth,
  captiveOffset,
  captivePullSpeed,
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
  morphBonus,
  morphTrioSize,
  morphChance,
  morphFromStage,
  morphSpacing,
  nextExtraLife,
  points,
  respawnTicks,
  shotCutoffMargin,
  shotSpacing,
  shotSpawnOffset,
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
/** Where an Owl hovers to beam, in the bottom third. */
export const beamY = playerY - beamHeight;

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
/** The whole path slid `dx` sideways. */
const shiftPath = (path: Path, dx: number): Path =>
  path.map((c) => ({ p0: slide(c.p0, dx), p1: slide(c.p1, dx), p2: slide(c.p2, dx), p3: slide(c.p3, dx) }));
const slide = (p: Vec, dx: number): Vec => ({ x: p.x + dx, y: p.y });
const mirror = (p: Vec): Vec => ({ x: fieldWidth - p.x, y: p.y });
/** Where the second of a pair flies: mirrored on a split wave, else `beside` the first. */
const partner = (split: boolean, p: Vec, beside: Vec): Vec => (split ? mirror(p) : shift(p, beside));

/** Where a dive aims: the firefly's x, give or take this much. */
const diveAimSpread = 24;
/** A diving Moth leaves the screen this far below the bottom, then comes back in from above. */
const offscreenMargin = 24;

/** An Owl's escorts: Wasps from slots this close under it (in x), flying this far either side of it. */
const maxEscorts = 2;
const escortReach = 16;
const escortOffset = 16;

/** Ticks the escort-kill bonus shows where the Owl was shot. */
export const bonusTicks = 60;

const pathFuncs = new WeakMap<Path, PatternFunc>();

/** The path's curve func, built once per path. */
function pathFunc(path: Path): PatternFunc {
  let f = pathFuncs.get(path);
  if (f === undefined) {
    f = newPathPatternFunc(path);
    pathFuncs.set(path, f);
  }
  return f;
}

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
    beamTicks: 0,
    outOfFormation: false,
    escortOf: null,
    escortDx: 0,
    escortsKilled: 0,
    trio: null,
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

/** Faces the sprite along its last move, or down in the formation. */
function face(e: Enemy, px: number, py: number): void {
  if (e.state === "formation") {
    e.dx = 0;
    e.dy = 1;
  } else if (e.x !== px || e.y !== py) {
    e.dx = e.x - px;
    e.dy = e.y - py;
  }
}

/** The sound of a spark shooting each kind down. */
const hitSound = { moth: sounds.mothHit, wasp: sounds.waspHit, owl: sounds.owlKill } as const;

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

  constructor(highScore = 0, advantages: Readonly<FireflyAdvantages> = noAdvantages) {
    this.advantages = advantages;
    this.lives = advantages.lives;
    this.dials = new ScoreDials(highScore, scoreDialsAt);
  }

  stage = 1;
  stageTick = 0;
  lives: number;
  points = 0;
  /** The score that gives the next extra life. */
  nextLife = nextExtraLife(0);
  over = false;
  player: Vec = { ...playerStart };
  respawn = 0;
  fireDelay = 0;
  sparks: Spark[] = [];
  enemies: Enemy[] = newStageEnemies();
  shots: Shot[] = [];
  bonuses: Bonus[] = [];
  diveTimer = difficulty(1).diveInterval;
  /** The firefly in play was taken by a tractor beam: no burst while it respawns. */
  captured = false;
  /** The captured firefly, red, held by its Owl until the stage ends or the Owl dies. */
  captive: Captive | null = null;
  /** Ticks since the run started: drives the formation's sway and breath. */
  ticks = 0;
  /** Swaying while the stage's enemies fly in, breathing once every one has arrived. */
  formationPhase: FormationPhase = "sway";
  /** `ticks` when the formation began to breathe. */
  breatheFrom = 0;
  /** The score and the hub high score this run is chasing, where Sweet Sam has them (src/ui/dials.ts). */
  readonly dials: ScoreDials;

  update(i: Input): void {
    if (this.over) return;

    if (this.stageTick === 0) play(this.stage === 1 ? sounds.fireflyStart : sounds.stage);
    this.stageTick++;
    this.ticks++;

    // As in Galaga, the firefly is held until the start theme ends.
    const opening = this.stage === 1 && this.stageTick <= stageIntroTicks;
    if (this.respawn === 0 && !opening) this.movePlayer(i);
    this.moveSparks();
    this.moveEnemies();
    this.moveCaptive();
    this.moveShots();
    this.hitEnemies();
    this.awardExtraLives();
    if (this.respawn === 0) this.hitPlayer();
    this.endHitEffects();
    this.countDownBonuses();
    this.countDownRespawn();

    // With no lives left the run ends on this stage, even if the field is clear.
    if (this.enemies.length === 0 && this.lives > 0) this.nextStage();

    this.dials.tick(this.score());
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
      if (e.deadFrames > 0 || e.escortOf !== null) continue;
      const px = e.x;
      const py = e.y;
      switch (e.state) {
        case "waiting":
          if (--e.wait <= 0) this.startEntry(e, d);
          break;
        case "entering":
        case "diving":
          this.stepPath(e);
          this.dropShot(e);
          break;
        case "beaming":
          this.beam(e);
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
      face(e, px, py);
    }
    // Escorts move after their Owl, to fly beside it.
    for (const e of this.enemies) {
      const owl = e.escortOf;
      if (e.deadFrames > 0 || owl === null) continue;
      if (owl.state !== "diving") {
        this.release(e);
        continue;
      }
      const px = e.x;
      const py = e.y;
      e.x = owl.x + e.escortDx;
      e.y = owl.y;
      face(e, px, py);
      this.dropShot(e);
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
    const p = e.t >= 1 ? (path.at(-1)?.p3 ?? e) : pathFunc(path)(e.t);
    e.x = p.x;
    e.y = p.y;
    if (e.t < 1) return;
    e.path = null;
    e.shotsLeft = 0;
    if (e.kind === "morph") {
      // A morph flies off the bottom for good, unscored.
      e.hp = 0;
      return;
    }
    if (e.beamTicks > 0) {
      e.state = "beaming";
      return;
    }
    e.state = "joining";
    if (e.y > fieldHeight) {
      // Off the bottom: come back in from above the slot.
      e.x = this.slotPos(e.home).x;
      e.y = -offscreenMargin;
    }
  }

  /** `e` sets off on its entry curve; some fire at the firefly on the way in (Galaga's). */
  private startEntry(e: Enemy, d: Difficulty): void {
    e.state = "entering";
    if (rng.float() >= d.entryShotChance) return;
    e.shotsLeft = 1 + rng.intn(d.entryShots);
    e.shotTimer = firstShotDelay;
  }

  /** An escort whose Owl is no longer diving flies back to its slot. */
  private release(e: Enemy): void {
    e.escortOf = null;
    e.escortDx = 0;
    if (e.state === "diving") e.state = "joining";
  }

  /** Picks an enemy in formation, Wasps most often, and sends it at the firefly. */
  private startDive(d: Difficulty): void {
    const candidates = this.enemies.filter((e) => e.state === "formation" && e.deadFrames === 0);
    const total = candidates.reduce((t, e) => t + diveWeight[e.kind], 0);
    if (total === 0) return;
    let pick = rng.intn(total);
    const e = candidates.find((c) => (pick -= diveWeight[c.kind]) < 0);
    if (e === undefined) return;
    this.dive(e, d);
  }

  /** Sends `e` at the firefly; an Owl takes up to 2 Wasps from the slots under it as escorts. */
  dive(e: Enemy, d: Difficulty = difficulty(this.stage)): void {
    const aim = Math.max(
      16,
      Math.min(fieldWidth - 16, this.player.x + rng.intn(2 * diveAimSpread + 1) - diveAimSpread),
    );
    const side = e.x < fieldWidth / 2 ? -1 : 1;
    const p0 = { x: e.x, y: e.y };
    const p1 = { x: e.x + side * 40, y: e.y - 30 };
    // The Owl sometimes stops low over the firefly to beam; otherwise each
    // kind flies its own dive shape.
    const beamDive = e.kind === "owl" && this.canBeam() && rng.float() < beamDiveChance;
    const path: Path = beamDive
      ? [{ p0, p1, p2: { x: aim, y: beamY - 60 }, p3: { x: aim, y: beamY } }]
      : divePath(e.kind, p0, p1, aim, side);
    // One trio at a time.
    const morphing =
      e.kind === "moth" &&
      this.stage >= morphFromStage &&
      !this.enemies.some((m) => m.kind === "morph") &&
      rng.intn(morphChance) === 0;
    if (morphing) {
      this.morph(e, path, d);
      return;
    }
    this.sendDiving(e, path, d, beamDive);
  }

  private sendDiving(e: Enemy, path: Path, d: Difficulty, beamDive = false): void {
    e.state = "diving";
    e.outOfFormation = true;
    play(sounds.dive);
    followPath(e, path, d.diveSpeed);
    e.beamTicks = beamDive ? beamTicks : 0;
    e.shotsLeft = beamDive ? 0 : d.shotsPerDive;
    e.shotTimer = firstShotDelay;
    e.escortsKilled = 0;
    if (e.kind === "owl") this.takeEscorts(e, d);
  }

  /** The (up to 2) Wasps nearest under the Owl, upper row first, fly either side of it. */
  private takeEscorts(owl: Enemy, d: Difficulty): void {
    const escorts = this.enemies
      .filter(
        (w) =>
          w.kind === "wasp" &&
          w.state === "formation" &&
          w.deadFrames === 0 &&
          Math.abs(w.home.x - owl.home.x) <= escortReach,
      )
      .toSorted((a, b) => a.row - b.row || Math.abs(a.home.x - owl.home.x) - Math.abs(b.home.x - owl.home.x))
      .slice(0, maxEscorts)
      .toSorted((a, b) => a.home.x - b.home.x);
    escorts.forEach((w, i) => {
      const left = escorts.length === maxEscorts ? i === 0 : w.home.x < owl.home.x;
      w.state = "diving";
      w.outOfFormation = true;
      w.path = null;
      w.escortOf = owl;
      w.escortDx = left ? -escortOffset : escortOffset;
      w.shotsLeft = d.shotsPerDive;
      w.shotTimer = firstShotDelay;
    });
  }

  /** One tractor beam at a time, and none while a captive is held. */
  private canBeam(): boolean {
    return this.captive === null && this.enemies.every((e) => e.beamTicks === 0);
  }

  /**
   * A hovering Owl beams for `beamTicks`, capturing a firefly under it. Once
   * the beam is off and any captive is pulled up, it flies home.
   */
  private beam(e: Enemy): void {
    if (e.beamTicks === beamTicks) play(sounds.beam);
    const p = this.player;
    if (e.beamTicks > 0 && this.respawn === 0 && this.captive === null && Math.abs(p.x - e.x) < beamWidth / 2) {
      this.capture(e);
    }
    if (e.beamTicks > 0) e.beamTicks--;
    const pulling = this.captive?.owl === e && this.captive.y > e.y - captiveOffset;
    if (e.beamTicks === 0 && !pulling) e.state = "joining";
  }

  /** The beam takes the firefly: a life gone, with no burst; it becomes the Owl's captive. */
  private capture(owl: Enemy): void {
    this.loseLife(sounds.capture);
    this.captured = true;
    this.captive = { owl, x: this.player.x, y: this.player.y };
  }

  /** The captive rises up the beam to its Owl, then stays above it; it is lost with the Owl. */
  private moveCaptive(): void {
    const c = this.captive;
    if (c === null) return;
    const owl = c.owl;
    if (owl.hp === 0 || !this.enemies.includes(owl)) {
      this.captive = null;
      return;
    }
    const ty = owl.y - captiveOffset;
    if (owl.state === "beaming" && c.y > ty + captivePullSpeed) {
      c.y -= captivePullSpeed;
      c.x += Math.sign(owl.x - c.x) * Math.min(captivePullSpeed, Math.abs(owl.x - c.x));
      return;
    }
    c.x = owl.x;
    c.y = ty;
  }

  /** The Moth splits into a trio of morphs that fly its dive side by side. */
  private morph(moth: Enemy, path: Path, d: Difficulty): void {
    const trio = { kills: 0 };
    this.enemies = this.enemies.filter((e) => e !== moth);
    for (let i = 0; i < morphTrioSize; i++) {
      const k = i - (morphTrioSize - 1) / 2;
      const dx = k * morphSpacing;
      const m: Enemy = {
        ...moth,
        kind: "morph",
        hp: enemyHp.morph,
        x: moth.x + dx,
        trio,
        escortOf: null,
        escortDx: 0,
        escortsKilled: 0,
        beamTicks: 0,
      };
      this.sendDiving(m, shiftPath(path, dx), d);
      this.enemies.push(m);
    }
  }

  /** A diving or entering enemy above the firefly drops its shots, aimed down at it. */
  private dropShot(e: Enemy): void {
    if (e.shotsLeft === 0 || (e.state !== "diving" && e.state !== "entering")) return;
    if (e.shotTimer > 0) e.shotTimer--;
    if (e.shotTimer > 0 || e.y > playerY - shotCutoffMargin || this.respawn > 0) return;
    const ticksToPlayer = (playerY - e.y) / shotSpeed;
    const maxDrift = difficulty(this.stage).shotDrift;
    const drift = Math.max(-maxDrift, Math.min(maxDrift, (this.player.x - e.x) / ticksToPlayer));
    this.shots.push({ x: e.x, y: e.y + shotSpawnOffset, dx: drift, dy: shotSpeed });
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
      if (e.hp > 0) play(sounds.owlHurt);
      else {
        this.shootDown(e);
        play(hitSound[e.kind]);
      }
      return false;
    });
  }

  /** A shot kills the enemy and scores it. */
  private shootDown(e: Enemy): void {
    if (e.escortOf !== null) e.escortOf.escortsKilled++;
    this.destroy(e);
    const p = points(e.kind, e.outOfFormation, e.escortsKilled);
    this.points += p;
    if (e.escortsKilled > 0 && e.outOfFormation) this.bonuses.push({ points: p, x: e.x, y: e.y, ticks: bonusTicks });
    if (e.trio !== null && ++e.trio.kills === morphTrioSize) {
      this.points += morphBonus;
      this.bonuses.push({ points: morphBonus, x: e.x, y: e.y, ticks: bonusTicks });
    }
  }

  /** A life, with the extra-life jingle, for each threshold the score has reached. */
  private awardExtraLives(): void {
    while (this.points >= this.nextLife) {
      this.lives++;
      this.nextLife = nextExtraLife(this.nextLife);
      play(sounds.extraLife);
    }
  }

  /** The enemy bursts and is gone, scoring nothing. */
  private destroy(e: Enemy): void {
    e.hp = 0;
    e.deadFrames = hitEffectTicks;
    for (const w of this.enemies) if (w.escortOf === e) this.release(w);
    if (e.escortOf !== null) e.escortOf = null;
  }

  private countDownBonuses(): void {
    for (const b of this.bonuses) b.ticks--;
    this.bonuses = this.bonuses.filter((b) => b.ticks > 0);
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
  loseLife(sound: typeof sounds.lifeLost = sounds.lifeLost): void {
    this.lives--;
    this.respawn = respawnTicks;
    play(sound);
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
    this.captured = false;
    // A fresh firefly starts with no enemy shot already falling on it.
    this.shots = [];
    this.fireDelay = 0;
  }

  scoreTo(score: number): void {
    this.points = score;
    this.nextLife = nextExtraLife(score - 1);
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
    this.captive = null;
    this.shots = [];
    this.bonuses = [];
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
      nextLife: this.nextLife,
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
        escorting: e.escortOf !== null,
        escortsKilled: e.escortsKilled,
      })),
      shots: this.shots.map((s) => ({ x: s.x, y: s.y, dx: s.dx, dy: s.dy })),
      bonuses: this.bonuses.map((b) => ({ ...b })),
      diveTimer: this.diveTimer,
      sway: this.sway(),
      formationPhase: this.formationPhase,
      ...(this.captured ? { captured: true as const } : {}),
      ...(this.captive === null
        ? {}
        : { captive: { row: this.captive.owl.row, col: this.captive.owl.col, x: this.captive.x, y: this.captive.y } }),
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
