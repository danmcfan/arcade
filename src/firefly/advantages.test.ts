import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { addSoundListener } from "../engine/audio.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { PrizeId } from "../game/minigames.ts";
import {
  fireflyAdvantages,
  firecrackerUses,
  glowStickMaxSparks,
  noAdvantages,
  wingsPlayerSpeed,
} from "./advantages.ts";
import { FireflySoftware } from "./game.ts";
import { minigame } from "../game/minigames.ts";
import { maxSparks, playerSpeed, stageIntroTicks, startLives } from "./rules.ts";

let unsubscribe = (): void => {};
beforeEach(() => {
  rng.seed(1);
  unsubscribe = addSoundListener(() => {});
});
afterEach(() => {
  unsubscribe();
});

function run(prizes: readonly PrizeId[]): FireflySoftware {
  const f = minigame("firefly").create({ highScore: 0, prizes });
  if (!(f instanceof FireflySoftware)) throw new Error("Firefly's create did not return a FireflySoftware");
  // The firefly is held through the start theme.
  for (let k = 0; k < stageIntroTicks; k++) f.update(NO_INPUT);
  return f;
}

/** The most sparks on the screen at once while Space is held for a second. */
function mostSparks(f: FireflySoftware): number {
  let most = 0;
  for (let k = 0; k < 60; k++) {
    f.update({ ...NO_INPUT, space: true });
    most = Math.max(most, f.sparks.length);
  }
  return most;
}

/** How far the firefly moves left in 10 ticks. */
function stride(f: FireflySoftware): number {
  const x = f.player.x;
  const left: Input = { ...NO_INPUT, left: true };
  for (let k = 0; k < 10; k++) f.update(left);
  return x - f.player.x;
}

describe("Firefly prize advantages", () => {
  test("no prizes: the game's own values (3 lives, 2 sparks, 2 px a tick)", () => {
    expect(fireflyAdvantages([])).toEqual({ lives: 3, firecrackers: 0, maxSparks: 2, playerSpeed: 2 });
    expect(noAdvantages).toEqual({ lives: startLives, firecrackers: 0, maxSparks, playerSpeed });
    const f = run([]);
    expect(f.lives).toBe(3);
    expect(mostSparks(f)).toBe(2);
    expect(stride(run([]))).toBe(20);
  });

  test("the firecracker: up shoots down every enemy in the sky, once a stage, scoring each", () => {
    expect(firecrackerUses).toBe(1);
    const f = run(["firecracker"]);
    expect(f.lives).toBe(3);
    expect(f.firecrackers).toBe(1);
    const inSky = (): number => f.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting").length;
    while (inSky() < 5) f.update(NO_INPUT);
    const before = { n: inSky(), points: f.points };
    f.update({ ...NO_INPUT, up: true });
    expect(inSky()).toBe(0);
    expect(f.points).toBeGreaterThan(before.points);
    expect(f.shots).toEqual([]);
    expect(f.firecrackers).toBe(0);

    // Spent: with up let go and pressed again later in the stage, nothing happens.
    f.update(NO_INPUT);
    while (inSky() === 0) f.update(NO_INPUT);
    const left = inSky();
    f.update({ ...NO_INPUT, up: true });
    expect(inSky()).toBe(left);

    // The next stage brings it back.
    f.jumpTo(f.stage + 1);
    expect(f.firecrackers).toBe(1);
  });

  test("without the firecracker, up does nothing", () => {
    const f = run([]);
    expect(f.firecrackers).toBe(0);
    while (f.enemies.filter((e) => e.state !== "waiting").length < 5) f.update(NO_INPUT);
    const points = f.points;
    f.update({ ...NO_INPUT, up: true });
    expect(f.points).toBe(points);
    expect(f.enemies.every((e) => e.deadFrames === 0)).toBe(true);
  });

  test("a firecracker isn't wasted on an empty sky", () => {
    const f = minigame("firefly").create({ highScore: 0, prizes: ["firecracker"] });
    if (!(f instanceof FireflySoftware)) throw new Error("Firefly's create did not return a FireflySoftware");
    for (let k = 0; k < stageIntroTicks; k++) f.update(NO_INPUT);
    // Every enemy still waiting to fly in: none is in the sky yet.
    for (const e of f.enemies) e.state = "waiting";
    f.update({ ...NO_INPUT, up: true });
    expect(f.firecrackers).toBe(1);
    expect(f.enemies.every((e) => e.deadFrames === 0)).toBe(true);
  });

  test("the glow stick: up to 3 sparks on the screen at once", () => {
    expect(glowStickMaxSparks).toBe(3);
    expect(mostSparks(run(["glowStick"]))).toBe(3);
  });

  test("the wings: the firefly moves faster", () => {
    expect(wingsPlayerSpeed).toBeGreaterThan(playerSpeed);
    expect(stride(run(["wings"]))).toBe(10 * wingsPlayerSpeed);
  });
});
