// Brass Monkey's game logic, headless and on ticks (ADR 0002, ADR 0003): the
// monkey runs, jumps, climbs and rides lifts up each floor past the gears,
// pans, springs and embers the Gnome sends, collecting bolts and swinging
// wrenches, to the exit door (on the girder floor the embers come out of the
// furnace, lit by hot gears); then the next floor, the
// escaped scene, and the floors again, harder. Every random choice goes
// through the seeded RNG. Positions are in floor pixels; an entity's `x` is
// its middle and its `y` the row its foot stands on. game.ts draws it.

import type { Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import {
  floors,
  floorsFor,
  girderTop,
  liftTops,
  liftWidth,
  type Floor,
  type Girder,
  type Ladder,
  type Spot,
} from "./floors.ts";
import * as t from "./tuning.ts";
import { noAdvantages, type BrassMonkeyAdvantages } from "./advantages.ts";

/** The Gnome's height, in px: its sprite's. */
const gnomeHeight = 32;

/** What the run is doing: the Gnome's intro before the first floor, the "How high can you get?" screen before each floor, playing a floor, the monkey losing a life, a floor finished, the escaped scene, or over. */
export type Phase = "intro" | "howHigh" | "play" | "dying" | "clear" | "escape" | "over";

/** On a girder, in the air (jumping or falling), or on a ladder. */
export type Footing = "ground" | "air" | "climb";

/** A collected bolt's points, shown where it was. */
export interface Popup {
  x: number;
  y: number;
  points: number;
  ticks: number;
}

/** The sounds the run makes; game.ts plays them. */
export type RunSound =
  "jump" | "bolt" | "hazard" | "smash" | "death" | "floor" | "escape" | "extraLife" | "stomp" | "step" | "howHigh";

export interface Monkey {
  x: number;
  y: number;
  /** Across speed in the air, set when the jump starts. */
  vx: number;
  /** Up (negative) or down speed in the air. */
  vy: number;
  footing: Footing;
  left: boolean;
  moving: boolean;
  /** The walk cycle, 0 up to 4 in steps of 0.2. */
  frame: number;
  /** The highest the monkey has been since it left the ground: a fall is measured from here. */
  airTop: number;
  /** The ladder it is on, while climbing. */
  ladder: Ladder | null;
  /** Counts jumps, so each hazard scores once per jump. */
  jumps: number;
  /** Ticks left holding a wrench; 0 without one. */
  wrench: number;
  /** The hazards cleared in the jump under way: the more at once, the more each pays. */
  cleared: number;
}

/** Which way the monkey faces: -1 left, 1 right. */
export function facing(m: Monkey): number {
  return m.left ? -1 : 1;
}

/** A hazard the wrench smashed: its points show where it was for a while. */
export interface Smash {
  x: number;
  y: number;
  points: number;
  /** Ticks left showing. */
  ticks: number;
}

export interface Hazard {
  kind: "gear" | "ember" | "pan" | "spring";
  x: number;
  y: number;
  dir: -1 | 1;
  vy: number;
  footing: Footing;
  ladder: Ladder | null;
  /** Up (-1) or down (1), while climbing. */
  climbDir: -1 | 1;
  /** The monkey's jump this hazard can score in: one that took off from its girder; 0 once scored. */
  scorableIn: number;
  /** A hot gear lights the furnace when it reaches it, and an ember comes out. */
  hot: boolean;
  /** A wild gear ignores the girders and drops in diagonal hops towards the monkey (Donkey Kong's diagonal barrels). */
  wild: boolean;
}

/** The total a jump pays for clearing `n` hazards. */
function jumpTotal(n: number): number {
  return n === 0 ? 0 : (t.jumpPoints[Math.min(n, t.jumpPoints.length) - 1] ?? 0);
}

/** Whether an end of ladder `l` touches girder `g`. */
function ladderMeetsGirder(l: Ladder, g: Girder): boolean {
  const x = ladderMiddle(l);
  return (
    x >= g.x0 &&
    x < g.x1 &&
    (Math.abs(girderTop(g, x) - ladderHead(l)) <= 2 || Math.abs(girderTop(g, x) - ladderFoot(l)) <= 2)
  );
}

/** The girder whose top is within `tol` of y at x, the nearest if more than one. */
function groundUnder(girders: readonly Girder[], x: number, y: number, tol: number): Girder | undefined {
  let best: Girder | undefined;
  let bestD = Infinity;
  for (const g of girders) {
    if (x < g.x0 || x >= g.x1) continue;
    const d = Math.abs(girderTop(g, x) - y);
    if (d <= tol && d < bestD) {
      best = g;
      bestD = d;
    }
  }
  return best;
}

/**
 * The first girder top that something falling from (x0, y0) to (x1, y1)
 * crosses: its feet end on or below the top at x1, having been above the top
 * at x0 or at x1, so a slope's 1 px step can't slip between two ticks.
 */
function landing(girders: readonly Girder[], x0: number, y0: number, x1: number, y1: number): Girder | undefined {
  let best: Girder | undefined;
  for (const g of girders) {
    if (x1 < g.x0 || x1 >= g.x1) continue;
    const top = girderTop(g, x1);
    const lowerTop = Math.max(top, x0 >= g.x0 && x0 < g.x1 ? girderTop(g, x0) : top);
    if (lowerTop > y0 && top <= y1 && (best === undefined || top < girderTop(best, x1))) best = g;
  }
  return best;
}

const ladderMiddle = (l: Ladder): number => l.x + 4;
/** Whether a move from x0 to x1 reaches or passes c. */
const crossed = (x0: number, x1: number, c: number): boolean => x0 !== c && (x0 - c) * (x1 - c) <= 0;
const whole = (l: Ladder): boolean => l.gap === undefined;
/** The girder a ladder stands on and the one it hangs from. */
const ladderFoot = (l: Ladder): number => l.bottom + 1;
const ladderHead = (l: Ladder): number => l.top - 8;

/** A `kind` hazard on the ground at (x, y), heading right. */
function newHazard(kind: Hazard["kind"], x: number, y: number): Hazard {
  return {
    kind,
    x,
    y,
    dir: 1,
    vy: 0,
    footing: "ground",
    ladder: null,
    climbDir: 1,
    scorableIn: 0,
    hot: false,
    wild: false,
  };
}

function newMonkey(start: Spot): Monkey {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    footing: "ground",
    left: false,
    moving: false,
    frame: 0,
    airTop: start.y,
    ladder: null,
    jumps: 0,
    wrench: 0,
    cleared: 0,
  };
}

/** One run of Brass Monkey, from 3 lives to game over. */
export class Run {
  phase: Phase = "play";
  /** Ticks left in `intro`, `howHigh`, `dying`, `clear` or `escape`. */
  phaseTicks = 0;
  /** Index into `floors`. */
  floor: number;
  /** The position in `floorsFor(loop)` of the floor after this one. */
  nextStage = 1;
  /** How many times the monkey has escaped: each loop is harder. */
  loop: number;
  /** Ticks left showing the new lap's number over its first floor; it holds through the How-high screen. */
  lapBanner = 0;
  lives: number;
  /** Hazards the umbrella will still bounce off this run (#268). */
  umbrellas: number;
  /** What the player's prizes change in this run (#40); `noAdvantages` without prizes. */
  readonly advantages: Readonly<BrassMonkeyAdvantages>;
  score = 0;
  /** Whether this run has had its extra life at `extraLifeAt` points (#242). */
  extraLifeAwarded = false;
  bonus = 0;
  bonusTimer = 0;
  monkey: Monkey;
  hazards: Hazard[] = [];
  /** Whether each of the floor's bolts has been collected. */
  bolts: boolean[] = [];
  /** Whether each of the rivet floor's rivets has been pulled, leaving a hole. */
  rivets: boolean[] = [];
  /** The rivet the monkey has just pulled: its hole opens once the monkey is off it. */
  private loose = -1;
  /** Whether each of the floor's wrenches has been picked up. */
  wrenches: boolean[] = [];
  /** The smashes whose points are showing. */
  smashes: Smash[] = [];
  /** Points floating where bolts were just collected, each with the ticks it has left. */
  popups: Popup[] = [];
  /** A hot gear has reached the floor's furnace since the floor (re)started. */
  furnaceLit = false;
  /** The Gnome has sent a gear since the floor (re)started: the first is hot and never wild. */
  private sentGear = false;
  /** Ticks until the Gnome sends its next gear. */
  gearTimer = 0;
  /** Ticks since the floor (re)started: the gears take ladders more often the longer the monkey takes. */
  floorTicks = 0;
  /** Ticks until the Gnome throws its next ember; only counts down on a floor without a furnace. */
  emberTimer = 0;
  /** The conveyors run their own way (1) or reversed (-1). */
  beltDir: -1 | 1 = 1;
  /** Ticks until the conveyors next reverse. */
  beltTimer = 0;
  /** How far each lift's platforms have moved since the floor (re)started, in px. */
  liftTravel = 0;
  /** Ticks since the run started, for animations. */
  ticks = 0;
  tuning: t.FloorTuning;
  private prevSpace = false;
  private readonly onSound: (s: RunSound) => void;

  constructor(
    opts: {
      floor?: number;
      loop?: number;
      onSound?: (s: RunSound) => void;
      advantages?: Readonly<BrassMonkeyAdvantages>;
      /** Start with the Gnome's intro (#253) before the first floor. */
      intro?: boolean;
    } = {},
  ) {
    this.advantages = opts.advantages ?? noAdvantages;
    this.lives = this.advantages.lives;
    this.umbrellas = this.advantages.umbrellas;
    this.floor = opts.floor ?? 0;
    this.loop = opts.loop ?? 0;
    // A floor off this loop's plan stands in for the next plan floor past it in `floors`.
    const plan = floorsFor(this.loop).map((f) => floors.indexOf(f));
    const at = plan.indexOf(this.floor);
    const past = plan.findIndex((f) => f > this.floor);
    this.nextStage = at >= 0 ? at + 1 : past >= 0 ? past : plan.length;
    this.onSound = opts.onSound ?? ((): void => {});
    this.tuning = t.tuningFor(this.floor, this.loop);
    this.monkey = newMonkey(this.currentFloor().start);
    this.startFloor();
    if (opts.intro === true) {
      this.phase = "intro";
      this.phaseTicks = t.introTicks;
    }
  }

  /**
   * The Gnomes stacked on the "How high can you get?" screen: the floor's
   * position in its loop plus 1, which is `nextStage` once the floor has started.
   */
  howHighStack(): number {
    return this.nextStage;
  }

  /** The floor starts behind the "How high can you get?" screen, which holds before it is played. */
  private enterFloor(): void {
    this.startFloor();
    this.howHigh();
  }

  /** The "How high can you get?" screen holds before the floor (already started) is played. */
  private howHigh(): void {
    this.phase = "howHigh";
    this.phaseTicks = t.howHighTicks;
    this.onSound("howHigh");
  }

  /** Ticks since the intro started. */
  private introElapsed(): number {
    return t.introTicks - this.phaseTicks;
  }

  /** How far below its perch the climbing Gnome is, in px: 0 once it is up (or out of the intro). */
  introGnomeRise(): number {
    if (this.phase !== "intro") return 0;
    const left = 1 - Math.min(1, this.introElapsed() / t.introClimbTicks);
    return Math.round(left * (this.currentFloor().height - this.currentFloor().gnome.y));
  }

  /** Whether the floor being cleared is its loop's last: the Gnome falls, and the escape follows. */
  finalClear(): boolean {
    return this.phase === "clear" && floorsFor(this.loop)[this.nextStage] === undefined;
  }

  /**
   * Where the Gnome's top stands, in px from the floor's top. On a clear it
   * scrambles up out of sight after a beat, or on the loop's last floor it
   * tumbles, gathering speed, to the bottom girder.
   */
  gnomeY(): number {
    const floor = this.currentFloor();
    const perch = floor.gnome.y + this.introGnomeRise() - this.introHop();
    if (this.phase !== "clear") return perch;
    const elapsed = t.clearTicks - this.phaseTicks;
    if (this.finalClear()) {
      const bottom = Math.max(...floor.girders.map((g) => g.y)) - gnomeHeight;
      return Math.min(bottom, perch + Math.trunc((elapsed * elapsed) / 16));
    }
    const climbed = Math.max(0, elapsed - t.gnomeClimbBeat) * t.gnomeClimbSpeed;
    return Math.max(-gnomeHeight, perch - climbed);
  }

  /** Whether the Gnome is climbing away from a cleared floor (not the loop's last). */
  gnomeClimbing(): boolean {
    return this.phase === "clear" && !this.finalClear() && t.clearTicks - this.phaseTicks > t.gnomeClimbBeat;
  }

  /** How far the girders have been bent into their slopes, 0 flat to 1; 1 out of the intro. */
  introTilt(): number {
    if (this.phase !== "intro") return 1;
    const e = this.introElapsed();
    return t.introStomps.filter((s) => s <= e).length / t.introStomps.length;
  }

  /** How high the stomping Gnome is off its perch, in px: it hops up before each stomp lands. */
  introHop(): number {
    if (this.phase !== "intro") return 0;
    const e = this.introElapsed();
    const next = t.introStomps.find((s) => s > e);
    if (next === undefined || next - e > t.introHopTicks) return 0;
    return Math.round(t.introHop * Math.sin(((next - e) / t.introHopTicks) * Math.PI));
  }

  /** The floor shakes for a few ticks after each stomp lands. */
  introShaking(): boolean {
    if (this.phase !== "intro") return false;
    const e = this.introElapsed();
    return t.introStomps.some((s) => e >= s && e < s + t.introShakeTicks);
  }

  currentFloor(): Floor {
    const floor = floors[this.floor];
    if (floor === undefined) throw new Error(`no floor ${this.floor}`);
    return floor;
  }

  /** The lift platforms where they are now, as flat girders. */
  lifts(): Girder[] {
    return (this.currentFloor().lifts ?? []).flatMap((s) =>
      liftTops(s, this.liftTravel).map((y): Girder => ({ x0: s.x, x1: s.x + liftWidth, y, drop: 0 })),
    );
  }

  /** What the monkey can stand on: the girders and the lift platforms. */
  private surfaces(): Girder[] {
    return [...this.currentFloor().girders, ...this.lifts()];
  }

  /** The Gnome has its arms up: a hazard is about to leave its hands. */
  gnomeThrowing(): boolean {
    if (this.phase !== "play") return false;
    const gear = this.currentFloor().pans === true ? Infinity : this.gearTimer;
    const ember = this.gnomeThrowsEmbers() && this.embers() < this.tuning.maxEmbers ? this.emberTimer : Infinity;
    return Math.min(gear, ember) <= t.throwTicks;
  }

  /** The wrench is in its last ticks: it flashes. */
  wrenchFlashing(): boolean {
    const w = this.monkey.wrench;
    return w > 0 && w <= t.wrenchFlashTicks;
  }

  /** Loop `loop` (from 0) starts afresh on the first floor. */
  startLoop(loop: number): void {
    this.loop = loop;
    // Every plan starts on the girder floor.
    this.floor = 0;
    this.nextStage = 1;
    this.startFloor();
  }

  /** Test hook only: start stage `stage` afresh, counting every loop's floors from the first floor of loop 0. */
  jumpTo(stage: number): void {
    let loop = 0;
    let rest = stage;
    while (rest >= floorsFor(loop).length) rest -= floorsFor(loop++).length;
    const floor = floorsFor(loop)[rest];
    if (floor === undefined) throw new Error(`no stage ${stage}`);
    this.loop = loop;
    this.floor = floors.indexOf(floor);
    this.nextStage = rest + 1;
    this.startFloor();
  }

  /** The floor starts again: the monkey at the bottom, no hazards, every bolt back, the full bonus. */
  startFloor(): void {
    const floor = this.currentFloor();
    this.tuning = t.tuningFor(this.floor, this.loop);
    this.phase = "play";
    this.phaseTicks = 0;
    this.monkey = newMonkey(floor.start);
    this.hazards = [];
    this.bolts = floor.bolts.map(() => false);
    this.rivets = (floor.rivets ?? []).map(() => false);
    this.loose = -1;
    this.wrenches = floor.wrenches.map(() => false);
    this.smashes = [];
    this.popups = [];
    this.bonus = this.tuning.bonusStart;
    this.bonusTimer = 0;
    this.floorTicks = 0;
    this.gearTimer = this.tuning.firstGear;
    this.emberTimer = this.tuning.firstEmber;
    this.beltDir = 1;
    this.beltTimer = t.beltReverseTicks;
    this.liftTravel = 0;
    this.furnaceLit = false;
    this.sentGear = false;
  }

  update(i: Input): void {
    this.ticks++;
    const jumpPressed = i.space && !this.prevSpace;
    this.prevSpace = i.space;
    if (this.lapBanner > 0 && this.phase !== "howHigh") this.lapBanner--;
    for (const p of this.popups) p.ticks--;
    this.popups = this.popups.filter((p) => p.ticks > 0);
    switch (this.phase) {
      case "intro":
        // The input does nothing until the floor starts.
        if (--this.phaseTicks <= 0) this.howHigh();
        else if (t.introStomps.includes(this.introElapsed())) this.onSound("stomp");
        return;
      case "howHigh":
        // The input does nothing until the floor starts.
        if (--this.phaseTicks <= 0) this.phase = "play";
        return;
      case "play":
        this.play(i, jumpPressed);
        return;
      case "dying":
        if (--this.phaseTicks > 0) return;
        if (this.lives <= 0) this.phase = "over";
        else this.enterFloor();
        return;
      case "clear": {
        if (--this.phaseTicks > 0) return;
        const next = floorsFor(this.loop)[this.nextStage];
        if (next === undefined) {
          this.phase = "escape";
          this.phaseTicks = t.escapeTicks;
          this.onSound("escape");
        } else {
          this.floor = floors.indexOf(next);
          this.nextStage++;
          this.enterFloor();
        }
        return;
      }
      case "escape":
        if (--this.phaseTicks > 0) return;
        this.startLoop(this.loop + 1);
        this.howHigh();
        this.lapBanner = t.lapBannerTicks;
        break;
      case "over":
        break;
    }
  }

  private play(i: Input, jumpPressed: boolean): void {
    this.moveLifts();
    if (this.phase !== "play") return;
    if (this.monkey.wrench > 0) this.monkey.wrench--;
    for (const s of this.smashes) s.ticks--;
    this.smashes = this.smashes.filter((s) => s.ticks > 0);
    const x0 = this.monkey.x;
    this.moveMonkey(i, jumpPressed && this.monkey.wrench === 0);
    if (this.phase !== "play") return;
    this.meetRivets(x0);
    if (this.phase !== "play") return;
    this.floorTicks++;
    if (--this.beltTimer <= 0) {
      this.beltDir = this.beltDir < 0 ? 1 : -1;
      this.beltTimer = t.beltReverseTicks;
    }
    this.sendHazards();
    for (const h of this.hazards) this.moveHazard(h);
    const floor = this.currentFloor();
    this.hazards = this.hazards.filter(
      (h) =>
        h.x > -8 &&
        h.x < floor.width + 8 &&
        h.y < floor.height + 16 &&
        (h.kind !== "pan" || groundUnder(floor.girders, h.x, h.y, 2) !== undefined),
    );
    this.stoke();
    this.meet();
    if (this.phase !== "play") return;
    if (++this.bonusTimer % this.advantages.bonusTicks === 0) {
      this.bonus = Math.max(0, this.bonus - t.bonusStep);
      if (this.bonus === 0) this.die();
    }
  }

  private die(): void {
    this.phase = "dying";
    this.phaseTicks = t.dyingTicks;
    this.lives--;
    this.onSound("death");
  }

  /**
   * The lifts move on, carrying the monkey if it stands on a platform. A
   * platform carried off the top of its shaft takes a life; one going back
   * round from the bottom leaves the monkey to fall.
   */
  private moveLifts(): void {
    const travel = this.liftTravel;
    this.liftTravel += t.liftSpeed;
    const m = this.monkey;
    if (m.footing !== "ground") return;
    for (const shaft of this.currentFloor().lifts ?? []) {
      if (m.x < shaft.x || m.x >= shaft.x + liftWidth) continue;
      const n = liftTops(shaft, travel).findIndex((y) => Math.abs(y - m.y) < t.liftSpeed / 2);
      const y = liftTops(shaft, this.liftTravel)[n];
      if (y === undefined) continue;
      if ((y - m.y) * shaft.dir > 0) {
        m.y = y;
      } else if (shaft.dir < 0) {
        this.die();
      } else {
        this.settle();
      }
      return;
    }
  }

  private clampX(x: number): number {
    return Math.max(6, Math.min(this.currentFloor().width - 6, x));
  }

  private moveMonkey(i: Input, jumpPressed: boolean): void {
    const m = this.monkey;
    const floor = this.currentFloor();
    const dir = i.left === i.right ? 0 : i.left ? -1 : 1;
    switch (m.footing) {
      case "ground": {
        // Holding a wrench, the monkey can only walk.
        const free = m.wrench === 0;
        const near = (l: Ladder): boolean => free && whole(l) && Math.abs(m.x - ladderMiddle(l)) <= t.ladderReach;
        const up = i.up ? floor.ladders.find((l) => near(l) && Math.abs(ladderFoot(l) - m.y) <= 2) : undefined;
        const down = i.down ? floor.ladders.find((l) => near(l) && Math.abs(ladderHead(l) - m.y) <= 2) : undefined;
        if (jumpPressed) {
          m.footing = "air";
          m.vy = -this.advantages.jumpSpeed;
          m.vx = dir * t.walkSpeed;
          m.airTop = m.y;
          m.jumps++;
          m.cleared = 0;
          m.moving = false;
          this.markJumpable(groundUnder(this.surfaces(), m.x, m.y, 2));
          this.onSound("jump");
        } else if (up !== undefined || down !== undefined) {
          const l = up ?? down;
          if (l === undefined) return;
          m.footing = "climb";
          m.ladder = l;
          m.x = ladderMiddle(l);
          m.y = up === undefined ? ladderHead(l) : ladderFoot(l);
          m.moving = false;
          m.frame = 0;
        } else {
          const belt = this.beltOr(groundUnder(floor.girders, m.x, m.y, 2)) ?? 0;
          if (dir === 0) {
            m.moving = false;
            m.frame = 0;
          } else {
            m.left = dir < 0;
            m.moving = true;
            const cell = Math.trunc(m.frame);
            m.frame += 0.2;
            if (m.frame >= 4) m.frame = 0;
            if (Math.trunc(m.frame) !== cell) this.onSound("step");
          }
          m.x = this.clampX(m.x + dir * t.walkSpeed + belt * t.beltSpeed);
          this.settle();
        }
        return;
      }
      case "air": {
        const x0 = m.x;
        m.x = this.clampX(m.x + m.vx);
        m.vy = Math.min(m.vy + t.gravity, t.maxFallSpeed);
        const y0 = m.y;
        m.y += m.vy;
        m.airTop = Math.min(m.airTop, m.y);
        const g = m.vy > 0 ? landing(this.surfaces(), x0, y0, m.x, m.y) : undefined;
        if (g !== undefined) {
          m.y = girderTop(g, m.x);
          m.footing = "ground";
          m.cleared = 0;
          m.vx = 0;
          m.vy = 0;
          if (m.y - m.airTop > t.maxFall) this.die();
        } else if (m.y > floor.height + 16) {
          this.die();
        }
        return;
      }
      case "climb": {
        const l = m.ladder;
        if (l === null) return;
        const step = i.up ? -t.climbSpeed : i.down ? t.climbSpeed : 0;
        m.moving = step !== 0;
        m.y += step;
        if (m.moving) m.frame = (m.frame + 0.1) % 2;
        const off = step < 0 ? m.y <= ladderHead(l) : step > 0 && m.y >= ladderFoot(l);
        if (off) {
          m.y = step < 0 ? ladderHead(l) : ladderFoot(l);
          m.footing = "ground";
          m.ladder = null;
          m.frame = 0;
          this.settle();
        }
      }
    }
  }

  /** The hazards on girder `g`, or on a ladder it meets, can score in the jump just started. */
  private markJumpable(g: Girder | undefined): void {
    if (g === undefined) return;
    const floor = this.currentFloor();
    for (const h of this.hazards) {
      const l = h.ladder;
      const on =
        h.footing === "climb" && l !== null
          ? ladderMeetsGirder(l, g)
          : h.footing === "ground" && groundUnder(floor.girders, h.x, h.y, 2) === g;
      // A wild gear can be jumped from any girder it drops past.
      if (on || h.wild) h.scorableIn = this.monkey.jumps;
    }
  }

  /** The monkey stands on the girder under it, or starts to fall. */
  private settle(): void {
    const m = this.monkey;
    const g = groundUnder(this.surfaces(), m.x, m.y, 2);
    if (g !== undefined) {
      m.y = girderTop(g, m.x);
      return;
    }
    m.footing = "air";
    m.vx = 0;
    m.vy = 0;
    m.airTop = m.y;
  }

  /** The way girder `g`'s conveyor runs now, or undefined off a conveyor. */
  private beltOr(g: Girder | undefined): -1 | 1 | undefined {
    return g?.belt === undefined ? undefined : g.belt === this.beltDir ? 1 : -1;
  }

  private embers(): number {
    return this.hazards.filter((h) => h.kind === "ember").length;
  }

  /** A pan comes onto a belt picked at random, at the end it runs from. */
  private sendPan(): void {
    const belts = this.currentFloor().girders.filter((g) => g.belt !== undefined);
    const g = belts[rng.intn(belts.length)];
    const dir = this.beltOr(g);
    if (g === undefined || dir === undefined) return;
    this.hazards.push({ ...newHazard("pan", dir < 0 ? g.x1 - 4 : g.x0 + 4, g.y), dir });
  }

  /** The Gnome throws the embers unless the floor's furnace makes them or they come in at the sides (the rivet floor). */
  private gnomeThrowsEmbers(): boolean {
    const { furnace, rivets } = this.currentFloor();
    return furnace === undefined && rivets === undefined;
  }

  private sendHazards(): void {
    const { gnome, furnace, pans, rivets, springs } = this.currentFloor();
    if (--this.gearTimer <= 0 && springs !== undefined) {
      this.hazards.push(newHazard("spring", gnome.x + 36, springs.y));
      this.gearTimer = this.tuning.gearEvery;
    } else if (this.gearTimer <= 0 && pans === true) {
      this.sendPan();
      this.gearTimer = this.tuning.gearEvery;
    } else if (this.gearTimer <= 0) {
      // The first gear of each life is hot, never wild; a wild gear drops past the furnace.
      const wild = this.sentGear && rng.float() < t.wildChanceFor(this.loop);
      const hot = !wild && furnace !== undefined && (!this.sentGear || rng.float() < t.hotGearChance);
      const gear = { ...newHazard("gear", gnome.x + 36, gnome.y + 32), hot, wild };
      if (wild) gear.footing = "air";
      this.hazards.push(gear);
      this.sentGear = true;
      this.gearTimer = this.tuning.gearEvery;
    }
    // With a furnace, the embers come out of it (stoke); the rivet floor's come in at the sides.
    if (furnace !== undefined) return;
    if (this.embers() >= this.tuning.maxEmbers) {
      this.emberTimer = Math.max(this.emberTimer, t.throwTicks + 1);
    } else if (--this.emberTimer <= 0) {
      this.hazards.push(rivets === undefined ? newHazard("ember", gnome.x + 36, gnome.y + 32) : this.sideEmber());
      this.emberTimer = this.tuning.emberEvery;
    }
  }

  /** An ember coming in at the left or right edge of a girder picked at random, heading in. */
  private sideEmber(): Hazard {
    const { girders, width } = this.currentFloor();
    const g = girders[rng.intn(girders.length)];
    if (g === undefined) throw new Error("the floor has no girders");
    const left = rng.float() < 0.5;
    const x = Math.max(8, Math.min(width - 8, left ? g.x0 + 8 : g.x1 - 8));
    return { ...newHazard("ember", x, girderTop(g, x)), dir: left ? 1 : -1 };
  }

  /**
   * The gears that have rolled into the furnace end there. A hot one lights
   * it, and an ember comes out, unless the floor has its most embers.
   */
  private stoke(): void {
    const { furnace } = this.currentFloor();
    if (furnace === undefined) return;
    const inFurnace = (h: Hazard): boolean =>
      h.kind === "gear" && h.footing === "ground" && h.x <= furnace.x + 8 && Math.abs(h.y - furnace.y) <= 2;
    const fed = this.hazards.filter(inFurnace);
    if (fed.length === 0) return;
    this.hazards = this.hazards.filter((h) => !inFurnace(h));
    for (const h of fed) {
      if (!h.hot) continue;
      this.furnaceLit = true;
      if (this.embers() < this.tuning.maxEmbers) this.hazards.push(newHazard("ember", furnace.x, furnace.y));
    }
  }

  private moveHazard(h: Hazard): void {
    if (h.kind === "gear") this.rollGear(h);
    else if (h.kind === "pan") this.carryPan(h);
    else if (h.kind === "spring") this.bounceSpring(h);
    else this.moveEmber(h);
  }

  /** A spring bounces right along the Gnome's girder until it reaches the drop, then falls straight down. */
  private bounceSpring(h: Hazard): void {
    const { springs } = this.currentFloor();
    if (springs === undefined) return;
    h.x = Math.min(springs.dropX, h.x + t.springSpeed);
    if (h.footing === "ground") {
      h.footing = "air";
      h.vy = -t.springBounce;
      return;
    }
    h.vy = Math.min(h.vy + t.gravity, t.maxFallSpeed);
    h.y += h.vy;
    if (h.x < springs.dropX && h.y >= springs.y) {
      h.y = springs.y;
      h.footing = "ground";
      h.vy = 0;
    }
  }

  /** A pan rides its belt, whichever way it runs, and is gone past either end. */
  private carryPan(h: Hazard): void {
    const g = groundUnder(this.currentFloor().girders, h.x, h.y, 2);
    const dir = this.beltOr(g);
    if (g === undefined || dir === undefined) return;
    h.dir = dir;
    h.x += dir * t.beltSpeed;
  }

  /**
   * A gear rolls along its girder, falls off the end and rolls on downhill
   * (or the way a conveyor carries it). At the head of a ladder it sometimes
   * rolls down it instead, and on along the girder below.
   */
  private rollGear(h: Hazard): void {
    const floor = this.currentFloor();
    const speed = this.tuning.gearSpeed;
    if (h.wild) {
      this.hopWild(h);
      return;
    }
    if (h.footing === "climb" && h.ladder !== null) {
      h.y += speed;
      if (h.y < ladderFoot(h.ladder)) return;
      h.y = ladderFoot(h.ladder);
      h.footing = "ground";
      h.ladder = null;
      const g = groundUnder(floor.girders, h.x, h.y, 2);
      h.dir = this.beltOr(g) ?? (g === undefined || g.drop === 0 ? (h.dir < 0 ? 1 : -1) : g.drop);
      return;
    }
    if (h.footing === "ground") {
      const x0 = h.x;
      h.x += h.dir * speed;
      const g = groundUnder(floor.girders, h.x, h.y, 2);
      if (g === undefined) {
        h.footing = "air";
        h.vy = 0;
        return;
      }
      h.y = girderTop(g, h.x);
      const l = floor.ladders.find(
        (each) => whole(each) && crossed(x0, h.x, ladderMiddle(each)) && Math.abs(ladderHead(each) - h.y) <= 2,
      );
      const below = this.monkey.y > h.y + 2;
      if (l !== undefined && rng.float() < t.gearLadderChanceFor(this.loop, this.floorTicks, below)) {
        h.footing = "climb";
        h.ladder = l;
        h.x = ladderMiddle(l);
      }
      return;
    }
    h.vy = Math.min(h.vy + t.gravity, t.maxFallSpeed);
    const y0 = h.y;
    h.y += h.vy;
    const g = landing(floor.girders, h.x, y0, h.x, h.y);
    if (g === undefined) return;
    h.y = girderTop(g, h.x);
    h.footing = "ground";
    h.vy = 0;
    h.dir = this.beltOr(g) ?? (g.drop === 0 ? h.dir : g.drop);
  }

  /**
   * A wild gear drops through the girders in hops, each starting slow and
   * speeding up, drifting across towards the monkey, until it leaves the bottom.
   */
  private hopWild(h: Hazard): void {
    h.vy = this.ticks % t.wildHopTicks === 0 ? t.wildHopSpeed : Math.min(h.vy + t.gravity, t.maxFallSpeed);
    h.vy = Math.max(h.vy, t.wildHopSpeed);
    h.y += h.vy;
    const gap = this.monkey.x - h.x;
    const drift = t.wildDrift * this.tuning.gearSpeed;
    h.dir = gap < 0 ? -1 : 1;
    h.x += Math.sign(gap) * Math.min(Math.abs(gap), drift);
  }

  /**
   * An ember walks its girder (carried by a conveyor), turning at the ends.
   * At a ladder it climbs towards the monkey more often than away; at the
   * other end, and every so often on the way (more often on later loops), it
   * turns towards the monkey.
   */
  private moveEmber(h: Hazard): void {
    const floor = this.currentFloor();
    if (h.footing === "climb" && h.ladder !== null) {
      const l = h.ladder;
      h.y += h.climbDir * this.tuning.emberClimbSpeed;
      if (h.climbDir < 0 ? h.y <= ladderHead(l) : h.y >= ladderFoot(l)) {
        h.y = h.climbDir < 0 ? ladderHead(l) : ladderFoot(l);
        h.footing = "ground";
        h.ladder = null;
        h.dir = this.monkey.x < h.x ? -1 : 1;
      }
      return;
    }
    if (this.floorTicks % t.emberTurnEveryFor(this.loop) === 0 && this.monkey.x !== h.x) {
      h.dir = this.monkey.x < h.x ? -1 : 1;
    }
    const belt = this.beltOr(groundUnder(floor.girders, h.x, h.y, 2)) ?? 0;
    const x0 = h.x;
    const x = x0 + h.dir * this.tuning.emberWalkSpeed + belt * t.beltSpeed;
    const g = groundUnder(floor.girders, x, h.y, 2);
    if (g === undefined || x < 6 || x > floor.width - 6) {
      h.dir = h.dir < 0 ? 1 : -1;
      return;
    }
    h.x = x;
    h.y = girderTop(g, x);
    for (const l of floor.ladders) {
      const c = ladderMiddle(l);
      if (!whole(l) || !crossed(x0, x, c)) continue;
      const canDown = Math.abs(ladderHead(l) - h.y) <= 2;
      const canUp = Math.abs(ladderFoot(l) - h.y) <= 2;
      if (!canDown && !canUp) continue;
      const dy = this.monkey.y - h.y;
      const level = Math.abs(dy) <= t.emberLevelY;
      const downChance = level ? t.emberDownChance : dy > 0 ? t.emberTowardChance : t.emberAwayChance;
      const upChance = level ? t.emberUpChance : dy < 0 ? t.emberTowardChance : t.emberAwayChance;
      const r = rng.float();
      if (canDown && r < downChance) h.climbDir = 1;
      else if (canUp && r < upChance) h.climbDir = -1;
      else continue;
      h.footing = "climb";
      h.ladder = l;
      h.x = c;
      return;
    }
  }

  /**
   * Passing over an unpulled rivet pulls it, on foot or in a jump; its hole
   * opens once the monkey is off it. Walking into a hole costs a life. The
   * last rivet pulled clears the floor.
   */
  private meetRivets(x0: number): void {
    const m = this.monkey;
    const rivets = this.currentFloor().rivets ?? [];
    rivets.forEach((r, n) => {
      if (this.phase !== "play") return;
      const level = Math.abs(m.y - r.y) <= 2;
      const on = level && m.footing === "ground" && Math.abs(m.x - r.x) < t.holeHalf;
      if (this.rivets[n] === true) {
        if (n === this.loose) {
          if (!on) this.loose = -1;
        } else if (on) {
          this.die();
        }
        return;
      }
      const over = m.footing === "air" ? r.y - m.y >= 0 && r.y - m.y <= t.jumpOverHeight : level;
      if (!over || m.footing === "climb" || !crossed(x0, m.x, r.x)) return;
      this.rivets[n] = true;
      this.loose = m.footing === "ground" ? n : -1;
      this.onSound("bolt");
      this.addScore(t.rivetPoints);
      if (this.rivets.every(Boolean)) this.clearFloor();
    });
  }

  private clearFloor(): void {
    this.phase = "clear";
    this.phaseTicks = t.clearTicks;
    this.onSound("floor");
    this.addScore(this.bonus);
  }

  /** Whether `h` is as high as the monkey, to a touch. */
  private sameHeight(h: Hazard): boolean {
    return Math.abs(h.y - 6 - (this.monkey.y - 8)) < t.touchY;
  }

  /** Whether the wrench's swing reaches `h`: in front of the monkey, or just behind its middle; on the raised frames also over its head. */
  private swingReaches(h: Hazard): boolean {
    const m = this.monkey;
    if (m.wrench <= 0) return false;
    const front = (h.x - m.x) * facing(m);
    if (front <= -t.smashBehind || front >= t.smashReach) return false;
    if (this.sameHeight(h)) return true;
    const raised = Math.trunc(this.ticks / 8) % 2 === 0;
    return raised && Math.abs(h.y - 6 - (m.y - t.smashRaisedY)) < t.touchY;
  }

  /** The wrench smashes the hazards its swing reaches, for points. */
  private smashHazards(): void {
    const smashed = this.hazards.filter((h) => this.swingReaches(h));
    for (const h of smashed) {
      const pick = rng.intn(t.smashPoints.length);
      const points = t.smashPoints.reduce((chosen, p, n) => (n === pick ? p : chosen), 0);
      this.smashes.push({ x: h.x, y: h.y, points, ticks: t.smashShowTicks });
      this.onSound("smash");
      this.addScore(points);
    }
    this.hazards = this.hazards.filter((h) => !smashed.includes(h));
  }

  /** The monkey meets the hazards, the bolts, the wrenches and the exit door. */
  private meet(): void {
    const m = this.monkey;
    const floor = this.currentFloor();
    this.smashHazards();
    for (const h of this.hazards) {
      const dx = Math.abs(h.x - m.x);
      if (dx < t.touchX && this.sameHeight(h)) {
        if (this.umbrellas === 0) {
          this.die();
          return;
        }
        // The umbrella (#268): the hazard bounces off it and is gone, and the umbrella is spent.
        this.umbrellas--;
        this.hazards = this.hazards.filter((o) => o !== h);
        this.onSound("stomp");
        continue;
      }
      const below = h.y - m.y;
      if (
        m.footing === "air" &&
        h.scorableIn === m.jumps &&
        dx < t.jumpOverX &&
        below > 0 &&
        below <= t.jumpOverHeight
      ) {
        h.scorableIn = 0;
        m.cleared++;
        this.onSound("hazard");
        this.addScore(jumpTotal(m.cleared) - jumpTotal(m.cleared - 1));
      }
    }
    floor.bolts.forEach((b, n) => {
      if (this.bolts[n] === true || Math.abs(b.x - m.x) >= t.boltReach || Math.abs(b.y - m.y) >= t.boltReach) return;
      this.bolts[n] = true;
      const points = t.boltPointsFor(this.loop);
      this.popups.push({ x: b.x, y: b.y, points, ticks: t.popupTicks });
      this.onSound("bolt");
      this.addScore(points);
    });
    floor.wrenches.forEach((w, n) => {
      if (this.wrenches[n] === true || m.footing === "climb" || m.wrench > 0) return;
      if (Math.abs(w.x - m.x) >= t.wrenchReach || Math.abs(w.y - m.y) >= t.wrenchReach) return;
      this.wrenches[n] = true;
      m.wrench = t.wrenchTicks;
    });
    const { door } = floor;
    if (
      door !== undefined &&
      m.footing === "ground" &&
      Math.abs(m.y - door.y) <= 1 &&
      m.x >= door.x + 2 &&
      m.x <= door.x + 14
    )
      this.clearFloor();
  }

  /** Adds points; the first time the run reaches `extraLifeAt` it also adds a life. */
  private addScore(points: number): void {
    this.score += points;
    if (this.extraLifeAwarded || this.score < t.extraLifeAt) return;
    this.extraLifeAwarded = true;
    this.lives++;
    this.onSound("extraLife");
  }
}
