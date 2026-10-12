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

const real: ["gearhead" | "firefly", [number, number]][] = [
  ["gearhead", [256, 288]],
  ["firefly", [256, 320]],
];
for (const [name, size] of real) {
  test(`createScene("game", { software: "${name}" }): hub tick 1, then the real ${name} runs`, () => {
    const scene = createScene("game", { software: name });
    try {
      expect(scene.layout()).toEqual([192, 176]);
      scene.step({ ...NO_INPUT, left: true });
      let s = scene.snapshot() as GameSnapshot;
      expect(s.software).toBe(name);
      expect(s.arcade.player.x).toBe(79);
      expect(scene.layout()).toEqual(size);
      scene.step({ ...NO_INPUT, left: true });
      s = scene.snapshot() as GameSnapshot;
      expect(s.arcade.player.x).toBe(79);
      expect(s.sw).not.toBeNull();
      scene.step({ ...NO_INPUT, escape: true });
      s = scene.snapshot() as GameSnapshot;
      expect(s.software).toBeNull();
      expect(s.sounds).toEqual(["pause:start"]);
      expect(scene.layout()).toEqual([192, 176]);
    } finally {
      scene.dispose?.();
    }
  });
}
