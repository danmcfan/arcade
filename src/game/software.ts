// Port of internal/software, plus the `Scene` contract the loop, the test
// hook and the parity harness drive (§3.4).

import type { Input } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import type { SceneSnapshot, SoftwareSnapshot } from "./snapshot.ts";

export type SoftwareName = "hive" | "firefly" | "gearhead";

/** A minigame hosted by the arcade hub (Go `software.Software`). */
export interface Software {
  readonly name: SoftwareName;
  /** Go `Background()`; its size sets the layout unless `FixedViewport`. */
  background(): Sprite;
  update(i: Input): void;
  /** `buffer` is the playfield margin: 16, or 0 for a `FixedViewport`. */
  draw(screen: Surface, buffer: number): void;
  gameOver(): boolean;
  score(): number;
  /** §4.3; the matching type in snapshot.ts (`HiveSnapshot`, …). */
  snapshot(): SoftwareSnapshot;
}

/**
 * Software that fills the window without the standard playfield margin
 * (hive draws a cabinet bezel at 0,0).
 */
export interface FixedViewport extends Software {
  fixedViewportSize(): [number, number];
}

/** Go's `s.(software.FixedViewport)` type assertion. */
export function isFixedViewport(s: Software): s is FixedViewport {
  return typeof (s as Partial<FixedViewport>).fixedViewportSize === "function";
}

export type SceneName = "title" | "game" | "wave" | "lumberjack";

/** Pending wave slider values (Go globals `gridSize`, `seconds`). */
export interface WaveOptions {
  /** 64..256 step 64; default 128. */
  gridSize: number;
  /** 1..30; default 5. */
  seconds: number;
}

/**
 * A top-level scene: the arcade `Game`, or a lab scene (wave, lumberjack).
 * The loop reads input and calls `step(input)` once per fixed tick, then
 * `draw(screen)` once per frame after resizing the screen to `layout()`.
 * Nothing here may touch the DOM in `step()`/`snapshot()` (D12).
 */
export interface Scene {
  readonly name: SceneName;
  /** One fixed 1/60 s tick (Go `Update`). */
  step(i: Input): void;
  draw(screen: Surface): void;
  /** Logical resolution `[w, h]` (Go `Layout`), including the +120 debug width. */
  layout(): [number, number];
  /**
   * §4.3 snapshot of the state after the last `step()`. `full` is only
   * meaningful for wave (adds `cells`); other scenes ignore it.
   */
  snapshot(opts?: { full?: boolean }): SceneSnapshot;
  /**
   * Browser only, optional: mount HTML outside the canvas (wave's slider
   * overlay, D6) and return a function that removes it. Called by main.ts,
   * never by tests.
   */
  mountOverlay?(parent: HTMLElement): () => void;
  /** Optional: release listeners (e.g. the Game's sound listener) when the scene is replaced. */
  dispose?(): void;
  /** Optional, browser only: write the save now (main.ts calls it when the page is hidden). */
  persist?(): void;
}
