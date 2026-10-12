import { expect, test } from "bun:test";
import { NO_INPUT } from "../engine/input.ts";
import { createScene } from "./registry.ts";
import type { GameSnapshot } from "./snapshot.ts";

test("the registry builds the hub Game: 192x176, starts in the hub", () => {
  const scene = createScene("game");
  try {
    expect(scene.name).toBe("game");
    expect(scene.layout()).toEqual([192, 176]);
    scene.step({ ...NO_INPUT, right: true });
    const s = scene.snapshot() as GameSnapshot;
    expect(s.tick).toBe(1);
    expect(s.software).toBeNull();
    expect(s.arcade.player.x).toBe(81);
  } finally {
    scene.dispose?.();
  }
});
