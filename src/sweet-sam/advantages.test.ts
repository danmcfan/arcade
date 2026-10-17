import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import { addSoundListener } from "../engine/audio.ts";
import { blueFramesDuration } from "./constants.ts";
import { levelValues } from "./levels.ts";
import { velocityPlayerNormal, velocityPlayerPower } from "./entity.ts";
import {
  sweetSamAdvantages,
  honeyJarExtraLives,
  noAdvantages,
  runningShoesPlayerVelocity,
  sleepyBeesFactor,
  startingLives,
} from "./advantages.ts";
import { minigame } from "../game/minigames.ts";
import { SweetSamSoftware } from "./software.ts";
import type { ItemSetup } from "./level.ts";
import type { PrizeId } from "../arcade/prizes.ts";

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
      return { ...it, x: bear.x - advantages.playerVelocity, y: bear.y };
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
    expect(noAdvantages).toEqual({ lives: 3, playerVelocity: 1.0, sleepyFactor: 1 });
    expect([startingLives, velocityPlayerNormal, blueFramesDuration]).toEqual([3, 1.0, 600]);
  });

  test("each prize changes only its own value", () => {
    expect(sweetSamAdvantages(["honeyJar"])).toEqual({ ...noAdvantages, lives: 4 });
    expect(sweetSamAdvantages(["runningShoes"])).toEqual({ ...noAdvantages, playerVelocity: 1.125 });
    expect(sweetSamAdvantages(["sleepyBees"])).toEqual({ ...noAdvantages, sleepyFactor: 1.5 });
    expect(sweetSamAdvantages(["honeyJar", "runningShoes", "sleepyBees"])).toEqual({
      lives: 4,
      playerVelocity: 1.125,
      sleepyFactor: 1.5,
    });
  });

  test("the effect sizes are small: one life, the power-pellet speed, half as much sleepy time again", () => {
    expect(honeyJarExtraLives).toBe(1);
    expect(runningShoesPlayerVelocity).toBe(velocityPlayerPower);
    expect(sleepyBeesFactor).toBe(1.5);
  });
});

describe("Sweet Sam with prizes", () => {
  test("no prizes: 3 lives, the bear at 1.0, power pellets scare for 600 ticks", () => {
    const s = playing([]);
    expect(s.snapshot().lives).toBe(3);
    expect(s.snapshot().player.velocity).toBe(1.0);
    expect(eatPowerPellet([])).toBe(600);
  });

  test("honey jar: a run starts with 4 lives", () => {
    const s = minigame("sweetSam").create({ highScore: 0, prizes: ["honeyJar"] });
    if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create did not return a SweetSamSoftware");
    expect(s.snapshot().lives).toBe(4);
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

  test("sleepy bees: smoke pots make the bees sleepy for 900 ticks (15 s) on level 1", () => {
    expect(eatPowerPellet(["sleepyBees"])).toBe(900);
  });

  test("sleepy bees: 1.5 times a later level's sleepy time", () => {
    expect(levelValues(3).sleepyFrames).toBe(480);
    expect(eatPowerPellet([], 3)).toBe(480);
    expect(eatPowerPellet(["sleepyBees"], 3)).toBe(720);
  });
});
