import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { debugFont } from "./assets.ts";
import { FakeCanvas, canvasElement, fakeCanvas, type PaintOp } from "./fakeCanvas.testutil.ts";
import { Surface } from "./surface.ts";
import { debugPrint } from "./text.ts";

/** The decoded font: any canvas image source will do, the tests only check it is passed through. */
const pixels = canvasElement(new FakeCanvas(1, 1));
beforeAll(() => {
  debugFont.image = pixels;
});
afterAll(() => {
  debugFont.image = null;
});

function print(text: string, x: number, y: number): { src: PaintOp["src"]; x: number; y: number }[] {
  const { canvas, ctx } = fakeCanvas(200, 100);
  debugPrint(new Surface(canvas), text, x, y);
  return ctx.ops.map((o) => ({ src: o.src, x: o.x, y: o.y }));
}

describe("debugPrint (D14: port of the Go engine's drawDebugText)", () => {
  test("the font is the Go engine's 192x128 sheet of 6x16 glyphs", () => {
    const png = PNG.sync.read(readFileSync(debugFont.url));
    expect([png.width, png.height, debugFont.width, debugFont.height]).toEqual([192, 128, 192, 128]);
  });

  test("glyphs are indexed by code point, 32 per row, drawn from (ox+1, oy) every 6 px", () => {
    expect(print("A!", 10, 20)).toEqual([
      { src: [6, 32, 6, 16], x: 11, y: 20 },
      { src: [6, 16, 6, 16], x: 17, y: 20 },
    ]);
  });

  test("a newline returns to the left margin 16 px lower", () => {
    expect(print("a\nb", 0, 0)).toEqual([
      { src: [6, 48, 6, 16], x: 1, y: 0 },
      { src: [12, 48, 6, 16], x: 1, y: 16 },
    ]);
  });

  test("Latin-1 code points are on the sheet; anything above U+00FF draws nothing but still advances", () => {
    expect(print("ÿ", 0, 0)).toEqual([{ src: [186, 112, 6, 16], x: 1, y: 0 }]);
    expect(print("☃x", 0, 0)).toEqual([{ src: [144, 48, 6, 16], x: 7, y: 0 }]);
  });
});
