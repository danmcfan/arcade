import { afterEach, describe, expect, test } from "bun:test";
import { images } from "../engine/assets.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { PremulColor, Surface } from "../engine/surface.ts";
import { Game } from "./game.ts";
import type { GearheadSnapshot } from "./snapshot.ts";
import type { FixedViewport, Software, SoftwareName } from "./software.ts";

// debugPrint draws glyphs on the surface; record its calls instead.
// (Not `mock.module`: Bun module mocks leak into every later test file.)
const printed: [string, number, number][] = [];
const debugPrint = (_s: Surface, text: string, x: number, y: number) => {
  printed.push([text, x, y]);
};

type Call =
  | ["draw", string, number, number, number, number, number, number]
  | ["strokeRect", number, number, number, number, PremulColor]
  | ["fillPremul", number, number, number, number, PremulColor];

/** Records the Surface calls the hub makes (only the ones it uses). */
function recordingSurface() {
  const calls: Call[] = [];
  const surface = {
    draw(s: Sprite, x: number, y: number) {
      const name = Object.entries(images).find(([, a]) => a === s.asset)?.[0] ?? "?";
      calls.push(["draw", name, s.sx, s.sy, s.w, s.h, x, y]);
    },
    strokeRect(x: number, y: number, w: number, h: number, c: PremulColor) {
      calls.push(["strokeRect", x, y, w, h, c]);
    },
    fillPremul(x: number, y: number, w: number, h: number, c: PremulColor) {
      calls.push(["fillPremul", x, y, w, h, c]);
    },
  };
  return { calls, surface: surface as unknown as Surface };
}

class FakeSoftware implements Software {
  margins: number[] = [];
  constructor(readonly name: SoftwareName) {}
  background(): Sprite {
    return makeSolid(224, 256, "#000");
  }
  update(): void {}
  draw(_screen: Surface, buffer: number): void {
    this.margins.push(buffer);
  }
  gameOver(): boolean {
    return false;
  }
  score(): number {
    return 0;
  }
  snapshot(): GearheadSnapshot {
    return { x: 0, y: 0, frame: 0, left: false, moving: false };
  }
}
class FakeFixed extends FakeSoftware implements FixedViewport {
  fixedViewportSize(): [number, number] {
    return [336, 428];
  }
}

const built: FakeSoftware[] = [];
const factory = (name: SoftwareName): Software => {
  const sw = name === "hive" ? new FakeFixed(name) : new FakeSoftware(name);
  built.push(sw);
  return sw;
};

const games: { dispose(): void }[] = [];
function newGame(initial: SoftwareName | null = null) {
  const g = new Game(initial, { createSoftware: factory, debugPrint });
  games.push(g);
  return g;
}
afterEach(() => {
  for (const g of games.splice(0)) g.dispose();
  built.length = 0;
  printed.length = 0;
});

function input(keys: Partial<Input> = {}): Input {
  return { ...NO_INPUT, ...keys };
}

const green = { r: 0, g: 255, b: 0, a: 64 };
const red = { r: 255, g: 0, b: 0, a: 64 };
const yellow = { r: 255, g: 255, b: 0, a: 64 };

describe("hub draw", () => {
  test("background at the 16 px buffer, then the player frame centred on its position", () => {
    const game = newGame();
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([
      ["draw", "arcade", 0, 0, 160, 144, 16, 16],
      // Facing down = row 1; frame 0; at (80 + 16 - 8, 92 + 16 - 12).
      ["draw", "gamer", 0, 24, 16, 24, 88, 96],
    ]);
  });

  test("the sprite column is int(frame); the row follows the facing direction", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ left: true })); // frame 2.5, x 55
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls[1]).toEqual(["draw", "gamer", 32, 48, 16, 24, 63, 96]);
  });

  test("the title is drawn over everything while the melody plays", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ up: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls[2]).toEqual(["draw", "sweet", 0, 0, 160, 144, 16, 16]);
    expect(calls.length).toBe(3);
  });

  test("debug mode adds the overlay rects and the side panel", () => {
    const game = newGame();
    game.step(input({ shiftP: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls.slice(2)).toEqual([
      ["strokeRect", 88, 96, 15, 23, green],
      ["strokeRect", 16, 16, 159, 47, red],
      ["strokeRect", 16, 64, 23, 71, red],
      ["strokeRect", 152, 64, 23, 71, red],
      ["strokeRect", 16, 136, 159, 23, red],
      ["strokeRect", 64, 56, 15, 15, yellow],
      ["strokeRect", 88, 56, 15, 15, yellow],
      ["strokeRect", 112, 56, 15, 15, yellow],
      ["fillPremul", 192, 0, 120, 176, { r: 20, g: 20, b: 20, a: 200 }],
    ]);
    expect(printed).toEqual([["Player: (80,92)", 200, 8]]);
  });

  test("the overlay offsets copies: drawing twice gives the same rects", () => {
    const game = newGame();
    game.step(input({ shiftP: true }));
    const first = recordingSurface();
    game.draw(first.surface);
    const second = recordingSurface();
    game.draw(second.surface);
    expect(second.calls).toEqual(first.calls);
  });
});

describe("software draw", () => {
  test("normal software draws with the 16 px margin and nothing else is drawn", () => {
    const game = newGame("gearhead");
    game.step(input());
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(built[0]?.margins).toEqual([16]);
  });

  test("a FixedViewport draws with margin 0", () => {
    const game = newGame("hive");
    game.step(input());
    game.draw(recordingSurface().surface);
    expect(built[0]?.margins).toEqual([0]);
  });

  test("debug mode inside a software draws no panel (layout still grows)", () => {
    const game = newGame("gearhead");
    game.step(input({ shiftP: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(printed).toEqual([]);
    expect(game.layout()).toEqual([376, 288]);
  });
});
