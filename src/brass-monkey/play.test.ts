import { beforeEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { ticketsFor } from "../arcade/wallet.ts";
import { conveyorFloor, elevatorFloor, floors, girderTop, type Shaft } from "./floors.ts";
import { Run, type Hazard, type RunSound } from "./play.ts";
import * as t from "./tuning.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });

/** A run with no hazards coming, recording its sounds. */
function quiet(opts: { floor?: number; loop?: number } = {}): { run: Run; sounds: RunSound[] } {
  const sounds: RunSound[] = [];
  const run = new Run({ ...opts, onSound: (s): void => void sounds.push(s) });
  run.gearTimer = Infinity;
  run.emberTimer = Infinity;
  return { run, sounds };
}

function step(run: Run, ticks: number, i: Partial<Input> = {}): void {
  for (let n = 0; n < ticks; n++) run.update(held(i));
}

/** Steps until `done`, at most `max` ticks; fails if it never happens. */
function until(run: Run, done: () => boolean, i: Partial<Input> = {}, max = 5000): void {
  for (let n = 0; n < max && !done(); n++) run.update(held(i));
  expect(done()).toBe(true);
}

const hazard = (kind: Hazard["kind"], x: number, y: number, dir: -1 | 1 = 1): Hazard => ({
  kind,
  x,
  y,
  dir,
  vy: 0,
  footing: "ground",
  ladder: null,
  climbDir: 1,
  scorableIn: 0,
  wild: false,
});

beforeEach(() => {
  rng.seed(1);
});

describe("the monkey", () => {
  test("starts at the bottom of the girder floor with 3 lives, no score and the full bonus", () => {
    const { run } = quiet();
    expect([run.monkey.x, run.monkey.y, run.lives, run.score, run.bonus]).toEqual([16, 248, 3, 0, 5000]);
  });

  test("runs 1 px a tick, following the slope", () => {
    const { run } = quiet();
    step(run, 10, { right: true });
    expect([run.monkey.x, run.monkey.y, run.monkey.left, run.monkey.moving]).toEqual([26, 248, false, true]);
    run.monkey.x = 111;
    step(run, 17, { right: true });
    expect([run.monkey.x, run.monkey.y]).toEqual([128, 246]);
    step(run, 1, { left: true });
    expect(run.monkey.left).toBe(true);
  });

  test("jumps on Space: up 15 px and back down on the same girder 31 ticks later, carrying its run", () => {
    const { run, sounds } = quiet();
    step(run, 1, { space: true, right: true });
    expect(run.monkey.footing).toBe("air");
    expect(sounds).toEqual(["jump"]);
    step(run, 30, { space: true });
    expect(run.monkey.footing).toBe("air");
    expect(run.monkey.airTop).toBe(248 - 15);
    step(run, 1, { space: true });
    expect([run.monkey.footing, run.monkey.x, run.monkey.y]).toEqual(["ground", 47, 248]);
    // Space must be let go before the next jump.
    step(run, 1, { space: true });
    expect(run.monkey.footing).toBe("ground");
  });

  test("climbs a ladder up to the girder above, and back down", () => {
    const { run } = quiet();
    run.monkey.x = 34; // within reach of the ladder at x 32-39, rows 194-209
    run.monkey.y = 210;
    step(run, 1, { up: true });
    expect([run.monkey.footing, run.monkey.x]).toEqual(["climb", 36]);
    until(run, () => run.monkey.footing === "ground", { up: true });
    expect(run.monkey.y).toBe(186);
    step(run, 1, { down: true });
    expect(run.monkey.footing).toBe("climb");
    until(run, () => run.monkey.footing === "ground", { down: true });
    expect(run.monkey.y).toBe(210);
  });

  test("can't climb a broken ladder", () => {
    const { run } = quiet();
    run.monkey.x = 84; // the broken ladder at x 80
    step(run, 5, { up: true });
    expect(run.monkey.footing).toBe("ground");
  });

  test("is carried along by a conveyor", () => {
    const { run } = quiet({ floor: 1 });
    run.monkey.x = 100;
    run.monkey.y = 168; // the conveyor running right
    step(run, 10);
    expect(run.monkey.x).toBe(105);
  });
});

describe("hazards", () => {
  test("the Gnome sends a gear that rolls along its girder, drops off the end and rolls on downhill", () => {
    const { run } = quiet();
    run.gearTimer = 1;
    step(run, 1);
    const [gear] = run.hazards;
    expect(gear).toMatchObject({ kind: "gear", x: 61, y: 84, dir: 1 });
    until(run, () => gear?.footing === "air");
    expect(gear?.x).toBe(208);
    until(run, () => gear?.footing === "ground");
    expect(gear?.y).toBe(109);
    expect(gear?.dir).toBe(-1);
    step(run, 16);
    expect(gear?.y).toBe(110);
  });

  test("a gear sometimes rolls down a ladder, then on along the girder below", () => {
    const { run } = quiet();
    // On the top girder, rolling right towards the ladder at x 184 (rows 95-110).
    const gear = hazard("gear", 180, 87);
    run.hazards = [gear];
    rng.seed(7); // its first float is under the ladder chance
    expect(rng.float()).toBeLessThan(t.gearLadderChance);
    rng.seed(7);
    until(run, () => gear.footing !== "ground");
    expect([gear.footing, gear.x]).toEqual(["climb", 188]);
    until(run, () => gear.footing === "ground");
    expect([gear.y, gear.dir]).toEqual([111, -1]);
  });

  test("an ember climbs a ladder", () => {
    const { run } = quiet();
    // On the girder under the ladder at x 184, rows 95-110.
    const ember = hazard("ember", 180, 111);
    run.hazards = [ember];
    until(run, () => ember.footing === "climb");
    expect([ember.x, ember.climbDir]).toEqual([188, -1]);
    until(run, () => ember.footing === "ground");
    expect(ember.y).toBe(87);
  });
});

describe("the conveyor floor", () => {
  test("no gear ever comes: pans ride the belts instead", () => {
    const { run } = quiet({ floor: 1 });
    run.monkey.y = -100;
    run.monkey.footing = "climb";
    run.gearTimer = 1;
    step(run, 600);
    expect(run.hazards.some((h) => h.kind === "gear")).toBe(false);
    expect(run.hazards.some((h) => h.kind === "pan")).toBe(true);
  });

  test("a pan starts at the upstream end of a belt, moves at the belt's speed and direction, and is gone past the far end", () => {
    const { run } = quiet({ floor: 1 });
    run.monkey.y = -100;
    run.monkey.footing = "climb";
    run.gearTimer = 1;
    step(run, 1);
    const [pan] = run.hazards;
    if (pan === undefined) throw new Error("no pan");
    const belt = conveyorFloor.girders.find((g) => g.belt !== undefined && g.y === pan.y);
    if (belt?.belt === undefined) throw new Error("the pan is not on a belt");
    // It comes on 4 px in from the end and rides its first half pixel at once.
    expect(pan.x).toBe(belt.belt < 0 ? belt.x1 - 4.5 : belt.x0 + 4.5);
    expect(pan.dir).toBe(belt.belt);
    const x = pan.x;
    run.gearTimer = Infinity;
    run.beltTimer = Infinity;
    step(run, 10);
    expect(pan.x).toBe(x + belt.belt * t.beltSpeed * 10);
    until(run, () => !run.hazards.includes(pan));
    expect(belt.belt < 0 ? pan.x < belt.x0 + 1 : pan.x > belt.x1 - 1).toBe(true);
  });

  test("the belts reverse every beltReverseTicks, carrying the monkey and the pans the other way", () => {
    const { run } = quiet({ floor: 1 });
    run.monkey.y = -100;
    run.monkey.footing = "climb";
    step(run, t.beltReverseTicks);
    run.monkey.x = 100;
    run.monkey.y = 168; // the conveyor that ran right
    run.monkey.footing = "ground";
    step(run, 10);
    expect(run.monkey.x).toBe(95);
    const pan = hazard("pan", 100, 168);
    run.hazards = [pan];
    run.monkey.y = -100;
    run.monkey.footing = "climb";
    step(run, 2);
    expect(pan.x).toBe(99);
  });

  test("touching a pan costs a life", () => {
    const { run } = quiet({ floor: 1 });
    run.hazards = [hazard("pan", run.monkey.x + 4, 248)];
    step(run, 1);
    expect(run.phase).toBe("dying");
  });

  test("a pan jumped over scores", () => {
    const { run } = quiet({ floor: 1 });
    run.monkey.x = 140;
    run.monkey.y = 208; // the belt running left
    run.hazards = [hazard("pan", 164, 208, -1)];
    step(run, 1, { space: true, right: true });
    step(run, 30);
    expect(run.phase).toBe("play");
    expect(run.score).toBe(t.hazardPoints);
  });

  test("the Gnome never raises its arms for a pan", () => {
    const { run } = quiet({ floor: 1 });
    run.gearTimer = 1;
    run.emberTimer = Infinity;
    expect(run.gnomeThrowing()).toBe(false);
  });
});

describe("losing a life", () => {
  test("to a hazard: a life goes, and after a pause the floor starts again", () => {
    const { run, sounds } = quiet();
    step(run, 30, { right: true });
    run.hazards = [hazard("gear", run.monkey.x + 4, 248, -1)];
    step(run, 1);
    expect([run.phase, run.lives]).toEqual(["dying", 2]);
    expect(sounds).toContain("death");
    step(run, t.dyingTicks);
    expect([run.phase, run.monkey.x, run.monkey.y, run.hazards]).toEqual(["play", 16, 248, []]);
  });

  test("to a long fall", () => {
    const { run } = quiet();
    // Walk off the right end of the girder at y 208 to the one 21 px below.
    run.monkey.x = 200;
    run.monkey.y = 220;
    until(run, () => run.monkey.footing === "air", { right: true });
    until(run, () => run.phase !== "play" || run.monkey.footing === "ground");
    expect([run.phase, run.lives]).toEqual(["dying", 2]);
  });

  test("not to a jump on the flat", () => {
    const { run } = quiet();
    step(run, 1, { space: true });
    step(run, 40);
    expect([run.phase, run.lives]).toEqual(["play", 3]);
  });

  test("to the bonus running out", () => {
    const { run } = quiet();
    run.bonus = t.bonusStep;
    step(run, t.bonusTicks);
    expect([run.bonus, run.phase, run.lives]).toEqual([0, "dying", 2]);
  });

  test("the bonus drops by 100 every 2 seconds", () => {
    const { run } = quiet();
    step(run, t.bonusTicks * 3);
    expect(run.bonus).toBe(5000 - 300);
  });

  test("game over after 3 lost lives; the score pays tickets", () => {
    const { run } = quiet();
    run.score = 12_345;
    for (let n = 0; n < 3; n++) {
      run.bonus = t.bonusStep;
      step(run, t.bonusTicks);
      expect(run.phase).toBe("dying");
      step(run, t.dyingTicks);
    }
    expect([run.phase, run.lives]).toEqual(["over", 0]);
    expect(ticketsFor(run.score)).toBe(123);
  });
});

describe("score", () => {
  test("a hazard jumped over scores once", () => {
    const { run, sounds } = quiet();
    run.monkey.x = 60;
    run.hazards = [hazard("gear", 76, 248, -1)];
    step(run, 1, { space: true });
    step(run, 30);
    expect(run.phase).toBe("play");
    expect(run.score).toBe(t.hazardPoints);
    expect(sounds).toEqual(["jump", "hazard"]);
  });

  test("an ember jumped over on the monkey's girder scores", () => {
    const { run, sounds } = quiet();
    run.monkey.x = 60;
    run.hazards = [hazard("ember", 76, 248, -1)];
    step(run, 1, { space: true, right: true });
    step(run, 30);
    expect(run.phase).toBe("play");
    expect(run.score).toBe(t.hazardPoints);
    expect(sounds).toEqual(["jump", "hazard"]);
  });

  test("a gear on the girder below does not score", () => {
    const { run, sounds } = quiet();
    const girders = floors[0]?.girders ?? [];
    const lower = girders.find((g) => g.y === 208);
    const upper = girders.find((g) => g.y === 187);
    if (lower === undefined || upper === undefined) throw new Error("no girders");
    run.monkey.x = 20;
    run.monkey.y = girderTop(upper, 20);
    run.hazards = [hazard("gear", 24, girderTop(lower, 24), -1)];
    expect([run.monkey.y, run.hazards[0]?.y]).toEqual([187, 209]);
    step(run, 1, { space: true });
    step(run, 30);
    expect(run.phase).toBe("play");
    expect(run.score).toBe(0);
    expect(sounds).toEqual(["jump"]);
  });

  test("an ember climbing a ladder that meets the monkey's girder scores", () => {
    const { run, sounds } = quiet();
    const girders = floors[0]?.girders ?? [];
    const lower = girders.find((g) => g.y === 187);
    const ladder = floors[0]?.ladders.find((l) => l.x === 32 && l.bottom === 209);
    if (lower === undefined || ladder === undefined) throw new Error("no ladder");
    run.monkey.x = 32;
    run.monkey.y = girderTop(lower, 32);
    const ember = hazard("ember", 32, ladder.top + 8, -1);
    ember.footing = "climb";
    ember.ladder = ladder;
    run.hazards = [ember];
    step(run, 1, { space: true });
    step(run, 30);
    expect(run.phase).toBe("play");
    expect(run.score).toBe(t.hazardPoints);
    expect(sounds).toEqual(["jump", "hazard"]);
  });

  test("a bolt scores and is gone", () => {
    const { run, sounds } = quiet();
    run.monkey.x = 56;
    run.monkey.y = 211;
    step(run, 8, { right: true });
    expect(run.bolts[0]).toBe(true);
    expect(run.score).toBe(t.boltPoints);
    expect(sounds).toEqual(["bolt"]);
    step(run, 8, { left: true });
    expect(run.score).toBe(t.boltPoints);
  });

  test("the bonus is added at the exit, and the girder floor leads to the conveyor floor", () => {
    const { run, sounds } = quiet();
    run.monkey.x = 100;
    run.monkey.y = 56;
    step(run, t.bonusTicks);
    step(run, 8, { right: true });
    expect(run.phase).toBe("clear");
    expect(run.score).toBe(4900);
    expect(sounds).toEqual(["floor"]);
    step(run, t.clearTicks);
    expect([run.phase, run.floor, run.bonus]).toEqual(["play", 1, 5000]);
    expect([run.monkey.x, run.monkey.y]).toEqual([conveyorFloor.start.x, conveyorFloor.start.y]);
  });
});

describe("the escape and the next loop", () => {
  test("after the elevator floor the escaped scene plays, then the girder floor again, harder", () => {
    const { run, sounds } = quiet({ floor: 2 });
    run.monkey.x = 100;
    run.monkey.y = 56;
    step(run, 8, { right: true });
    step(run, t.clearTicks);
    expect(run.phase).toBe("escape");
    expect(sounds).toEqual(["floor", "escape"]);
    step(run, t.escapeTicks);
    expect([run.phase, run.floor, run.loop]).toEqual(["play", 0, 1]);
    const easy = t.tuningFor(0, 0);
    expect(run.bonus).toBeLessThan(easy.bonusStart);
    expect(run.tuning.gearEvery).toBeLessThan(easy.gearEvery);
    expect(run.tuning.emberEvery).toBeLessThan(easy.emberEvery);
    expect(run.tuning.gearSpeed).toBeGreaterThan(easy.gearSpeed);
    expect(run.tuning.emberWalkSpeed).toBeGreaterThan(easy.emberWalkSpeed);
    expect(run.tuning.emberClimbSpeed).toBeGreaterThan(easy.emberClimbSpeed);
  });

  test("the bonus never starts below its floor, nor hazards come too often", () => {
    const hard = t.tuningFor(0, 20);
    expect(hard.bonusStart).toBe(t.minBonusStart);
    expect(hard.gearEvery).toBe(t.minSpawnEvery);
  });

  test("by loop 10 every hazard speed has reached its cap", () => {
    for (const floor of [0, 1]) {
      const hard = t.tuningFor(floor, 10);
      expect(hard.gearSpeed).toBe(t.maxGearSpeed);
      expect(hard.emberWalkSpeed).toBe(t.maxEmberWalkSpeed);
      expect(hard.emberClimbSpeed).toBe(t.maxEmberClimbSpeed);
    }
  });

  test("an ember is always slower than the monkey, walking and climbing", () => {
    for (const floor of [0, 1]) {
      for (let loop = 0; loop <= 30; loop++) {
        const tuning = t.tuningFor(floor, loop);
        expect(tuning.emberWalkSpeed).toBeLessThan(t.walkSpeed);
        expect(tuning.emberClimbSpeed).toBeLessThan(t.climbSpeed);
      }
    }
  });

  test("loops 0-2 keep their speeds, except ember climb, which hits its cap at loop 2", () => {
    for (const [floor, base] of t.floorTunings.entries()) {
      for (const loop of [0, 1, 2]) {
        const tuning = t.tuningFor(floor, loop);
        const uncapped = t.loopSpeedFactor ** loop;
        expect(tuning.gearSpeed).toBe(base.gearSpeed * uncapped);
        expect(tuning.emberWalkSpeed).toBe(base.emberWalkSpeed * uncapped);
      }
      expect(t.tuningFor(floor, 1).emberClimbSpeed).toBe(base.emberClimbSpeed * t.loopSpeedFactor);
      // The issue's two criteria conflict here: "loops 0-2 unchanged" would give 0.72 at loop 2,
      // but "ember climb at most 0.9 x the monkey's climb" caps it at 0.675. The cap wins.
      expect(t.tuningFor(floor, 2).emberClimbSpeed).toBe(t.maxEmberClimbSpeed);
    }
  });
});

/** A quiet run on the elevator floor, the monkey standing on `shaft`'s first platform. */
function riding(shaft: Shaft): Run {
  const { run } = quiet({ floor: 2 });
  const lift = run.lifts().find((l) => l.x0 === shaft.x);
  if (lift === undefined) throw new Error("no platform in the shaft");
  run.monkey.x = shaft.x + 8;
  run.monkey.y = lift.y;
  return run;
}

describe("the elevator floor", () => {
  const [up, down] = elevatorFloor.lifts ?? [];
  if (up === undefined || down === undefined) throw new Error("the elevator floor has no lifts");

  test("follows the Gnome's girder floor and the conveyor floor", () => {
    expect(floors.indexOf(elevatorFloor)).toBe(2);
  });

  test("a monkey standing on a lift moves with it, up or down", () => {
    const run = riding(up);
    const y = run.monkey.y;
    step(run, 20);
    expect([run.monkey.footing, run.monkey.y]).toEqual(["ground", y - 20 * t.liftSpeed]);
    const other = riding(down);
    const y2 = other.monkey.y;
    step(other, 20);
    expect([other.monkey.footing, other.monkey.y]).toEqual(["ground", y2 + 20 * t.liftSpeed]);
  });

  test("the platforms loop: one carried off the top of an up shaft comes back at its bottom", () => {
    const { run } = quiet({ floor: 2 });
    const tops = (): number[] =>
      run
        .lifts()
        .filter((l) => l.x0 === up.x)
        .map((l) => l.y);
    const before = tops();
    step(run, Math.round((up.bottom - up.top) / t.liftSpeed));
    expect(tops()).toEqual(before);
    for (const y of tops()) expect(y >= up.top && y <= up.bottom).toBe(true);
  });

  test("riding a lift to the top of its shaft costs a life", () => {
    const run = riding(up);
    const lives = run.lives;
    until(run, () => run.phase !== "play", {}, 2000);
    expect([run.phase, run.lives]).toEqual(["dying", lives - 1]);
    expect(run.monkey.y).toBeLessThanOrEqual(up.top + 1);
  });

  test("the monkey steps off a lift onto a girder level with it", () => {
    const run = riding(up);
    // Ride up to the first island, then walk right onto it.
    until(run, () => Math.abs(run.monkey.y - 192) < t.liftSpeed);
    step(run, 30, { right: true });
    expect([run.phase, run.monkey.footing, run.monkey.y]).toEqual(["play", "ground", 192]);
    step(run, 200);
    expect(run.monkey.y).toBe(192);
  });

  test("the Gnome sends springs that bounce right along its girder and drop at a fixed x", () => {
    const { run } = quiet({ floor: 2 });
    const springs = elevatorFloor.springs;
    if (springs === undefined) throw new Error("no springs");
    run.gearTimer = 1;
    step(run, 1);
    run.gearTimer = Infinity;
    const [spring] = run.hazards;
    expect(spring).toMatchObject({ kind: "spring", y: springs.y, dir: 1 });
    let lowest = springs.y;
    let highest = springs.y;
    let x = spring?.x ?? 0;
    while ((spring?.x ?? 0) < springs.dropX) {
      step(run, 1);
      expect(spring?.x ?? 0).toBeGreaterThanOrEqual(x);
      x = spring?.x ?? 0;
      lowest = Math.max(lowest, spring?.y ?? 0);
      highest = Math.min(highest, spring?.y ?? 0);
    }
    // It bounces off the girder, never through it.
    expect(lowest).toBe(springs.y);
    expect(highest).toBeLessThan(springs.y - 8);
    until(run, () => (spring?.y ?? 0) > 200);
    expect(spring?.x).toBe(springs.dropX);
    until(run, () => !run.hazards.some((h) => h.kind === "spring"));
  });

  test("a spring falling on the monkey costs a life", () => {
    const { run } = quiet({ floor: 2 });
    const springs = elevatorFloor.springs;
    if (springs === undefined) throw new Error("no springs");
    run.monkey.x = springs.dropX;
    run.monkey.y = 192;
    run.hazards.push({ ...hazard("spring", springs.dropX, 120), footing: "air", vy: 2 });
    until(run, () => run.phase === "dying", {}, 100);
  });

  test("the Gnome throws embers onto it, as on the conveyor floor", () => {
    const { run } = quiet({ floor: 2 });
    run.emberTimer = 1;
    step(run, 1);
    expect(run.hazards.map((h) => h.kind)).toEqual(["ember"]);
  });

  test("reaching the door clears the floor", () => {
    const { run, sounds } = quiet({ floor: 2 });
    run.monkey.x = elevatorFloor.door.x - 4;
    run.monkey.y = elevatorFloor.door.y;
    step(run, 8, { right: true });
    expect(run.phase).toBe("clear");
    expect(sounds).toEqual(["floor"]);
  });
});

describe("landing on a slope", () => {
  test("a jump left from (94, 147) lands on the girder at y 142, not the one below", () => {
    const { run } = quiet();
    run.monkey.x = 94;
    run.monkey.y = 147;
    step(run, 1, { left: true, space: true });
    until(run, () => run.monkey.footing !== "air", { left: true });
    const girder = floors[0]?.girders.find((g) => g.y === 142);
    if (girder === undefined) throw new Error("no girder at y 142");
    expect([run.phase, run.lives, run.monkey.y]).toEqual(["play", 3, girderTop(girder, run.monkey.x)]);
  });

  test("jumping left or right in place on any sloped girder lands back on it", () => {
    floors.forEach((floor, f) => {
      for (const g of floor.girders) {
        if (g.drop === 0) continue;
        for (let x = g.x0; x < g.x1; x++) {
          for (const dir of [{ left: true }, { right: true }]) {
            const { run } = quiet({ floor: f });
            run.monkey.x = x;
            run.monkey.y = girderTop(g, x);
            step(run, 1, { ...dir, space: true });
            until(run, () => run.monkey.footing !== "air", {}, 200);
            const at = `floor ${f} girder ${g.x0}-${g.x1} x ${x} ${Object.keys(dir)[0]}`;
            // A jump carried past the girder's end is a real fall, not this bug (and may kill).
            if (run.monkey.x < g.x0 || run.monkey.x >= g.x1) continue;
            expect([at, run.monkey.y, run.lives, run.phase]).toEqual([at, girderTop(g, run.monkey.x), 3, "play"]);
          }
        }
      }
    });
  });

  test("a fall longer than maxFall onto a girder still kills", () => {
    const { run } = quiet();
    const girder = floors[0]?.girders.find((g) => g.y === 142);
    if (girder === undefined) throw new Error("no girder at y 142");
    run.monkey.x = 94;
    run.monkey.y = girderTop(girder, 94) - t.maxFall - 10;
    run.monkey.airTop = run.monkey.y;
    run.monkey.footing = "air";
    until(run, () => run.monkey.footing !== "air" || run.phase !== "play", {}, 200);
    expect(run.phase).toBe("dying");
  });

  test("walking off a girder's end still falls to the girder below", () => {
    const { run } = quiet();
    run.monkey.x = 200;
    run.monkey.y = 220;
    until(run, () => run.monkey.footing === "air", { right: true }, 100);
    const y0 = run.monkey.y;
    until(run, () => run.monkey.footing !== "air", {}, 200);
    expect(run.monkey.y).toBeGreaterThan(y0 + 8);
  });
});

/** Of `n` seeded trials, how many end with `took` true after `ticks` ticks of the run `setup` builds. */
function tally(n: number, ticks: number, setup: () => { run: Run; took: () => boolean }): number {
  let count = 0;
  for (let s = 1; s <= n; s++) {
    rng.seed(s);
    const { run, took } = setup();
    step(run, ticks);
    if (took()) count++;
  }
  return count;
}

/** A gear rolling right on the top girder towards the ladder at x 184, the monkey at height `monkeyY`. */
function gearAtLadder(monkeyY: number, loop = 0): { run: Run; took: () => boolean } {
  const { run } = quiet({ loop });
  run.monkey.y = monkeyY;
  run.monkey.footing = "climb"; // held still at that height
  const gear = hazard("gear", 180, 87);
  run.hazards = [gear];
  return { run, took: () => gear.footing === "climb" || gear.y > 100 };
}

/** `gearAtLadder` with the monkey below, a minute into the floor. */
function lateOnFloor(): { run: Run; took: () => boolean } {
  const g = gearAtLadder(248);
  g.run.floorTicks = 60 * 60;
  return g;
}

/** An ember walking right towards the ladder at x 184, at its head (`down`) or its foot. */
function emberAtLadder(down: boolean): { run: Run; took: () => boolean } {
  const { run } = quiet();
  run.monkey.y = 20;
  run.monkey.footing = "climb";
  const ember = hazard("ember", 184, down ? 87 : 111);
  run.hazards = [ember];
  return { run, took: () => ember.footing === "climb" };
}

describe("hazards steer towards the monkey", () => {
  test("a gear takes a ladder more often with the monkey below it than above it", () => {
    const below = tally(200, 10, () => gearAtLadder(248));
    const above = tally(200, 10, () => gearAtLadder(20));
    expect(below).toBeGreaterThan(above);
  });

  test("loop 2 sends gears down ladders more often than loop 0", () => {
    expect(tally(200, 10, () => gearAtLadder(248, 2))).toBeGreaterThan(tally(200, 10, () => gearAtLadder(248, 0)));
  });

  test("the chance of a gear taking a ladder rises with the time spent on the floor", () => {
    expect(tally(200, 10, lateOnFloor)).toBeGreaterThan(tally(200, 10, () => gearAtLadder(248)));
  });

  test("with the monkey above, an ember at a ladder foot climbs up more often than one at a ladder head climbs down", () => {
    expect(tally(200, 10, () => emberAtLadder(false))).toBeGreaterThan(tally(200, 10, () => emberAtLadder(true)));
  });

  test("an ember on the monkey's girder, walking away, turns and closes the gap", () => {
    const { run } = quiet();
    run.monkey.x = 40;
    const ember = hazard("ember", 120, 248, 1);
    run.hazards = [ember];
    step(run, 300);
    expect(Math.abs(ember.x - run.monkey.x)).toBeLessThan(80);
  });

  test("embers turn towards the monkey more often on later loops", () => {
    expect(t.emberTurnEveryFor(2)).toBeLessThan(t.emberTurnEveryFor(0));
  });

  test("the speed caps hold", () => {
    const late = t.tuningFor(0, 20);
    expect(late.gearSpeed).toBe(t.maxGearSpeed);
    expect(late.emberWalkSpeed).toBe(t.maxEmberWalkSpeed);
  });
});

/** The gears the Gnome sends on loop `loop` over `ticks` ticks. */
function sent(loop: number, ticks: number): Hazard[] {
  const { run } = quiet({ loop });
  run.monkey.footing = "climb"; // held out of the way
  run.monkey.y = 0;
  run.gearTimer = 1;
  const seen: Hazard[] = [];
  for (let n = 0; n < ticks; n++) {
    step(run, 1);
    for (const h of run.hazards) if (!seen.includes(h)) seen.push(h);
  }
  return seen;
}

describe("wild gears", () => {
  test("never appear on loop 0", () => {
    expect(sent(0, 3000).some((h) => h.wild)).toBe(false);
  });

  test("appear on a later loop", () => {
    expect(sent(2, 3000).some((h) => h.wild)).toBe(true);
  });

  test("only fall, through the girders, drifting towards the monkey, until they leave the bottom", () => {
    const { run } = quiet({ loop: 2 });
    run.monkey.footing = "climb";
    run.monkey.x = 180;
    run.monkey.y = 0;
    const gear: Hazard = { ...hazard("gear", 61, 84), wild: true, footing: "air" };
    run.hazards = [gear];
    let y = gear.y;
    let x = gear.x;
    while (run.hazards.includes(gear)) {
      step(run, 1);
      expect(gear.y).toBeGreaterThanOrEqual(y);
      expect(gear.footing).toBe("air");
      expect(Math.abs(gear.x - 180)).toBeLessThanOrEqual(Math.abs(x - 180));
      y = gear.y;
      x = gear.x;
    }
    expect(y).toBeGreaterThan(run.currentFloor().height);
  });

  test("score when jumped", () => {
    const { run, sounds } = quiet({ loop: 2 });
    // Falling through the girder just under the monkey's feet.
    const gear: Hazard = { ...hazard("gear", run.monkey.x, run.monkey.y + 12), wild: true, footing: "air" };
    run.hazards = [gear];
    step(run, 1, { space: true });
    expect(sounds).toContain("hazard");
    expect(run.score).toBe(100);
  });
});
