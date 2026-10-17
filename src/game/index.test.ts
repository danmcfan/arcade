import { expect, test } from "bun:test";
import { NO_INPUT } from "../engine/input.ts";
import { createScene } from "./registry.ts";
import { gameSnapshot } from "./snapshot.testutil.ts";

test("the registry builds the hub Game: 192x176, starts in the hub", () => {
  const scene = createScene("game");
  try {
    expect(scene.name).toBe("game");
    expect(scene.layout()).toEqual([192, 176]);
    scene.step({ ...NO_INPUT, right: true });
    const s = gameSnapshot(scene.snapshot());
    expect(s.tick).toBe(1);
    expect(s.software).toBeNull();
    expect(s.arcade.player.x).toBe(81);
  } finally {
    scene.dispose?.();
  }
});

test('createScene("game", { software: "sweetSam" }): START sounds land in tick 1; 240x304 fixed viewport', () => {
  const scene = createScene("game", { software: "sweetSam" });
  try {
    scene.step({ ...NO_INPUT });
    const s = gameSnapshot(scene.snapshot());
    expect(s.sounds).toEqual(["rewind:sweetStart", "play:sweetStart"]);
    expect(s.software).toBe("sweetSam");
    expect(scene.layout()).toEqual([240, 304]);
    scene.step({ ...NO_INPUT, shiftP: true });
    expect(scene.layout()).toEqual([360, 304]);
  } finally {
    scene.dispose?.();
  }
});

const real: ["brassMonkey" | "firefly", [number, number]][] = [
  ["brassMonkey", [240, 304]], // its cabinet outline (#113)
  ["firefly", [240, 304]], // its cabinet outline (#113)
];
for (const [name, size] of real) {
  test(`createScene("game", { software: "${name}" }): hub tick 1, then the real ${name} runs`, () => {
    const scene = createScene("game", { software: name });
    try {
      expect(scene.layout()).toEqual([192, 176]);
      scene.step({ ...NO_INPUT, left: true });
      let s = gameSnapshot(scene.snapshot());
      expect(s.software).toBe(name);
      expect(s.arcade.player.x).toBe(79);
      expect(scene.layout()).toEqual(size);
      scene.step({ ...NO_INPUT, left: true });
      s = gameSnapshot(scene.snapshot());
      expect(s.arcade.player.x).toBe(79);
      expect(s.sw).not.toBeNull();
      scene.step({ ...NO_INPUT, escape: true });
      s = gameSnapshot(scene.snapshot());
      expect(s.menu).toBe("paused");
      expect(s.sounds).toEqual([
        "rewind:select",
        "play:select",
        "pause:sweetStart",
        "pause:sweetChompHigh",
        "pause:sweetChompLow",
        "pause:sweetSmoke",
        "pause:sweetBee",
        "pause:sweetFlower",
        "pause:sweetDeath",
        "pause:sweetClear",
        "pause:spark",
        "pause:mothHit",
        "pause:waspHit",
        "pause:owlHurt",
        "pause:owlKill",
        "pause:dive",
        "pause:lifeLost",
        "pause:beam",
        "pause:capture",
        "pause:rescue",
        "pause:stage",
        "pause:extraLife",
        "pause:badgeTick",
        "pause:fireflyStart",
        "pause:monkeyWrench",
      ]);
      expect(scene.layout()).toEqual(size);
      for (const keys of [{ down: true }, {}, { down: true }, {}, { space: true }])
        scene.step({ ...NO_INPUT, ...keys });
      s = gameSnapshot(scene.snapshot());
      expect(s.software).toBeNull();
      expect(scene.layout()).toEqual([192, 176]);
    } finally {
      scene.dispose?.();
    }
  });
}
