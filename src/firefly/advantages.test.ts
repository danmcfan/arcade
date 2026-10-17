import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { addSoundListener } from "../engine/audio.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { PrizeId } from "../game/minigames.ts";
import {
  fireflyAdvantages,
  glowStickMaxSparks,
  lanternExtraLives,
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
    expect(fireflyAdvantages([])).toEqual({ lives: 3, maxSparks: 2, playerSpeed: 2 });
    expect(noAdvantages).toEqual({ lives: startLives, maxSparks, playerSpeed });
    const f = run([]);
    expect(f.lives).toBe(3);
    expect(mostSparks(f)).toBe(2);
    expect(stride(run([]))).toBe(20);
  });

  test("the lantern: a run starts with 4 lives", () => {
    expect(lanternExtraLives).toBe(1);
    expect(run(["lantern"]).lives).toBe(4);
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
