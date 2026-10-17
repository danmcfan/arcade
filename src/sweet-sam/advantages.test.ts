import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import { addSoundListener } from "../engine/audio.ts";
import { levelValues } from "./levels.ts";
import { velocityPlayerNormal, velocityPlayerPower } from "./entity.ts";
import {
  sweetSamAdvantages,
  noAdvantages,
  runningShoesSpeedFactor,
  sleepyBeesFactor,
  smokeBombUses,
  smokeTicks,
  smokeWarningTicks,
  startingLives,
} from "./advantages.ts";
import { minigame } from "../game/minigames.ts";
import { SweetSamSoftware } from "./software.ts";
import type { ItemSetup } from "./level.ts";
import type { PrizeId } from "../game/minigames.ts";

let unsubscribe = (): void => {};
beforeEach(() => {
  rng.seed(1);
  unsubscribe = addSoundListener(() => {});
});
afterEach(() => {
  unsubscribe();
});

/** Sweet Sam with these prizes, advanced past READY into PLAY. */
function playing(prizes: readonly PrizeId[]): SweetSamSoftware {
  const s = minigame("sweetSam").create({ highScore: 0, prizes });
  if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create did not return a SweetSamSoftware");
  for (let k = 0; k < 122; k++) s.update(NO_INPUT);
  expect(s.snapshot().state).toBe("PLAY");
  return s;
}

/**
 * On `level` with these prizes, put a power pellet where the bear is about to
 * step, step once, and return the red bee's scared ticks.
 */
function eatPowerPellet(prizes: readonly PrizeId[], level = 1): number {
  const advantages = sweetSamAdvantages(prizes);
  const bear = new SweetSamSoftware(0, advantages).level.player();
  let placed = false;
  const s = new SweetSamSoftware(0, advantages, {
    level,
    // The bear is heading left: it reaches the pellet this tick.
    items: (it): ItemSetup => {
      if (!it.power || placed) return it;
      placed = true;
      return { ...it, x: bear.x - levelValues(level).bearVelocity * advantages.playerSpeedFactor, y: bear.y };
    },
  });
  s.update(NO_INPUT);
  const snap = s.snapshot();
  expect(snap.items).toBe(243);
  return snap.enemies[0]?.blue ?? -1;
}

describe("sweetSamAdvantages", () => {
  test("with no prizes, the original game: 3 lives, speed 1.0, each level's sleepy time as it is", () => {
    expect(sweetSamAdvantages([])).toEqual(noAdvantages);
    expect(noAdvantages).toEqual({ lives: 3, smokeBombs: 0, playerSpeedFactor: 1, sleepyFactor: 1 });
    expect([startingLives, velocityPlayerNormal]).toEqual([3, 1.0]);
  });

  test("each prize changes only its own value", () => {
    expect(sweetSamAdvantages(["smokeBomb"])).toEqual({ ...noAdvantages, smokeBombs: 1 });
    expect(sweetSamAdvantages(["runningShoes"])).toEqual({ ...noAdvantages, playerSpeedFactor: 1.125 });
    expect(sweetSamAdvantages(["sleepyBees"])).toEqual({ ...noAdvantages, sleepyFactor: 1.5 });
  });

  test("the effect sizes are small: one life, 12.5% faster, half as much sleepy time again", () => {
    expect(smokeBombUses).toBe(1);
    expect(runningShoesSpeedFactor).toBe(1.125);
    expect(sleepyBeesFactor).toBe(1.5);
  });
});

describe("Sweet Sam with prizes", () => {
  test("no prizes: 3 lives, the bear at 1.0, power pellets scare for 360 ticks (6 s)", () => {
    const s = playing([]);
    expect(s.snapshot().lives).toBe(3);
    expect(s.snapshot().player.velocity).toBe(1.0);
    expect(eatPowerPellet([])).toBe(360);
  });

  test("smoke bomb: a run still starts with 3 lives, and one bomb", () => {
    const s = playing(["smokeBomb"]);
    expect(s.snapshot().lives).toBe(3);
    expect(s.level.smoke()).toEqual({ bombs: 1, ticks: 0 });
  });

  test("smoke bomb: the action button hides the bear for 300 ticks (5 s, level 2's sleepy time)", () => {
    expect(smokeTicks).toBe(300);
    expect(smokeTicks).toBe(levelValues(2).sleepyFrames);
    const s = playing(["smokeBomb"]);
    s.update({ ...NO_INPUT, space: true });
    expect(s.level.smoke()).toEqual({ bombs: 0, ticks: smokeTicks });
    // Held down, it doesn't go off again; it counts down.
    s.update({ ...NO_INPUT, space: true });
    expect(s.level.smoke()).toEqual({ bombs: 0, ticks: smokeTicks - 1 });
  });

  test("smoke bomb: a bee on the bear passes through it", () => {
    const smoked = new SweetSamSoftware(0, sweetSamAdvantages(["smokeBomb"]), { bees: [{ onPlayer: true }] });
    smoked.update({ ...NO_INPUT, space: true });
    for (let k = 0; k < 30; k++) smoked.update(NO_INPUT);
    expect([smoked.snapshot().state, smoked.snapshot().lives]).toEqual(["PLAY", 3]);

    const plain = new SweetSamSoftware(0, sweetSamAdvantages(["smokeBomb"]), { bees: [{ onPlayer: true }] });
    plain.update(NO_INPUT);
    expect(plain.snapshot().state).not.toBe("PLAY");
  });

  test("smoke bomb: the bear can't eat a sleepy bee through the smoke", () => {
    const s = new SweetSamSoftware(0, sweetSamAdvantages(["smokeBomb"]), {
      bees: [{ onPlayer: true, blueFrames: 300 }],
    });
    s.update({ ...NO_INPUT, space: true });
    expect(s.snapshot().state).toBe("PLAY");
    expect(s.score()).toBe(0);
  });

  test("smoke bomb: grey while it lasts, flashing back into colour over its last second", () => {
    expect(smokeWarningTicks).toBe(60);
    const s = playing(["smokeBomb"]);
    expect(s.level.smoked()).toBe(false);
    s.update({ ...NO_INPUT, space: true });
    const looks: boolean[] = [];
    while (s.level.smoke().ticks > 0) {
      looks.push(s.level.smoked());
      s.update(NO_INPUT);
    }
    expect(looks).toHaveLength(smokeTicks);
    expect(looks.slice(0, smokeTicks - smokeWarningTicks).every(Boolean)).toBe(true);
    const warning = looks.slice(smokeTicks - smokeWarningTicks);
    expect(warning).toContain(true);
    expect(warning).toContain(false);
    expect(s.level.smoked()).toBe(false);
  });

  test("smoke bomb: one a life; a lost life brings it back", () => {
    const s = new SweetSamSoftware(0, sweetSamAdvantages(["smokeBomb"]), { bees: [{ onPlayer: true }] });
    s.update({ ...NO_INPUT, space: true });
    s.update(NO_INPUT);
    s.update({ ...NO_INPUT, space: true });
    expect(s.level.smoke().bombs).toBe(0);
    // Once the smoke clears the bees catch the bear, and the next life has its bomb back.
    for (let k = 0; k < 5000 && s.snapshot().lives === 3; k++) s.update(NO_INPUT);
    expect(s.snapshot().lives).toBe(2);
    for (let k = 0; k < 1000 && s.snapshot().state !== "PLAY"; k++) s.update(NO_INPUT);
    expect(s.level.smoke()).toEqual({ bombs: 1, ticks: 0 });
  });

  test("running shoes: the bear moves at 1.125 px a tick, and still turns at corners", () => {
    const s = playing(["runningShoes"]);
    expect(s.snapshot().player.velocity).toBe(1.125);
    const x = s.snapshot().player.x;
    s.update({ ...NO_INPUT, left: true });
    expect(s.snapshot().player.x).toBe(x - 1.125);
    // Run a while holding up: the bear turns off the start row at a corner.
    for (let k = 0; k < 120; k++) s.update({ ...NO_INPUT, up: true });
    expect(s.snapshot().player.dir).toBe("UP");
    expect(s.snapshot().player.y).toBeLessThan(212);
  });

  test("running shoes: power-pellet speed is unchanged", () => {
    const s = new SweetSamSoftware(0, sweetSamAdvantages(["runningShoes"]), { bees: [{ blueFrames: 300 }] });
    s.update(NO_INPUT);
    expect(s.snapshot().player.velocity).toBe(velocityPlayerPower);
  });

  test("running shoes: 12.5% faster on later levels too, and never slower while bees are sleepy", () => {
    const shoes = sweetSamAdvantages(["runningShoes"]);
    let s = new SweetSamSoftware(0, shoes, { level: 5 });
    s.update(NO_INPUT);
    expect(s.snapshot().player.velocity).toBe(1.25 * 1.125);
    s = new SweetSamSoftware(0, shoes, { level: 5, bees: [{ blueFrames: 300 }] });
    s.update(NO_INPUT);
    expect(s.snapshot().player.velocity).toBe(1.25 * 1.125);
  });

  test("sleepy bees: smoke pots make the bees sleepy for 540 ticks (9 s) on level 1", () => {
    expect(eatPowerPellet(["sleepyBees"])).toBe(540);
  });

  test("sleepy bees: 1.5 times a later level's sleepy time", () => {
    expect(levelValues(3).sleepyFrames).toBe(240);
    expect(eatPowerPellet([], 3)).toBe(240);
    expect(eatPowerPellet(["sleepyBees"], 3)).toBe(360);
  });
});
