// The running scene and its tick count, shared by the rAF loop (main.ts) and
// the test hook so both drive the same instance. DOM-free.

import type { Input } from "./input.ts";
import type { SceneOptions } from "../game/registry.ts";
import type { Scene, SceneName } from "../game/software.ts";

export type SceneFactory = (name: SceneName, opts: SceneOptions) => Scene;
type ReplaceListener = (next: Scene, prev: Scene | null) => void;

export class Runtime {
  private current: Scene | null = null;
  private stepped = 0;
  private readonly listeners: ReplaceListener[] = [];

  /** `create` is normally `createScene` from src/game/registry.ts. */
  constructor(private readonly create: SceneFactory) {}

  get scene(): Scene {
    if (this.current === null) throw new Error("Runtime: no scene loaded");
    return this.current;
  }

  /** Ticks stepped since the current scene was loaded. */
  get ticks(): number {
    return this.stepped;
  }

  /** Replace the scene with a fresh instance (seed the rng first). */
  load(name: SceneName, opts: SceneOptions = {}): void {
    this.replace(this.create(name, opts));
  }

  /** Replace the scene with an already built one. Disposes the old one. */
  replace(next: Scene): void {
    const prev = this.current;
    prev?.dispose?.();
    this.current = next;
    this.stepped = 0;
    for (const fn of this.listeners) fn(next, prev);
  }

  /** Observe scene replacements (main.ts mounts/unmounts overlays here). */
  onReplace(fn: ReplaceListener): void {
    this.listeners.push(fn);
  }

  /** One fixed tick. */
  step(input: Input): void {
    this.scene.step(input);
    this.stepped++;
  }
}
