// `window.__arcade` test hook (§3.5, D7). Installed by main.ts only with the
// `?debug` query param; inert otherwise. T3 (engine) implements it; these
// types are the contract scripts/capture-frames.ts and agents code against.

import type { Input } from "./input.ts";
import type { SoundEvent } from "./audio.ts";
import type { SceneName, SoftwareName, WaveOptions } from "../game/software.ts";
import type { SceneSnapshot } from "../game/snapshot.ts";
import type { InputScript } from "../game/script.ts";

export interface LoadOptions {
  /** `game` only: start as `game.New(<software>)`; omit for the hub. */
  software?: SoftwareName;
  /** `wave` only: pending slider values. */
  wave?: WaveOptions;
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
