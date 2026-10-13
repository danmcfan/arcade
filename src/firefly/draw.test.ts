import { describe, expect, test } from "bun:test";
import { imageCabinetFirefly, imageFirefly, imageFireflyBackground, imageHit, imageMoth, imageSpark } from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import { FireflySoftware } from "./game.ts";

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
}

/** Records `Surface.draw` calls; nothing else is used by firefly's draw. */
/** Firefly is a FixedViewport: drawn with buffer 0, the playfield at the cabinet insets (56, 56). */
function drawCalls(f: FireflySoftware, buffer = 0): DrawCall[] {
  const calls: DrawCall[] = [];
  const fake: Pick<Surface, "draw"> = {
    draw: (sprite, x, y) => {
      calls.push({ sprite, x, y });
    },
  };
  f.draw(fake as Surface, buffer);
  return calls;
}

const rect = (s: Sprite) => [s.sx, s.sy, s.w, s.h];

describe("firefly draw", () => {
  test("cabinet at 0,0, the night sky inside the insets, the firefly centred on its position; Moths at the origin are culled", () => {
    const [cabinet, ...calls] = drawCalls(new FireflySoftware());
    expect(cabinet?.sprite.asset).toBe(imageCabinetFirefly.asset);
    expect(cabinet && [rect(cabinet.sprite), cabinet.x, cabinet.y]).toEqual([[0, 0, 336, 428], 0, 0]);
    expect(calls).toEqual([
      { sprite: imageFireflyBackground, x: 56, y: 56 },
      { sprite: imageFirefly, x: 112 + 56 - 8, y: 264 + 56 - 8 },
    ]);
  });

  test("the cabinet shows the joystick frame of the last input", () => {
    const f = new FireflySoftware();
    f.update({ ...NO_INPUT, left: true });
    expect(rect(drawCalls(f)[0]!.sprite)).toEqual([3 * 336, 0, 336, 428]);
  });

  test("sparks draw with their top-left at their position (they are 0×0)", () => {
    const f = new FireflySoftware();
    for (const b of f.bugs) b.deadFrames = 10_000;
    f.update({ ...NO_INPUT, space: true });
    const spark = drawCalls(f).find((c) => c.sprite === imageSpark);
    expect(spark).toEqual({ sprite: imageSpark, x: 108 + 56, y: 251 + 56 });
  });

  test("Moth culling bounds are exclusive: (0, 224) × (0, 288)", () => {
    const f = new FireflySoftware();
    const positions = [
      { x: 0, y: 50 },
      { x: 224, y: 50 },
      { x: 50, y: 0 },
      { x: 50, y: 288 },
      { x: 0.5, y: 287.5 },
    ];
    f.bugs = f.bugs.slice(0, positions.length);
    f.bugs.forEach((b, i) => {
      b.position = positions[i] ?? { x: 0, y: 0 };
    });
    const moths = drawCalls(f).filter((c) => c.sprite.asset === imageMoth.asset);
    expect(moths.map((c) => [c.x, c.y])).toEqual([[0.5 + 56 - 8, 287.5 + 56 - 8]]);
  });

  test("a Moth's frame follows its heading: moving right is row 1, col 0", () => {
    const f = new FireflySoftware();
    f.bugs = f.bugs.slice(0, 1);
    const [bug] = f.bugs;
    if (bug === undefined) throw new Error("no bug");
    bug.position = { x: 100, y: 100 };
    bug.direction = { x: 1, y: 0 };
    const call = drawCalls(f).find((c) => c.sprite.asset === imageMoth.asset);
    expect(call?.x).toBe(100 + 56 - 8);
    expect(call?.y).toBe(100 + 56 - 8);
    expect(call && rect(call.sprite)).toEqual([0, 16, 16, 16]);
  });

  test("hit effect column is 5 - trunc(deadFrames/15), drawn 16 up-left of the Moth", () => {
    const f = new FireflySoftware();
    f.bugs = f.bugs.slice(0, 1);
    const [bug] = f.bugs;
    if (bug === undefined) throw new Error("no bug");
    bug.position = { x: 100, y: 100 };

    const cases: [deadFrames: number, sheetRect: number[]][] = [
      [74, [32, 0, 32, 32]], // first frame ever drawn: column 1 (column 0 is never shown)
      [60, [32, 0, 32, 32]],
      [59, [64, 0, 32, 32]],
      [15, [128, 0, 32, 32]],
      [14, [0, 0, 0, 0]], // column 5 is off the 160 px sheet: empty sub-image, nothing visible
      [1, [0, 0, 0, 0]],
    ];
    for (const [deadFrames, sheetRect] of cases) {
      bug.deadFrames = deadFrames;
      const call = drawCalls(f).find((c) => c.sprite.asset === imageHit.asset);
      expect(call?.x).toBe(100 + 56 - 16);
      expect(call?.y).toBe(100 + 56 - 16);
      expect(call && rect(call.sprite)).toEqual(sheetRect);
    }
  });
});
