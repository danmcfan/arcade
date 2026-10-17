import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import { addSoundListener } from "../engine/audio.ts";
import { levelValues } from "./levels.ts";
import { velocityPlayerNormal, velocityPlayerPower } from "./entity.ts";
import {
  sweetSamAdvantages,
  honeyJarExtraLives,
  noAdvantages,
  runningShoesSpeedFactor,
  sleepyBeesFactor,
  startingLives,
} from "./advantages.ts";
import { minigame } from "../game/minigames.ts";
import { SweetSamSoftware } from "./software.ts";
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

/** Put a power pellet where the bear is about to step, step once, and return the red bee's scared ticks. */
function eatPowerPellet(s: SweetSamSoftware): number {
  const idx = s.items.findIndex((i) => i?.powerPellet === true);
  const power = s.items[idx];
  if (!power) throw new Error("no power pellet");
  // The bear is heading left: it reaches the pellet this tick.
  power.x = s.player.x - s.player.velocity;
  power.y = s.player.y;
  s.update(NO_INPUT);
  expect(s.items[idx]).toBeNull();
  const red = s.enemies[0];
  if (!red) throw new Error("no red bee");
  return red.blueFrames;
}

describe("sweetSamAdvantages", () => {
  test("with no prizes, the original game: 3 lives, speed 1.0, each level's sleepy time as it is", () => {
    expect(sweetSamAdvantages([])).toEqual(noAdvantages);
    expect(noAdvantages).toEqual({ lives: 3, playerSpeedFactor: 1, sleepyFactor: 1 });
    expect([startingLives, velocityPlayerNormal]).toEqual([3, 1.0]);
  });

  test("each prize changes only its own value", () => {
    expect(sweetSamAdvantages(["honeyJar"])).toEqual({ ...noAdvantages, lives: 4 });
    expect(sweetSamAdvantages(["runningShoes"])).toEqual({ ...noAdvantages, playerSpeedFactor: 1.125 });
    expect(sweetSamAdvantages(["sleepyBees"])).toEqual({ ...noAdvantages, sleepyFactor: 1.5 });
  });

  test("the effect sizes are small: one life, 12.5% faster, half as much sleepy time again", () => {
    expect(honeyJarExtraLives).toBe(1);
    expect(runningShoesSpeedFactor).toBe(1.125);
    expect(sleepyBeesFactor).toBe(1.5);
  });
});

describe("Sweet Sam with prizes", () => {
  test("no prizes: 3 lives, the bear at 1.0, power pellets scare for 360 ticks (6 s)", () => {
    const s = playing([]);
    expect(s.snapshot().lives).toBe(3);
    expect(s.player.velocity).toBe(1.0);
    expect(eatPowerPellet(s)).toBe(360);
  });

  test("honey jar: a run starts with 4 lives", () => {
    const s = minigame("sweetSam").create({ highScore: 0, prizes: ["honeyJar"] });
    if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create did not return a SweetSamSoftware");
    expect(s.snapshot().lives).toBe(4);
  });

  test("running shoes: the bear moves at 1.125 px a tick, and still turns at corners", () => {
    const s = playing(["runningShoes"]);
    expect(s.player.velocity).toBe(1.125);
    const x = s.player.x;
    s.update({ ...NO_INPUT, left: true });
    expect(s.player.x).toBe(x - 1.125);
    // Run a while holding up: the bear turns off the start row at a corner.
    for (let k = 0; k < 120; k++) s.update({ ...NO_INPUT, up: true });
    expect(s.player.direction).toBe("UP");
    expect(s.player.y).toBeLessThan(212);
  });

  test("running shoes: power-pellet speed is unchanged", () => {
    const s = playing(["runningShoes"]);
    const red = s.enemies[0];
    if (!red) throw new Error("no red bee");
    red.blueFrames = 300;
    s.update(NO_INPUT);
    expect(s.player.velocity).toBe(velocityPlayerPower);
  });

  test("running shoes: 12.5% faster on later levels too, and never slower while bees are sleepy", () => {
    const s = playing(["runningShoes"]);
    s.level = 5;
    s.update(NO_INPUT);
    expect(s.player.velocity).toBe(1.25 * 1.125);
    const red = s.enemies[0];
    if (!red) throw new Error("no red bee");
    red.blueFrames = 300;
    s.update(NO_INPUT);
    expect(s.player.velocity).toBe(1.25 * 1.125);
  });

  test("sleepy bees: smoke pots make the bees sleepy for 540 ticks (9 s) on level 1", () => {
    const s = playing(["sleepyBees"]);
    expect(eatPowerPellet(s)).toBe(540);
  });

  test("sleepy bees: 1.5 times a later level's sleepy time", () => {
    const plain = playing([]);
    plain.level = 3;
    const sleepy = playing(["sleepyBees"]);
    sleepy.level = 3;
    expect(levelValues(3).sleepyFrames).toBe(240);
    expect(eatPowerPellet(plain)).toBe(240);
    expect(eatPowerPellet(sleepy)).toBe(360);
  });
});
