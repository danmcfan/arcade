import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import { addSoundListener } from "../engine/audio.ts";
import { blueFramesDuration, framesPerSecond } from "./constants.ts";
import { velocityPlayerNormal, velocityPlayerPower } from "./entity.ts";
import {
  sweetSamAdvantages,
  honeyJarExtraLives,
  noAdvantages,
  runningShoesPlayerVelocity,
  sleepyBeesBlueFrames,
  startingLives,
} from "./advantages.ts";
import { createSweetSam } from "./index.ts";
import { SweetSamSoftware } from "./software.ts";
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
  const s = createSweetSam(0, prizes);
  if (!(s instanceof SweetSamSoftware)) throw new Error("createSweetSam did not return a SweetSamSoftware");
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
  power.x = s.player.x - s.advantages.playerVelocity;
  power.y = s.player.y;
  s.update(NO_INPUT);
  expect(s.items[idx]).toBeNull();
  const red = s.enemies[0];
  if (!red) throw new Error("no red bee");
  return red.blueFrames;
}

describe("sweetSamAdvantages", () => {
  test("with no prizes, the original game: 3 lives, speed 1.0, 10 s of scared bees", () => {
    expect(sweetSamAdvantages([])).toEqual(noAdvantages);
    expect(noAdvantages).toEqual({ lives: 3, playerVelocity: 1.0, blueFrames: 600 });
    expect([startingLives, velocityPlayerNormal, blueFramesDuration]).toEqual([3, 1.0, 600]);
  });

  test("each prize changes only its own value", () => {
    expect(sweetSamAdvantages(["honeyJar"])).toEqual({ ...noAdvantages, lives: 4 });
    expect(sweetSamAdvantages(["runningShoes"])).toEqual({ ...noAdvantages, playerVelocity: 1.125 });
    expect(sweetSamAdvantages(["sleepyBees"])).toEqual({ ...noAdvantages, blueFrames: 900 });
    expect(sweetSamAdvantages(["honeyJar", "runningShoes", "sleepyBees"])).toEqual({
      lives: 4,
      playerVelocity: 1.125,
      blueFrames: 900,
    });
  });

  test("the effect sizes are small: one life, the power-pellet speed, 5 more seconds", () => {
    expect(honeyJarExtraLives).toBe(1);
    expect(runningShoesPlayerVelocity).toBe(velocityPlayerPower);
    expect(sleepyBeesBlueFrames).toBe(framesPerSecond * 15);
  });
});

describe("Sweet Sam with prizes", () => {
  test("no prizes: 3 lives, the bear at 1.0, power pellets scare for 600 ticks", () => {
    const s = playing([]);
    expect(s.snapshot().lives).toBe(3);
    expect(s.player.velocity).toBe(1.0);
    expect(eatPowerPellet(s)).toBe(600);
  });

  test("honey jar: a run starts with 4 lives", () => {
    const s = createSweetSam(0, ["honeyJar"]);
    if (!(s instanceof SweetSamSoftware)) throw new Error("createSweetSam did not return a SweetSamSoftware");
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

  test("sleepy bees: power pellets scare the bees for 900 ticks", () => {
    const s = playing(["sleepyBees"]);
    expect(eatPowerPellet(s)).toBe(900);
  });
});
