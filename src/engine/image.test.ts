import { describe, expect, test } from "bun:test";
import { makeSolid, sub, whole, type ImageAsset } from "./image.ts";
import { snap } from "./surface.ts";

const sheet: ImageAsset = { url: "sheet.png", width: 160, height: 32, image: null };

describe("snap (D13 as settled in Phase 4: Ebitengine adjustDestinationPixel)", () => {
  test("rounds half up, everything else to nearest (golden frames: hive y = 99.5 lands on row 100)", () => {
    expect(snap(2)).toBe(2);
    expect(snap(0.5)).toBe(1);
    expect(snap(0.49)).toBe(0);
    expect(snap(1.5)).toBe(2);
    expect(snap(209.5)).toBe(210);
    expect(snap(1.9375)).toBe(2);
    expect(snap(-0.5)).toBe(0);
    expect(snap(-0.51)).toBe(-1);
    expect(snap(-1.25)).toBe(-1);
  });

  test("works on the float32 translate Ebitengine's GeoM holds", () => {
    // 0.49999999 is below half in float64 but rounds to 0.5 in float32.
    expect(snap(0.49999999)).toBe(1);
  });

  test("never returns negative zero", () => {
    expect(Object.is(snap(0.2), 0)).toBe(true);
    expect(Object.is(snap(-0.5), 0)).toBe(true);
  });
});

describe("sub (Ebitengine SubImage)", () => {
  test("whole covers the asset", () => {
    expect(whole(sheet)).toEqual({ asset: sheet, sx: 0, sy: 0, w: 160, h: 32 });
  });

  test("uses absolute coordinates of the root image, like Go sub-images", () => {
    const col1 = sub(whole(sheet), 32, 0, 64, 32);
    expect(sub(col1, 32, 16, 64, 32)).toEqual({ asset: sheet, sx: 32, sy: 16, w: 32, h: 16 });
  });

  test("clamps to the parent bounds", () => {
    expect(sub(whole(sheet), 150, -4, 192, 32)).toEqual({ asset: sheet, sx: 150, sy: 0, w: 10, h: 32 });
  });

  test("an empty intersection is a 0x0 sprite (firefly explosion col 5)", () => {
    const s = sub(whole(sheet), 160, 0, 192, 32);
    expect(s.w).toBe(0);
    expect(s.h).toBe(0);
  });

  test("canonicalizes swapped corners like image.Rect", () => {
    expect(sub(whole(sheet), 64, 32, 32, 0)).toEqual({ asset: sheet, sx: 32, sy: 0, w: 32, h: 32 });
  });
});

describe("makeSolid", () => {
  test("is a DOM-free descriptor of the requested size", () => {
    const s = makeSolid(3, 3, "#fff");
    expect(s.w).toBe(3);
    expect(s.h).toBe(3);
    expect(s.asset.solid).toBe("#fff");
    expect(s.asset.image).toBeNull();
  });
});
