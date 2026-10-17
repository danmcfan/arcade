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
import { flashBangTicks, maxSparks, playerSpeed, stageIntroTicks, startLives, upDoubleTapTicks } from "./rules.ts";

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

const up: Input = { ...NO_INPUT, up: true };

/** Up tapped twice, `gap` ticks apart (from one press to the next). */
function tapTwice(f: FireflySoftware, gap: number): void {
  f.update(up);
  for (let k = 1; k < gap; k++) f.update(NO_INPUT);
  f.update(up);
}

/** Enemies alive in the sky (not waiting to fly in). */
function inSky(f: FireflySoftware): number {
  return f.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting").length;
}

/** A Firefly run with these prizes, stepped until at least 5 enemies are in the sky. */
function withEnemies(prizes: readonly PrizeId[]): FireflySoftware {
  const f = run(prizes);
  while (inSky(f) < 5) f.update(NO_INPUT);
  return f;
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

  test("the firecracker: a double tap of up shoots down every enemy in the sky, scoring each, with a flash bang", () => {
    expect(firecrackerUses).toBe(1);
    expect(upDoubleTapTicks).toBe(18);
    const f = withEnemies(["firecracker"]);
    expect([f.lives, f.firecrackers, f.flashBang]).toEqual([3, 1, 0]);
    const points = f.points;
    tapTwice(f, 10);
    expect(inSky(f)).toBe(0);
    expect(f.points).toBeGreaterThan(points);
    expect(f.shots).toEqual([]);
    expect(f.firecrackers).toBe(0);
    // One flash, fading out over flashBangTicks: it never brightens again.
    const flash: number[] = [f.flashBang];
    while (f.flashBang > 0) {
      f.update(NO_INPUT);
      flash.push(f.flashBang);
    }
    expect(flash[0]).toBe(flashBangTicks);
    expect(flash.every((v, k) => k === 0 || v < (flash[k - 1] ?? 0))).toBe(true);
  });

  test("the firecracker: a single tap does nothing", () => {
    const f = withEnemies(["firecracker"]);
    const n = inSky(f);
    f.update(up);
    for (let k = 0; k < 40; k++) f.update(NO_INPUT);
    expect(f.firecrackers).toBe(1);
    expect(inSky(f)).toBeGreaterThanOrEqual(n);
  });

  test("the firecracker: two slow taps do nothing; a tap at the window's edge still counts", () => {
    const slow = withEnemies(["firecracker"]);
    tapTwice(slow, upDoubleTapTicks + 1);
    expect(slow.firecrackers).toBe(1);
    expect(slow.flashBang).toBe(0);
    const edge = withEnemies(["firecracker"]);
    tapTwice(edge, upDoubleTapTicks);
    expect(edge.firecrackers).toBe(0);
  });

  test("the firecracker: up held down is one tap", () => {
    const f = withEnemies(["firecracker"]);
    for (let k = 0; k < 10; k++) f.update(up);
    expect(f.firecrackers).toBe(1);
  });

  test("the firecracker: once a stage; the next stage brings it back", () => {
    const f = withEnemies(["firecracker"]);
    tapTwice(f, 5);
    expect(f.firecrackers).toBe(0);
    f.update(NO_INPUT);
    while (inSky(f) === 0) f.update(NO_INPUT);
    const left = inSky(f);
    tapTwice(f, 5);
    expect(inSky(f)).toBe(left);
    f.jumpTo(f.stage + 1);
    expect(f.firecrackers).toBe(1);
  });

  test("without the firecracker, a double tap does nothing", () => {
    const f = withEnemies([]);
    expect(f.firecrackers).toBe(0);
    const points = f.points;
    tapTwice(f, 5);
    expect(f.points).toBe(points);
    expect(f.flashBang).toBe(0);
  });

  test("a firecracker isn't wasted on an empty sky", () => {
    const f = run(["firecracker"]);
    // Every enemy held waiting to fly in: none is in the sky.
    for (const i of [up, NO_INPUT, up]) {
      for (const e of f.enemies) e.state = "waiting";
      f.update(i);
    }
    expect(f.firecrackers).toBe(1);
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
