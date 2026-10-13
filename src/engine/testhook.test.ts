import { describe, expect, test } from "bun:test";
import { soundSpark } from "./assets.ts";
import { NO_INPUT, type Input } from "./input.ts";
import * as rng from "./rng.ts";
import { Runtime } from "./runtime.ts";
import { createTestHook, type ArcadeTestHook } from "./testhook.ts";
import { defined } from "./defined.testutil.ts";
import type { Scene, SceneName } from "../game/software.ts";
import type { SceneOptions } from "../game/registry.ts";
import type { SceneSnapshot, WaveSnapshot } from "../game/snapshot.ts";

class FakeScene implements Scene {
  inputs: Input[] = [];
  disposed = false;
  readonly name: SceneName;
  readonly opts: SceneOptions;
  readonly bornWithRng: number;

  constructor(name: SceneName, opts: SceneOptions, bornWithRng: number) {
    this.name = name;
    this.opts = opts;
    this.bornWithRng = bornWithRng;
  }
  step(i: Input): void {
    this.inputs.push(i);
  }
  draw(): void {}
  layout(): [number, number] {
    return [192, 176];
  }
  snapshot(opts?: { full?: boolean }): SceneSnapshot {
    // Shaped as a wave snapshot, whose `cells` only a full snapshot carries.
    const snap: WaveSnapshot = { tick: this.inputs.length, rng: rng.state(), collapsed: 0, width: 0, cellsHash: 0 };
    if (opts?.full === true) snap.cells = [];
    return snap;
  }
  dispose(): void {
    this.disposed = true;
  }
}

interface Setup {
  hook: ArcadeTestHook;
  runtime: Runtime;
  made: FakeScene[];
  log: string[];
  current: () => FakeScene;
}

function setup(): Setup {
  const made: FakeScene[] = [];
  const runtime = new Runtime((name, opts) => {
    const s = new FakeScene(name, opts, rng.state());
    made.push(s);
    return s;
  });
  runtime.load("game");
  const log: string[] = [];
  const hook = createTestHook({
    runtime,
    draw: () => {
      log.push("draw");
    },
    frame: () => "data:image/png;base64,AAAA",
    pause: () => {
      log.push("pause");
    },
    resume: () => {
      log.push("resume");
    },
  });
  const current = (): FakeScene => defined(made.find((m) => m === runtime.scene));
  return { hook, runtime, made, log, current };
}

describe("Runtime", () => {
  test("load builds a fresh scene, disposes the old one and resets the tick count", () => {
    const { runtime, made } = setup();
    runtime.step(NO_INPUT);
    expect(runtime.ticks).toBe(1);
    runtime.load("wave", { wave: { gridSize: 64 } });
    expect(made[0]?.disposed).toBe(true);
    expect(made[1]?.name).toBe("wave");
    expect(made[1]?.opts).toEqual({ wave: { gridSize: 64 } });
    expect(runtime.ticks).toBe(0);
  });

  test("onReplace observers see each new scene and the one it replaced", () => {
    const { runtime, made } = setup();
    const seen: Array<[Scene, Scene | null]> = [];
    runtime.onReplace((next, prev) => {
      seen.push([next, prev]);
    });
    runtime.load("lumberjack");
    expect(seen).toEqual([[defined(made[1]), defined(made[0])]]);
  });
});

describe("window.__arcade (§3.5)", () => {
  test("step(n, input) runs n ticks with missing keys false, then draws once", () => {
    const { hook, current, log } = setup();
    hook.step(3, { left: true });
    const left: Input = { ...NO_INPUT, left: true };
    expect(current().inputs).toEqual([left, left, left]);
    expect(log).toEqual(["draw"]);
    expect(hook.tick()).toBe(3);
  });

  test("step(n, { shiftP: true }) presses Shift+P on the first tick only", () => {
    const { hook, current } = setup();
    hook.step(2, { shiftP: true });
    expect(current().inputs.map((i) => i.shiftP)).toEqual([true, false]);
  });

  test("runScript expands the steps (shiftP on each step's first tick only), then draws once", () => {
    const { hook, current, log } = setup();
    hook.runScript({
      name: "s",
      scene: "game",
      seed: 1,
      steps: [
        { ticks: 2, input: { shiftP: true } },
        { ticks: 1, input: { space: true } },
      ],
      captureTicks: [],
    });
    expect(current().inputs.map((i) => [i.shiftP, i.space])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
    expect(log).toEqual(["draw"]);
  });

  test("seed then load: the new scene is built after seeding, with its options", () => {
    const { hook, current } = setup();
    hook.seed(99);
    hook.load("game", { software: "sweetSam" });
    expect(current().bornWithRng).toBe(99);
    expect(current().opts).toEqual({ software: "sweetSam" });
    expect(hook.tick()).toBe(0);
  });

  test("snapshot, layout and frame come from the current scene and screen", () => {
    const { hook } = setup();
    hook.seed(5);
    hook.step(2);
    expect(hook.snapshot()).toEqual({ tick: 2, rng: 5, collapsed: 0, width: 0, cellsHash: 0 });
    expect(hook.layout()).toEqual([192, 176]);
    expect(hook.frame()).toBe("data:image/png;base64,AAAA");
  });

  test("snapshot({ full: true }) asks the scene for its full snapshot (§4.3 last tick)", () => {
    const { hook } = setup();
    hook.seed(5);
    hook.step(1);
    expect(hook.snapshot({ full: true })).toEqual({ tick: 1, rng: 5, collapsed: 0, width: 0, cellsHash: 0, cells: [] });
    expect(hook.snapshot({ full: false })).toEqual({ tick: 1, rng: 5, collapsed: 0, width: 0, cellsHash: 0 });
  });

  test("sounds() returns the calls since the last call, regardless of ready", () => {
    const { hook } = setup();
    hook.sounds();
    soundSpark.rewind();
    soundSpark.play();
    expect(hook.sounds()).toEqual(["rewind:spark", "play:spark"]);
    expect(hook.sounds()).toEqual([]);
  });

  test("pause and resume reach the loop", () => {
    const { hook, log } = setup();
    hook.pause();
    hook.resume();
    expect(log).toEqual(["pause", "resume"]);
  });
});
