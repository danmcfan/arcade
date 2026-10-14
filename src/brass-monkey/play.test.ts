import { beforeEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { ticketsFor } from "../arcade/wallet.ts";
import { conveyorFloor } from "./floors.ts";
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
  jumpedIn: 0,
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
    expect(run.tuning.emberSpeed).toBeGreaterThan(easy.emberSpeed);
  });

  test("the bonus never starts below its floor, nor hazards come too often", () => {
    const hard = t.tuningFor(0, 20);
    expect(hard.bonusStart).toBe(t.minBonusStart);
    expect(hard.gearEvery).toBe(t.minSpawnEvery);
  });
});
