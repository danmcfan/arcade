// Brass Monkey's game logic, headless and on ticks (ADR 0002, ADR 0003): the
// monkey runs, jumps and climbs up each floor past the gears and embers the
// Gnome sends, collecting bolts, to the exit door; then the next floor, the
// escaped scene, and the floors again, harder. Every random choice goes
// through the seeded RNG. Positions are in floor pixels; an entity's `x` is
// its middle and its `y` the row its foot stands on. game.ts draws it.

import type { Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { floors, girderTop, type Floor, type Girder, type Ladder, type Spot } from "./floors.ts";
import * as t from "./tuning.ts";
import { noAdvantages, type BrassMonkeyAdvantages } from "./advantages.ts";

/** What the run is doing: playing a floor, the monkey losing a life, a floor finished, the escaped scene, or over. */
export type Phase = "play" | "dying" | "clear" | "escape" | "over";

/** On a girder, in the air (jumping or falling), or on a ladder. */
export type Footing = "ground" | "air" | "climb";

/** The sounds the run makes; game.ts plays them. */
export type RunSound = "jump" | "bolt" | "hazard" | "death" | "floor" | "escape";

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
}

export interface Hazard {
  kind: "gear" | "ember";
  x: number;
  y: number;
  dir: -1 | 1;
  vy: number;
  footing: Footing;
  ladder: Ladder | null;
  /** Up (-1) or down (1), while climbing. */
  climbDir: -1 | 1;
  /** The monkey's jump this hazard was last jumped in. */
  jumpedIn: number;
  /** The monkey's jump this hazard can score in: one that took off from its girder. */
  jumpable: number;
}

/** The girder whose top is within `tol` of y at x, the nearest if more than one. */
function groundUnder(floor: Floor, x: number, y: number, tol: number): Girder | undefined {
  let best: Girder | undefined;
  let bestD = Infinity;
  for (const g of floor.girders) {
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
function landing(floor: Floor, x0: number, y0: number, x1: number, y1: number): Girder | undefined {
  let best: Girder | undefined;
  for (const g of floor.girders) {
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
  };
}

/** One run of Brass Monkey, from 3 lives (more with the oil can) to game over. */
export class Run {
  phase: Phase = "play";
  /** Ticks left in `dying`, `clear` or `escape`. */
  phaseTicks = 0;
  /** Index into `floors`. */
  floor: number;
  /** How many times the monkey has escaped: each loop is harder. */
  loop: number;
  /** Ticks left showing the new lap's number over its first floor. */
  lapBanner = 0;
  lives: number;
  /** What the player's prizes change in this run (#40); `noAdvantages` without prizes. */
  readonly advantages: Readonly<BrassMonkeyAdvantages>;
  score = 0;
  bonus = 0;
  bonusTimer = 0;
  monkey: Monkey;
  hazards: Hazard[] = [];
  /** Whether each of the floor's bolts has been collected. */
  bolts: boolean[] = [];
  /** Ticks until the Gnome sends its next gear and ember. */
  gearTimer = 0;
  emberTimer = 0;
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
    } = {},
  ) {
    this.advantages = opts.advantages ?? noAdvantages;
    this.lives = this.advantages.lives;
    this.floor = opts.floor ?? 0;
    this.loop = opts.loop ?? 0;
    this.onSound = opts.onSound ?? ((): void => {});
    this.tuning = t.tuningFor(this.floor, this.loop);
    this.monkey = newMonkey(this.currentFloor().start);
    this.startFloor();
  }

  currentFloor(): Floor {
    const floor = floors[this.floor];
    if (floor === undefined) throw new Error(`no floor ${this.floor}`);
    return floor;
  }

  /** The Gnome has its arms up: a hazard is about to leave its hands. */
  gnomeThrowing(): boolean {
    if (this.phase !== "play") return false;
    const ember = this.embers() < this.tuning.maxEmbers ? this.emberTimer : Infinity;
    return Math.min(this.gearTimer, ember) <= t.throwTicks;
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
    this.bonus = this.tuning.bonusStart;
    this.bonusTimer = 0;
    this.gearTimer = this.tuning.firstGear;
    this.emberTimer = this.tuning.firstEmber;
  }

  update(i: Input): void {
    this.ticks++;
    const jumpPressed = i.space && !this.prevSpace;
    this.prevSpace = i.space;
    if (this.lapBanner > 0) this.lapBanner--;
    switch (this.phase) {
      case "play":
        this.play(i, jumpPressed);
        return;
      case "dying":
        if (--this.phaseTicks > 0) return;
        if (this.lives <= 0) this.phase = "over";
        else this.startFloor();
        return;
      case "clear":
        if (--this.phaseTicks > 0) return;
        if (this.floor + 1 < floors.length) {
          this.floor++;
          this.startFloor();
        } else {
          this.phase = "escape";
          this.phaseTicks = t.escapeTicks;
          this.onSound("escape");
        }
        return;
      case "escape":
        if (--this.phaseTicks > 0) return;
        this.loop++;
        this.floor = 0;
        this.startFloor();
        this.lapBanner = t.lapBannerTicks;
        break;
      case "over":
        break;
    }
  }

  private play(i: Input, jumpPressed: boolean): void {
    this.moveMonkey(i, jumpPressed);
    if (this.phase !== "play") return;
    this.sendHazards();
    for (const h of this.hazards) this.moveHazard(h);
    const floor = this.currentFloor();
    this.hazards = this.hazards.filter((h) => h.x > -8 && h.x < floor.width + 8 && h.y < floor.height + 16);
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

  private clampX(x: number): number {
    return Math.max(6, Math.min(this.currentFloor().width - 6, x));
  }

  private moveMonkey(i: Input, jumpPressed: boolean): void {
    const m = this.monkey;
    const floor = this.currentFloor();
    const dir = i.left === i.right ? 0 : i.left ? -1 : 1;
    switch (m.footing) {
      case "ground": {
        const near = (l: Ladder): boolean => whole(l) && Math.abs(m.x - ladderMiddle(l)) <= t.ladderReach;
        const up = i.up ? floor.ladders.find((l) => near(l) && Math.abs(ladderFoot(l) - m.y) <= 2) : undefined;
        const down = i.down ? floor.ladders.find((l) => near(l) && Math.abs(ladderHead(l) - m.y) <= 2) : undefined;
        if (jumpPressed) {
          m.footing = "air";
          m.vy = -this.advantages.jumpSpeed;
          m.vx = dir * t.walkSpeed;
          m.airTop = m.y;
          m.jumps++;
          m.moving = false;
          this.markJumpable(groundUnder(floor, m.x, m.y, 2));
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
          const belt = groundUnder(floor, m.x, m.y, 2)?.belt ?? 0;
          if (dir === 0) {
            m.moving = false;
            m.frame = 0;
          } else {
            m.left = dir < 0;
            m.moving = true;
            m.frame += 0.2;
            if (m.frame >= 4) m.frame = 0;
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
        const g = m.vy > 0 ? landing(floor, x0, y0, m.x, m.y) : undefined;
        if (g !== undefined) {
          m.y = girderTop(g, m.x);
          m.footing = "ground";
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
    const meets = (y: number, x: number): boolean => x >= g.x0 && x < g.x1 && Math.abs(girderTop(g, x) - y) <= 2;
    for (const h of this.hazards) {
      const l = h.ladder;
      const on =
        h.footing === "climb" && l !== null
          ? meets(ladderHead(l), ladderMiddle(l)) || meets(ladderFoot(l), ladderMiddle(l))
          : h.footing === "ground" && groundUnder(floor, h.x, h.y, 2) === g;
      if (on) h.jumpable = this.monkey.jumps;
    }
  }

  /** The monkey stands on the girder under it, or starts to fall. */
  private settle(): void {
    const m = this.monkey;
    const g = groundUnder(this.currentFloor(), m.x, m.y, 2);
    if (g !== undefined) {
      m.y = girderTop(g, m.x);
      return;
    }
    m.footing = "air";
    m.vx = 0;
    m.vy = 0;
    m.airTop = m.y;
  }

  private embers(): number {
    return this.hazards.filter((h) => h.kind === "ember").length;
  }

  private sendHazards(): void {
    const { gnome } = this.currentFloor();
    const at = (kind: Hazard["kind"]): Hazard => ({
      kind,
      x: gnome.x + 36,
      y: gnome.y + 32,
      dir: 1,
      vy: 0,
      footing: "ground",
      ladder: null,
      climbDir: 1,
      jumpedIn: 0,
      jumpable: 0,
    });
    if (--this.gearTimer <= 0) {
      this.hazards.push(at("gear"));
      this.gearTimer = this.tuning.gearEvery;
    }
    if (this.embers() >= this.tuning.maxEmbers) {
      this.emberTimer = Math.max(this.emberTimer, t.throwTicks + 1);
    } else if (--this.emberTimer <= 0) {
      this.hazards.push(at("ember"));
      this.emberTimer = this.tuning.emberEvery;
    }
  }

  private moveHazard(h: Hazard): void {
    if (h.kind === "gear") this.rollGear(h);
    else this.moveEmber(h);
  }

  /**
   * A gear rolls along its girder, falls off the end and rolls on downhill
   * (or the way a conveyor carries it). At the head of a ladder it sometimes
   * rolls down it instead, and on along the girder below.
   */
  private rollGear(h: Hazard): void {
    const floor = this.currentFloor();
    const speed = this.tuning.gearSpeed;
    if (h.footing === "climb" && h.ladder !== null) {
      h.y += speed;
      if (h.y < ladderFoot(h.ladder)) return;
      h.y = ladderFoot(h.ladder);
      h.footing = "ground";
      h.ladder = null;
      const g = groundUnder(floor, h.x, h.y, 2);
      h.dir = g?.belt ?? (g === undefined || g.drop === 0 ? (h.dir < 0 ? 1 : -1) : g.drop);
      return;
    }
    if (h.footing === "ground") {
      const x0 = h.x;
      h.x += h.dir * speed;
      const g = groundUnder(floor, h.x, h.y, 2);
      if (g === undefined) {
        h.footing = "air";
        h.vy = 0;
        return;
      }
      h.y = girderTop(g, h.x);
      const l = floor.ladders.find(
        (each) => whole(each) && crossed(x0, h.x, ladderMiddle(each)) && Math.abs(ladderHead(each) - h.y) <= 2,
      );
      if (l !== undefined && rng.float() < t.gearLadderChance) {
        h.footing = "climb";
        h.ladder = l;
        h.x = ladderMiddle(l);
      }
      return;
    }
    h.vy = Math.min(h.vy + t.gravity, t.maxFallSpeed);
    const y0 = h.y;
    h.y += h.vy;
    const g = landing(floor, h.x, y0, h.x, h.y);
    if (g === undefined) return;
    h.y = girderTop(g, h.x);
    h.footing = "ground";
    h.vy = 0;
    h.dir = g.belt ?? (g.drop === 0 ? h.dir : g.drop);
  }

  /**
   * An ember walks its girder (carried by a conveyor), turning at the ends.
   * At a ladder it may climb down, or less often up; at the other end it
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
    const belt = groundUnder(floor, h.x, h.y, 2)?.belt ?? 0;
    const x0 = h.x;
    const x = x0 + h.dir * this.tuning.emberWalkSpeed + belt * t.beltSpeed;
    const g = groundUnder(floor, x, h.y, 2);
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
      const r = rng.float();
      if (canDown && r < t.emberDownChance) h.climbDir = 1;
      else if (canUp && r < t.emberUpChance) h.climbDir = -1;
      else continue;
      h.footing = "climb";
      h.ladder = l;
      h.x = c;
      return;
    }
  }

  /** The monkey meets the hazards, the bolts and the exit door. */
  private meet(): void {
    const m = this.monkey;
    const floor = this.currentFloor();
    for (const h of this.hazards) {
      const dx = Math.abs(h.x - m.x);
      if (dx < t.touchX && Math.abs(h.y - 6 - (m.y - 8)) < t.touchY) {
        this.die();
        return;
      }
      const below = h.y - m.y;
      if (
        m.footing === "air" &&
        h.jumpable === m.jumps &&
        h.jumpedIn !== m.jumps &&
        dx < t.jumpOverX &&
        below > 0 &&
        below <= t.jumpOverHeight
      ) {
        h.jumpedIn = m.jumps;
        this.score += t.hazardPoints;
        this.onSound("hazard");
      }
    }
    floor.bolts.forEach((b, n) => {
      if (this.bolts[n] === true || Math.abs(b.x - m.x) >= t.boltReach || Math.abs(b.y - m.y) >= t.boltReach) return;
      this.bolts[n] = true;
      this.score += t.boltPoints;
      this.onSound("bolt");
    });
    const { door } = floor;
    if (m.footing === "ground" && Math.abs(m.y - door.y) <= 1 && m.x >= door.x + 2 && m.x <= door.x + 14) {
      this.score += this.bonus;
      this.phase = "clear";
      this.phaseTicks = t.clearTicks;
      this.onSound("floor");
    }
  }
}
