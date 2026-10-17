import { beforeEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { PrizeId } from "../game/minigames.ts";
import {
  brassMonkeyAdvantages,
  noAdvantages,
  pocketWatchBonusTicks,
  springBootsJumpSpeed,
  umbrellaHits,
} from "./advantages.ts";
import { floors, girderTop } from "./floors.ts";
import { BrassMonkeySoftware } from "./game.ts";
import { minigame } from "../game/minigames.ts";
import { Run, type Hazard } from "./play.ts";
import * as t from "./tuning.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });

beforeEach(() => {
  rng.seed(1);
});

/** A run with these prizes and no hazards coming. */
function quiet(prizes: readonly PrizeId[]): Run {
  const run = new Run({ advantages: brassMonkeyAdvantages(prizes) });
  run.gearTimer = Infinity;
  run.emberTimer = Infinity;
  return run;
}

/** How far a jump from the flat bottom girder rises, and whether the monkey lands back alive. */
function jumpRise(prizes: readonly PrizeId[]): { rise: number; lives: number; landedAt: number } {
  const run = quiet(prizes);
  const y0 = run.monkey.y;
  let top = y0;
  run.update(held({ space: true }));
  for (let n = 0; n < 60 && run.monkey.footing === "air"; n++) {
    top = Math.min(top, run.monkey.y);
    run.update(NO_INPUT);
  }
  return { rise: y0 - top, lives: run.lives, landedAt: run.monkey.y };
}

/** Ticks the bonus takes to drop its first step. */
function firstBonusStep(prizes: readonly PrizeId[]): number {
  const run = quiet(prizes);
  const start = run.bonus;
  let n = 0;
  while (run.bonus === start && n < 1000) {
    run.update(NO_INPUT);
    n++;
  }
  return n;
}

describe("Brass Monkey with no prizes", () => {
  test("matches #39's tuning: 3 lives, a 15 px jump, the bonus drops every 120 ticks", () => {
    expect(brassMonkeyAdvantages([])).toEqual(noAdvantages);
    expect(noAdvantages).toEqual({
      lives: t.startLives,
      umbrellas: 0,
      jumpSpeed: t.jumpSpeed,
      bonusTicks: t.bonusTicks,
    });
    expect(quiet([]).lives).toBe(3);
    expect(jumpRise([]).rise).toBe(15);
    expect(firstBonusStep([])).toBe(120);
  });
});

/** A gear rolling on the bottom girder, touching the monkey. */
function gearOn(run: Run): Hazard {
  return {
    kind: "gear",
    x: run.monkey.x + 4,
    y: run.monkey.y,
    dir: -1,
    vy: 0,
    footing: "ground",
    ladder: null,
    climbDir: 1,
    scorableIn: 0,
    hot: false,
    wild: false,
  };
}

describe("umbrella", () => {
  test("the first hazard to touch the monkey bounces off and is gone; the second costs a life", () => {
    expect(umbrellaHits).toBe(1);
    const sounds: string[] = [];
    const run = new Run({
      advantages: brassMonkeyAdvantages(["umbrella"]),
      onSound: (s): void => {
        sounds.push(s);
      },
    });
    run.gearTimer = Infinity;
    run.emberTimer = Infinity;
    expect(run.lives).toBe(3);
    expect(run.umbrellas).toBe(1);

    run.hazards = [gearOn(run)];
    run.update(NO_INPUT);
    expect([run.phase, run.lives, run.hazards.length, run.umbrellas]).toEqual(["play", 3, 0, 0]);
    expect(sounds).toContain("stomp");
    // The umbrella pops up over the monkey, then goes.
    expect(run.umbrellaPop).toBe(t.umbrellaPopTicks);
    for (let n = 0; n < t.umbrellaPopTicks; n++) run.update(NO_INPUT);
    expect(run.umbrellaPop).toBe(0);

    run.hazards = [gearOn(run)];
    run.update(NO_INPUT);
    expect([run.phase, run.lives]).toEqual(["dying", 2]);
  });

  test("without it, the first hazard costs a life", () => {
    const run = quiet([]);
    run.hazards = [gearOn(run)];
    run.update(NO_INPUT);
    expect(run.phase).toBe("dying");
  });

  test("it lasts the run: a lost life does not bring it back", () => {
    const run = quiet(["umbrella"]);
    run.umbrellas = 0;
    run.hazards = [gearOn(run)];
    run.update(NO_INPUT);
    expect(run.phase).toBe("dying");
    expect(run.umbrellas).toBe(0);
    const sw = minigame("brassMonkey").create({ highScore: 0, prizes: ["umbrella"] });
    expect(sw instanceof BrassMonkeySoftware && sw.run.umbrellas).toBe(1);
  });
});

describe("spring boots", () => {
  test("the monkey jumps higher, 19.125 px rather than 15, and lands back where it jumped", () => {
    expect(springBootsJumpSpeed).toBeGreaterThan(t.jumpSpeed);
    expect(jumpRise(["springBoots"])).toEqual({ rise: 19.125, lives: 3, landedAt: 248 });
  });

  test("the higher jump can't reach the girder above anywhere, nor kill on landing", () => {
    const rise = jumpRise(["springBoots"]).rise;
    expect(rise).toBeLessThanOrEqual(t.maxFall);
    for (const floor of floors) {
      for (let x = 6; x <= floor.width - 6; x++) {
        const tops = floor.girders
          .filter((g) => x >= g.x0 && x < g.x1)
          .map((g) => girderTop(g, x))
          .toSorted((a, b) => a - b);
        for (let k = 1; k < tops.length; k++) {
          const gap = (tops[k] ?? 0) - (tops[k - 1] ?? 0);
          expect({ x, gap, clear: gap > rise }).toEqual({ x, gap, clear: true });
        }
      }
    }
  });
});

describe("pocket watch", () => {
  test("the bonus counts down more slowly: a step every 180 ticks rather than 120", () => {
    expect(pocketWatchBonusTicks).toBeGreaterThan(t.bonusTicks);
    expect(firstBonusStep(["pocketWatch"])).toBe(180);
  });
});
