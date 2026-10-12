import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FakeCanvas, fakeCanvas, type FakeContext } from "./fakeCanvas.testutil.ts";
import { makeSolid, sub, whole, type ImageAsset } from "./image.ts";
import { Surface, setCanvasFactory } from "./surface.ts";

const pixels = { tag: "decoded image" };
const sheet: ImageAsset = { url: "sheet.png", width: 64, height: 32, image: pixels as unknown as CanvasImageSource };
const sprite = sub(whole(sheet), 16, 0, 32, 16);

let made: FakeCanvas[] = [];
beforeEach(() => {
  made = [];
  setCanvasFactory((w, h) => {
    const c = new FakeCanvas(w, h);
    made.push(c);
    return c as unknown as HTMLCanvasElement;
  });
});
afterEach(() => setCanvasFactory(null));

function screen(w = 192, h = 176): { s: Surface; ctx: FakeContext } {
  const { canvas, ctx } = fakeCanvas(w, h);
  return { s: new Surface(canvas), ctx };
}

describe("Surface.draw", () => {
  test("draws the sprite's source rect at the snapped translate (D13)", () => {
    const { s, ctx } = screen();
    s.draw(sprite, 10.5, 3.51);
    expect(ctx.ops).toHaveLength(1);
    expect(ctx.ops[0]).toMatchObject({ op: "drawImage", source: pixels, src: [16, 0, 16, 16], x: 10, y: 4, w: 16, h: 16 });
    expect(ctx.ops[0]?.smoothing).toBe(false);
  });

  test("flipX mirrors in place: the sprite still covers [x, x + w)", () => {
    const { s, ctx } = screen();
    s.draw(sprite, 20.2, 0, { flipX: true });
    const op = ctx.ops[0];
    expect(op).toMatchObject({ x: 20, y: 0, w: 16, h: 16 });
    expect(op?.m[0]).toBe(-1);
  });

  test("alpha scales the draw and does not leak into later draws", () => {
    const { s, ctx } = screen();
    s.draw(sprite, 0, 0, { alpha: 0.5 });
    s.draw(sprite, 0, 0);
    expect(ctx.ops.map((o) => o.alpha)).toEqual([0.5, 1]);
  });

  test("rotated draws are not snapped and rotate about the pivot", () => {
    const { s, ctx } = screen();
    s.draw(sprite, 10.25, 20.75, { rotate: { angle: Math.PI, pivotX: 8, pivotY: 8 } });
    const op = ctx.ops[0];
    // A 180° turn about the sprite's centre covers the same box.
    expect(op?.x).toBeCloseTo(10.25, 9);
    expect(op?.y).toBeCloseTo(20.75, 9);
    expect(op?.m[0]).toBeCloseTo(-1, 9);
  });

  test("0x0 sprites (empty sub-images) draw nothing", () => {
    const { s, ctx } = screen();
    s.draw(sub(whole(sheet), 64, 0, 80, 16), 0, 0);
    expect(ctx.ops).toHaveLength(0);
  });

  test("an image not decoded yet draws nothing instead of throwing", () => {
    const { s, ctx } = screen();
    s.draw(whole({ url: "x.png", width: 8, height: 8, image: null }), 0, 0);
    expect(ctx.ops).toHaveLength(0);
  });

  test("makeSolid sprites get their canvas lazily, on first draw, once", () => {
    const { s, ctx } = screen();
    const dot = makeSolid(3, 3, "#ffffff");
    expect(made).toHaveLength(0);
    s.draw(dot, 1, 1);
    s.draw(dot, 5, 5);
    expect(made).toHaveLength(1);
    expect(made[0]?.ctx.ops).toMatchObject([{ op: "fillRect", x: 0, y: 0, w: 3, h: 3, fill: "#ffffff" }]);
    expect(ctx.ops.map((o) => o.source)).toEqual([made[0], made[0]]);
  });
});

describe("offscreen surfaces", () => {
  test("constructing one touches no DOM; the canvas appears on first use", () => {
    setCanvasFactory(null);
    const off = Surface.offscreen(64, 80);
    expect([off.width, off.height]).toEqual([64, 80]);
  });

  test("drawSurface blits an offscreen surface with the same snapping", () => {
    const { s, ctx } = screen();
    const off = Surface.offscreen(8, 8);
    off.fill("#ff0000");
    s.drawSurface(off, 2.5, 2.5, { alpha: 0.5 });
    expect(ctx.ops[0]).toMatchObject({ op: "drawImage", source: made[0], src: [0, 0, 8, 8], x: 2, y: 2, w: 8, h: 8, alpha: 0.5 });
  });

  test("drawing a never-used offscreen surface is a no-op", () => {
    const { s, ctx } = screen();
    s.drawSurface(Surface.offscreen(8, 8), 0, 0);
    expect(ctx.ops).toHaveLength(0);
  });
});

describe("resize (D1)", () => {
  test("sets the logical size and re-applies imageSmoothingEnabled = false", () => {
    const { s, ctx } = screen(10, 10);
    s.resize(336, 428);
    expect([s.width, s.height]).toEqual([336, 428]);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    s.draw(sprite, 0, 0);
    expect(ctx.ops[0]?.smoothing).toBe(false);
  });

  test("resizing to the same size keeps the canvas contents", () => {
    const { canvas } = fakeCanvas(192, 176);
    const s = new Surface(canvas);
    let assigned = 0;
    const real = canvas as unknown as FakeCanvas;
    const proto = Object.getPrototypeOf(real) as object;
    const desc = Object.getOwnPropertyDescriptor(proto, "width");
    Object.defineProperty(real, "width", {
      get: () => desc?.get?.call(real) as number,
      set: (v: number) => {
        assigned++;
        desc?.set?.call(real, v);
      },
    });
    s.resize(192, 176);
    expect(assigned).toBe(0);
  });
});

describe("rect primitives", () => {
  test("clear() makes the whole surface transparent; fill() replaces every pixel", () => {
    const { s, ctx } = screen(20, 10);
    s.clear();
    s.fill("#123456");
    expect(ctx.ops).toMatchObject([
      { op: "clearRect", x: 0, y: 0, w: 20, h: 10 },
      { op: "clearRect", x: 0, y: 0, w: 20, h: 10 },
      { op: "fillRect", x: 0, y: 0, w: 20, h: 10, fill: "#123456", alpha: 1 },
    ]);
  });

  test("fillRect covers the pixels whose centres fall inside (snapped edges)", () => {
    const { s, ctx } = screen();
    s.fillRect(1.5, 2.25, 3, 2.5, "#ff0000");
    expect(ctx.ops[0]).toMatchObject({ op: "fillRect", x: 1, y: 2, w: 3, h: 3, fill: "#ff0000" });
  });

  test("fillPremul draws dst' = C + dst*(1-a): black at a/255, then rgb added with 'lighter' (D15)", () => {
    const { s, ctx } = screen();
    s.fillPremul(4.6, 8, 3, 3, { r: 114, g: 220, b: 187, a: 128 });
    expect(ctx.ops).toMatchObject([
      { op: "fillRect", x: 5, y: 8, w: 3, h: 3, fill: "#000000", alpha: 128 / 255, composite: "source-over" },
      { op: "fillRect", x: 5, y: 8, w: 3, h: 3, fill: "rgb(114, 220, 187)", alpha: 1, composite: "lighter" },
    ]);
    expect([ctx.globalAlpha, ctx.globalCompositeOperation]).toEqual([1, "source-over"]);
  });

  test("strokeRect outlines [x, x+w] x [y, y+h] with 1px premultiplied edges, no overlaps", () => {
    const { s, ctx } = screen();
    s.strokeRect(10, 20, 4, 3, { r: 0, g: 255, b: 0, a: 64 });
    const covered = new Map<string, number>();
    for (const o of ctx.ops.filter((o) => o.composite === "lighter")) {
      for (let x = o.x; x < o.x + o.w; x++)
        for (let y = o.y; y < o.y + o.h; y++) covered.set(`${x},${y}`, (covered.get(`${x},${y}`) ?? 0) + 1);
    }
    const expected = new Set<string>();
    for (let x = 10; x <= 14; x++) expected.add(`${x},20`).add(`${x},23`);
    for (let y = 20; y <= 23; y++) expected.add(`10,${y}`).add(`14,${y}`);
    expect(new Set(covered.keys())).toEqual(expected);
    expect([...covered.values()].every((n) => n === 1)).toBe(true);
  });

  test("line draws a 1px pixel line between the snapped endpoints", () => {
    const { s, ctx } = screen();
    s.line(0, 0, 3, 3, "#fff");
    expect(ctx.ops.map((o) => [o.x, o.y, o.w, o.h])).toEqual([
      [0, 0, 1, 1],
      [1, 1, 1, 1],
      [2, 2, 1, 1],
      [3, 3, 1, 1],
    ]);
  });

  test("fillCircle fills the pixels whose centres are inside the circle", () => {
    const { s, ctx } = screen();
    s.fillCircle(10, 10, 2, "#fff");
    const px = new Set<string>();
    for (const o of ctx.ops) for (let x = o.x; x < o.x + o.w; x++) px.add(`${x},${o.y}`);
    const expected = new Set<string>();
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) if ((x + 0.5 - 10) ** 2 + (y + 0.5 - 10) ** 2 <= 4) expected.add(`${x},${y}`);
    expect(px).toEqual(expected);
    expect(px.size).toBe(12);
  });

  test("clearRect clears a rect; toPNGDataURL reads the canvas", () => {
    const { s, ctx } = screen(64, 80);
    s.clearRect(0, 0, 64, 56);
    expect(ctx.ops[0]).toMatchObject({ op: "clearRect", x: 0, y: 0, w: 64, h: 56 });
    expect(s.toPNGDataURL()).toBe("data:image/png;fake,64x80");
  });
});
