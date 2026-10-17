import { beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import type { LevelEffect } from "./board.ts";
import { Level } from "./level.ts";

beforeEach(() => {
  rng.seed(1);
});

describe("Level", () => {
  test("starts in START with three lives and a full maze, and reaches PLAY after READY", () => {
    const level = new Level(0);
    expect(level.snapshot().state).toBe("START");
    for (let t = 0; t < 121; t++) level.step(NO_INPUT);
    const snap = level.snapshot();
    expect([snap.state, snap.lives, snap.items, snap.player.dir]).toEqual(["PLAY", 3, 244, "LEFT"]);
  });

  test("reports its sounds, shakes and bursts as effects, in order", () => {
    const effects: LevelEffect[] = [];
    const level = new Level(
      0,
      undefined,
      (e) => {
        effects.push(e);
      },
      {
        bees: [{ onPlayer: true, blueFrames: 300 }],
      },
    );
    expect(effects).toEqual([]);
    level.step(NO_INPUT);
    expect(effects.map((e) => e.kind)).toEqual(["sound", "shake", "burst"]);
    expect(level.snapshot().state).toBe("PAUSE");
  });

  test("a setup starts mid-PLAY from the described position", () => {
    const level = new Level(0, undefined, undefined, { level: 3, lives: 2, score: 1234, player: { x: 124 } });
    const snap = level.snapshot();
    expect([snap.state, snap.level, snap.lives, snap.score, snap.player.x, snap.player.dir]).toEqual([
      "PLAY",
      3,
      2,
      1234,
      124,
      "LEFT",
    ]);
  });
});
