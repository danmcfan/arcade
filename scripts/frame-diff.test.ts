import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { diffFiles, diffImages, parseMask } from "./frame-diff.ts";

function solid(w: number, h: number, rgba: [number, number, number, number]): PNG {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) png.data.set(rgba, i * 4);
  return png;
}

function setPixel(png: PNG, x: number, y: number, rgba: [number, number, number, number]): void {
  png.data.set(rgba, (y * png.width + x) * 4);
}

describe("diffImages (pixelmatch, threshold 0.1)", () => {
  test("identical frames have 0 differing pixels", () => {
    expect(diffImages(solid(4, 4, [10, 20, 30, 255]), solid(4, 4, [10, 20, 30, 255])).diffPixels).toBe(0);
  });

  test("counts differing pixels", () => {
    const b = solid(4, 4, [0, 0, 0, 255]);
    setPixel(b, 1, 2, [255, 255, 255, 255]);
    setPixel(b, 3, 3, [255, 0, 0, 255]);
    expect(diffImages(solid(4, 4, [0, 0, 0, 255]), b).diffPixels).toBe(2);
  });

  test("±1 channel rounding is under the threshold", () => {
    expect(diffImages(solid(2, 2, [100, 100, 100, 255]), solid(2, 2, [101, 99, 100, 255])).diffPixels).toBe(0);
  });

  test("masked rects are ignored", () => {
    const b = solid(4, 4, [0, 0, 0, 255]);
    setPixel(b, 1, 1, [255, 255, 255, 255]);
    setPixel(b, 3, 0, [255, 255, 255, 255]);
    expect(diffImages(solid(4, 4, [0, 0, 0, 255]), b, [{ x: 0, y: 0, w: 2, h: 2 }]).diffPixels).toBe(1);
  });

  test("different sizes are an error, not a count", () => {
    expect(() => diffImages(solid(4, 4, [0, 0, 0, 255]), solid(5, 4, [0, 0, 0, 255]))).toThrow(
      "size mismatch: 4x4 vs 5x4",
    );
  });
});

test("parseMask reads x,y,w,h", () => {
  expect(parseMask("1,2,30,40")).toEqual({ x: 1, y: 2, w: 30, h: 40 });
  expect(() => parseMask("1,2,3")).toThrow();
});

test("diffFiles reads two PNGs and writes the diff image", () => {
  const dir = mkdtempSync(join(tmpdir(), "arcade-framediff-"));
  const a = join(dir, "a.png");
  const b = join(dir, "b.png");
  const out = join(dir, "sub", "diff.png");
  const pb = solid(3, 3, [0, 0, 0, 255]);
  setPixel(pb, 0, 0, [255, 255, 255, 255]);
  writeFileSync(a, PNG.sync.write(solid(3, 3, [0, 0, 0, 255])));
  writeFileSync(b, PNG.sync.write(pb));
  expect(diffFiles(a, b, { out })).toEqual({ width: 3, height: 3, diffPixels: 1 });
  expect(existsSync(out)).toBe(true);
});
