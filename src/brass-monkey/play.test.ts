import { beforeEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { ticketsFor } from "../arcade/wallet.ts";
import { conveyorFloor, floors, girderTop } from "./floors.ts";
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
});

/** A quiet run with the monkey standing on the girder floor's first wrench. */
function holding(): { run: Run; sounds: RunSound[] } {
  const q = quiet();
  const [spot] = q.run.currentFloor().wrenches;
  if (spot === undefined) throw new Error("the girder floor has no wrench");
  q.run.monkey.x = spot.x;
  q.run.monkey.y = spot.y;
  step(q.run, 1);
  return q;
}

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

  test("a gear on a conveyor rolls the way the belt runs", () => {
    const { run } = quiet({ floor: 1 });
    const gear = hazard("gear", 180, 100);
    gear.footing = "air";
    run.hazards = [gear];
    until(run, () => gear.footing === "ground");
    expect([gear.y, gear.dir]).toEqual([128, -1]);
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
    expect(run.score).toBe(300);
    expect(sounds).toEqual(["bolt"]);
    step(run, 8, { left: true });
    expect(run.score).toBe(300);
  });

  test("a bolt scores 300 on loop 0, 500 on loop 1 and 800 from loop 2", () => {
    expect([0, 1, 2, 3, 7].map((l) => t.boltPointsFor(l))).toEqual([300, 500, 800, 800, 800]);
    const { run } = quiet({ loop: 1 });
    run.monkey.x = 56;
    run.monkey.y = 211;
    step(run, 8, { right: true });
    expect(run.score).toBe(500);
  });

  test("a bolt shows its points where it was picked up, briefly", () => {
    const { run } = quiet();
    run.monkey.x = 56;
    run.monkey.y = 211;
    step(run, 8, { right: true });
    expect(run.popups.map(({ x, y, points }) => ({ x, y, points }))).toEqual([{ x: 64, y: 212, points: 300 }]);
    step(run, t.popupTicks);
    expect(run.popups).toEqual([]);
  });

  test("a collected bolt comes back when the floor restarts", () => {
    const { run } = quiet();
    run.monkey.x = 56;
    run.monkey.y = 211;
    step(run, 8, { right: true });
    expect(run.bolts[0]).toBe(true);
    run.startFloor();
    expect(run.bolts[0]).toBe(false);
    expect(run.popups).toEqual([]);
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

describe("the wrench", () => {
  test("each floor has two wrenches, standing on a girder", () => {
    for (const floor of floors) {
      expect(floor.wrenches).toHaveLength(2);
      for (const w of floor.wrenches)
        expect(floor.girders.some((g) => w.x >= g.x0 && w.x < g.x1 && girderTop(g, w.x) === w.y)).toBe(true);
    }
  });

  test("picking one up starts the timer and takes it off the floor until the floor restarts", () => {
    const { run } = holding();
    expect(run.monkey.wrench).toBe(t.wrenchTicks);
    expect(run.wrenches).toEqual([true, false]);
    run.startFloor();
    expect([run.monkey.wrench, ...run.wrenches]).toEqual([0, false, false]);
  });

  test("while held, Space doesn't jump and up and down don't climb", () => {
    const { run, sounds } = holding();
    step(run, 1, { space: true });
    expect([run.monkey.footing, sounds]).toEqual(["ground", []]);
    const ladder = run.currentFloor().ladders.find((l) => l.x === 32 && l.bottom === 209);
    run.monkey.x = (ladder?.x ?? 0) + 4;
    run.monkey.y = 210;
    step(run, 5, { up: true });
    expect(run.monkey.footing).toBe("ground");
    step(run, 5, { right: true });
    expect(run.monkey.x).toBe(41);
  });

  test("runs out after the tuned number of ticks, then the monkey jumps again", () => {
    const { run } = holding();
    step(run, t.wrenchTicks - 1);
    expect(run.monkey.wrench).toBe(1);
    expect(run.wrenchFlashing()).toBe(true);
    step(run, 1);
    expect([run.monkey.wrench, run.wrenchFlashing()]).toEqual([0, false]);
    step(run, 1, { space: true });
    expect(run.monkey.footing).toBe("air");
  });

  test("flashes only in its last ticks", () => {
    const { run } = holding();
    run.monkey.wrench = t.wrenchFlashTicks + 1;
    expect(run.wrenchFlashing()).toBe(false);
    run.monkey.wrench = t.wrenchFlashTicks;
    expect(run.wrenchFlashing()).toBe(true);
  });

  test("the raised swing also smashes a hazard over the monkey's head, the lowered swing does not", () => {
    const { run } = holding();
    run.monkey.left = false;
    run.ticks = 0;
    run.hazards = [hazard("gear", run.monkey.x + 4, run.monkey.y - 20, -1)];
    step(run, 1);
    expect([run.hazards.length, run.smashes.length]).toEqual([0, 1]);
    const lowered = holding().run;
    lowered.monkey.left = false;
    lowered.ticks = 8;
    lowered.hazards = [hazard("gear", lowered.monkey.x + 4, lowered.monkey.y - 20, 1)];
    step(lowered, 1);
    expect([lowered.hazards.length, lowered.smashes.length]).toEqual([1, 0]);
  });

  test("a gear or an ember it hits is smashed for 300, 500 or 800, seeded, and doesn't kill", () => {
    const scores = new Set<number>();
    for (const kind of ["gear", "ember"] as const) {
      for (let s = 1; s <= 12; s++) {
        rng.seed(s);
        const { run, sounds } = holding();
        run.monkey.left = false;
        run.hazards = [hazard(kind, run.monkey.x + 10, run.monkey.y, -1)];
        step(run, 1);
        expect([run.phase, run.hazards.length, sounds]).toEqual(["play", 0, ["smash"]]);
        expect(t.smashPoints.some((p) => p === run.score)).toBe(true);
        expect(run.smashes).toMatchObject([{ points: run.score }]);
        scores.add(run.score);
      }
    }
    expect([...scores].toSorted((a, b) => a - b)).toEqual([...t.smashPoints]);
    rng.seed(3);
    const a = holding().run;
    a.hazards = [hazard("gear", a.monkey.x + 10, a.monkey.y, -1)];
    step(a, 1);
    rng.seed(3);
    const b = holding().run;
    b.hazards = [hazard("gear", b.monkey.x + 10, b.monkey.y, -1)];
    step(b, 1);
    expect(a.score).toBe(b.score);
  });

  test("a hazard that reaches the monkey from behind still kills it", () => {
    const { run } = holding();
    run.monkey.left = false;
    run.hazards = [hazard("gear", run.monkey.x - 6, run.monkey.y, 1)];
    step(run, 1);
    expect(run.phase).toBe("dying");
  });

  test("losing a life drops it", () => {
    const { run } = holding();
    run.monkey.left = false;
    run.hazards = [hazard("gear", run.monkey.x - 6, run.monkey.y, 1)];
    step(run, t.dyingTicks + 1);
    expect([run.phase, run.monkey.wrench, ...run.wrenches]).toEqual(["play", 0, false, false]);
  });
});

describe("the escape and the next loop", () => {
  test("after the conveyor floor the escaped scene plays, then the girder floor again, harder", () => {
    const { run, sounds } = quiet({ floor: 1 });
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
