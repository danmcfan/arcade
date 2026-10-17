// `window.__arcade` test hook (§3.5, D7). Installed by main.ts only with the
// `?debug` query param; inert otherwise. T3 (engine) implements it; these
// types are the contract scripts/harness.ts and agents code against.

import type { Input } from "./input.ts";
import { addSoundListener, type SoundEvent } from "./audio.ts";
import * as rng from "./rng.ts";
import type { Runtime } from "./runtime.ts";
import { expandSteps } from "../game/script.ts";
import type { SceneName, SoftwareName } from "../game/software.ts";
import type { SceneSnapshot } from "../game/snapshot.ts";
import type { InputScript } from "../game/script.ts";

export interface LoadOptions {
  /** `game` only: start as `game.New(<software>)`; omit for the hub. */
  software?: SoftwareName;
}

export interface ArcadeTestHook {
  /** Stop the rAF loop from stepping (drawing may continue). */
  pause(): void;
  resume(): void;
  /** Run `n` fixed ticks with that input (missing keys false), then one draw. */
  step(n: number, input?: Partial<Input>): void;
  /**
   * Run `expandSteps(script.steps)` on the current scene, then one draw.
   * Does not reseed or reload: call `seed()` and `load()` first.
   */
  runScript(script: InputScript): void;
  /** Jump the running minigame to stage (or level) `stage`, then one draw; throws if the scene has none. */
  jump(stage: number): void;
  /** `rng.seed(n)`. */
  seed(n: number): void;
  /** Replace the current scene with a fresh instance from src/game/registry.ts. */
  load(scene: SceneName, opts?: LoadOptions): void;
  /** Ticks stepped since the last `load()`. */
  tick(): number;
  /** The current scene's §4.3 snapshot. */
  snapshot(): SceneSnapshot;
  /** `canvas.toDataURL()` at logical resolution. */
  frame(): string;
  layout(): [number, number];
  /** Sound calls ("play:start", "pause:melody", …) since the last call, recorded regardless of `ready`. */
  sounds(): SoundEvent[];
}

declare global {
  interface Window {
    __arcade?: ArcadeTestHook;
  }
}

/** What the hook drives: the shared runtime plus the page's loop and screen. */
export interface TestHookHost {
  runtime: Runtime;
  /** Resize the screen to the scene layout and draw one frame. */
  draw(): void;
  /** The screen's PNG data URL at logical resolution. */
  frame(): string;
  /** Stop/restart the rAF loop's stepping. */
  pause(): void;
  resume(): void;
}

/** Build the hook object (DOM-free; `installTestHook` puts it on `window`). */
export function createTestHook(host: TestHookHost): ArcadeTestHook {
  let recorded: SoundEvent[] = [];
  addSoundListener((e) => {
    recorded.push(e);
  });
  const { runtime } = host;

  return {
    pause: () => {
      host.pause();
    },
    resume: () => {
      host.resume();
    },
    step(n, input) {
      // Same expansion as a script step: `shiftP` only on the first tick.
      for (const i of expandSteps([{ ticks: n, input: input ?? {} }])) runtime.step(i);
      host.draw();
    },
    runScript(script) {
      for (const i of expandSteps(script.steps)) runtime.step(i);
      host.draw();
    },
    jump(stage) {
      const scene = runtime.scene;
      if (scene.jumpTo === undefined) throw new Error(`jump: the ${scene.name} scene has no minigame to jump`);
      scene.jumpTo(stage);
      host.draw();
    },
    seed: (n) => {
      rng.seed(n);
    },
    load: (scene, opts) => {
      runtime.load(scene, opts ?? {});
    },
    tick: () => runtime.ticks,
    snapshot: () => runtime.scene.snapshot(),
    frame() {
      host.draw();
      return host.frame();
    },
    layout: () => runtime.scene.layout(),
    sounds() {
      const out = recorded;
      recorded = [];
      return out;
    },
  };
}

/** Browser only, `?debug` only (D7): expose the hook as `window.__arcade`. */
export function installTestHook(host: TestHookHost): ArcadeTestHook {
  const hook = createTestHook(host);
  window.__arcade = hook;
  return hook;
}
