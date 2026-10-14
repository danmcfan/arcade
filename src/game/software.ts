// Port of internal/software, plus the `Scene` contract the loop, the test
// hook and the parity harness drive (§3.4).

import type { Input } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import type { SceneSnapshot, SoftwareSnapshot } from "./snapshot.ts";

export type SoftwareName = "sweetSam" | "firefly" | "brassMonkey";

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
  /** §4.3; the matching type in snapshot.ts (`SweetSamSnapshot`, …). */
  snapshot(): SoftwareSnapshot;
}

/**
 * Software that fills the window without the standard playfield margin:
 * every minigame plays inside its cabinet bezel, drawn at 0,0 by
 * src/ui/cabinet.ts.
 */
export interface FixedViewport extends Software {
  fixedViewportSize(): [number, number];
}

/** Go's `s.(software.FixedViewport)` type assertion. */
export function isFixedViewport(s: Software): s is FixedViewport {
  return "fixedViewportSize" in s && typeof s.fixedViewportSize === "function";
}

export type SceneName = "title" | "game";

/**
 * A top-level scene: the title or the arcade `Game`.
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
  /** §4.3 snapshot of the state after the last `step()`. */
  snapshot(): SceneSnapshot;
  /** Optional: release listeners (e.g. the Game's sound listener) when the scene is replaced. */
  dispose?(): void;
  /** Optional, browser only: write the save now (main.ts calls it when the page is hidden). */
  persist?(): void;
}
