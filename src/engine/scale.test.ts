import { describe, expect, test } from "bun:test";
import { fitScale } from "./scale.ts";

describe("fitScale (D1: integer scale in device pixels)", () => {
  test("dpr 1: largest integer multiple that fits", () => {
    expect(fitScale(192, 176, 1280, 800, 1)).toEqual({ scale: 4, integer: true, cssWidth: 768, cssHeight: 704 });
  });

  test("dpr 1.25: k counts device pixels, CSS size is k * logical / dpr", () => {
    expect(fitScale(192, 176, 1280, 800, 1.25)).toEqual({ scale: 5, integer: true, cssWidth: 768, cssHeight: 704 });
  });

  test("dpr 1.25: CSS size is exactly k * logical / dpr, not rounded to 1/64 px layout units", () => {
    // Verified in Chrome with a real --force-device-scale-factor=1.25 (T12): 684.8 CSS px paints exactly
    // 856 device rows, and rounding up to 684.8125 makes a half-pixel-centred canvas 857 rows tall.
    // The 855-row hive seen in T11 came from CDP device-metrics emulation, which snaps to whole CSS px.
    expect(fitScale(336, 428, 1280, 800, 1.25)).toEqual({ scale: 2, integer: true, cssWidth: 537.6, cssHeight: 684.8 });
    expect(fitScale(512, 288, 1280, 800, 1.25)).toEqual({
      scale: 3,
      integer: true,
      cssWidth: 1228.8,
      cssHeight: 691.2,
    });
  });

  test("dpr 2", () => {
    expect(fitScale(192, 176, 1280, 800, 2)).toEqual({ scale: 9, integer: true, cssWidth: 864, cssHeight: 792 });
  });

  test("an exact fit counts as fitting", () => {
    expect(fitScale(160, 100, 320, 200, 1).scale).toBe(2);
  });

  test("falls back to a fractional fit-to-viewport downscale when k = 1 does not fit (wave)", () => {
    expect(fitScale(2048, 2048, 1280, 800, 1)).toEqual({
      scale: 800 / 2048,
      integer: false,
      cssWidth: 800,
      cssHeight: 800,
    });
    // At dpr 2, k = 1 would be 1024 CSS px, still too tall.
    expect(fitScale(2048, 2048, 1280, 800, 2)).toMatchObject({ integer: false, cssWidth: 800, cssHeight: 800 });
  });

  test("k = 1 is used when it fits even if the viewport is barely larger", () => {
    expect(fitScale(336, 428, 500, 430, 1)).toEqual({ scale: 1, integer: true, cssWidth: 336, cssHeight: 428 });
  });
});
