// TEMPORARY test-pattern scene (T3 gate): shown at `?scene=test`, and by
// main.ts while the real scene factories still throw "TODO". It exercises the
// engine (scale, snapping, sprites, debug text, premultiplied fills, input).
// To remove: delete this file, its test, and the `testPattern` lines in
// src/main.ts.

import { imageGamer } from "./assets.ts";
import { NO_INPUT, type Input } from "./input.ts";
import { sub } from "./image.ts";
import * as rng from "./rng.ts";
import type { Surface } from "./surface.ts";
import { debugPrint } from "./text.ts";
import type { Scene } from "../game/software.ts";
import type { SceneSnapshot } from "../game/snapshot.ts";

export const TEST_PATTERN_SIZE: [number, number] = [192, 176];
const BARS = ["#ffffff", "#ffec27", "#29adff", "#00e436", "#ff77a8", "#ff004d", "#1d2b53", "#000000"];

export class TestPattern implements Scene {
  // Scene names are a closed union; the pattern stands in for the game.
  readonly name = "game" as const;
  private ticks = 0;
  private x = 88;
  private y = 120;
  private frame = 0;
  private last: Input = NO_INPUT;

  step(i: Input): void {
    this.ticks++;
    this.last = i;
    // 0.75 px/tick: fractional positions exercise snap() (D13).
    if (i.left) this.x -= 0.75;
    if (i.right) this.x += 0.75;
    if (i.up) this.y -= 0.75;
    if (i.down) this.y += 0.75;
    this.x = Math.min(Math.max(this.x, 0), 192 - 16);
    this.y = Math.min(Math.max(this.y, 0), 176 - 24);
    this.frame = i.left || i.right || i.up || i.down ? (this.frame + 0.1) % 4 : 0;
  }

  draw(screen: Surface): void {
    const [w, h] = TEST_PATTERN_SIZE;
    screen.fillRect(0, 0, w, h, "#5f574f");
    BARS.forEach((c, k) => screen.fillRect(k * 24, 0, 24, 40, c));
    for (let x = 0; x < w; x += 2) {
      screen.fillRect(x, 40, 1, 1, "#ffffff");
      screen.fillRect(x + 1, h - 1, 1, 1, "#ffffff");
    }
    for (let y = 40; y < h; y += 2) {
      screen.fillRect(0, y, 1, 1, "#ffffff");
      screen.fillRect(w - 1, y + 1, 1, 1, "#ffffff");
    }
    debugPrint(screen, "TEST PATTERN 192x176", 4, 44);
    debugPrint(screen, `tick ${this.ticks}`, 4, 60);
    const keys = (["up", "down", "left", "right", "space", "escape"] as const)
      .filter((k) => this.last[k])
      .join(" ");
    debugPrint(screen, keys === "" ? "arrows/WASD move" : keys, 4, 76);
    screen.fillPremul(120, 96, 40, 16, { r: 0, g: 255, b: 0, a: 64 });
    screen.strokeRect(120, 96, 39, 15, { r: 20, g: 20, b: 20, a: 200 });
    screen.fillCircle(170, 140, 6, "#ffec27");
    screen.line(120, 150, 160, 130, "#29adff");
    const col = Math.trunc(this.frame);
    screen.draw(sub(imageGamer, col * 16, 0, col * 16 + 16, 24), this.x, this.y, { flipX: this.last.left });
  }

  layout(): [number, number] {
    return [...TEST_PATTERN_SIZE];
  }

  snapshot(): SceneSnapshot {
    return {
      tick: this.ticks,
      rng: rng.state(),
      debug: false,
      software: null,
      arcade: {
        player: { x: this.x, y: this.y, dir: "DOWN", frame: this.frame },
        melodyPlaying: false,
        title: null,
        highScore: 0,
      },
      sw: null,
      sounds: [],
    };
  }
}

export function createTestPattern(): Scene {
  return new TestPattern();
}
