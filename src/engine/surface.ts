// Go-engine-shaped draw API over Canvas 2D (§3.2). The signatures here are
// the contract every porter draws against.
//
// Rules: `imageSmoothingEnabled = false` on every context, re-applied after
// every resize (D1). Every unrotated `draw`/`fillRect` snaps its final
// translate with `snap()` (D13). Translucent Go `color.RGBA` values are
// premultiplied and go through `fillPremul`/`strokeRect` (D15).
//
// Headless-first (D12): constructing an offscreen `Surface` or a `makeSolid`
// sprite touches no DOM; their canvases are created on first use.

import type { Sprite } from "./image.ts";

/** Premultiplied Go `color.RGBA`, components 0..255. */
export interface PremulColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface DrawOpts {
  /** `GeoM.Scale(-1, 1)` then `Translate(w, 0)`, applied before x/y. */
  flipX?: boolean;
  /**
   * `Translate(-pivot)`, `Rotate(angle)`, `Translate(+pivot)`, applied before
   * x/y. Instead of snapping, the quad corners go where the Go engine's
   * vertex adjustment puts them (`rotatedTransform`, D13). An angle of 0 is
   * a plain, snapped draw (Go's `Rotate(0)` is a no-op).
   */
  rotate?: { angle: number; pivotX: number; pivotY: number };
  /** `ColorScale.ScaleAlpha`, 0..1. */
  alpha?: number;
}

/**
 * Where the Go engine puts a vertex at fractional `v` (fact 11, D13 as settled
 * by the Phase 4 golden frames). `DrawImage` passes every vertex through
 * `adjustDestinationPixel` (the Go engine's `graphics/vertex.go`), which
 * moves a fraction below 0.5 to 0 or 5/16 and one at or above 0.5 to 11/16
 * or 1, so the first covered pixel centre is `floor(v + 0.5)`: half rounds
 * up. The GeoM translate is a float32, hence `Math.fround`. Never `-0`.
 */
export function snap(v: number): number {
  return Math.floor(Math.fround(v) + 0.5) + 0;
}

/**
 * the Go engine's `adjustDestinationPixel` (`graphics/vertex.go`), in
 * float32 like the vertex buffer: a vertex fraction in [0, 3/16) goes to 0,
 * [3/16, 1/2) to 5/16, [1/2, 13/16) to 11/16 and the rest to 1.
 */
function adjustDestinationPixel(v: number): number {
  const x = Math.fround(v);
  const ix = Math.floor(x);
  const frac = Math.fround(x - ix);
  if (frac < 3 / 16) return ix;
  if (frac < 8 / 16) return ix + 5 / 16;
  if (frac < 13 / 16) return ix + 11 / 16;
  return ix + 1;
}

/**
 * Canvas transform for a rotated `DrawImage` of a `w × h` source (D13 as
 * settled in Phase 4). Builds the GeoM in float64 in Go's order
 * (`[Scale(-1,1) Translate(w,0)]`, `Translate(-p) Rotate(θ) Translate(p)`,
 * `Translate(x, y)`), converts it to float32 and places the quad corners
 * where the Go engine's vertex buffer puts them (`QuadVerticesFromSrcAndMatrix`
 * plus `adjustDestinationPixel`). The returned affine maps source (0,0),
 * (w,0) and (0,h) onto those adjusted corners, so canvas nearest-neighbour
 * sampling at pixel centres picks the same texels as the Go engine's GPU
 * (The Go engine splits the quad into two triangles whose fourth corner can sit
 * a fraction of a pixel off this parallelogram; the golden lumberjack frames
 * do not show the difference).
 */
function rotatedTransform(
  w: number,
  h: number,
  x: number,
  y: number,
  rot: { angle: number; pivotX: number; pivotY: number },
  flipX: boolean,
): [number, number, number, number, number, number] {
  // GeoM fields a, b, c, d, tx, ty (x' = a·x + b·y + tx, y' = c·x + d·y + ty).
  let [a, b, c, d, tx, ty] = [1, 0, 0, 1, 0, 0];
  if (flipX) {
    a = -1;
    tx = w;
  }
  tx -= rot.pivotX;
  ty -= rot.pivotY;
  const sin = Math.sin(rot.angle);
  const cos = Math.cos(rot.angle);
  [a, b, tx, c, d, ty] = [
    cos * a - sin * c,
    cos * b - sin * d,
    cos * tx - sin * ty,
    sin * a + cos * c,
    sin * b + cos * d,
    sin * tx + cos * ty,
  ];
  tx += rot.pivotX + x;
  ty += rot.pivotY + y;
  const f = Math.fround;
  [a, b, c, d, tx, ty] = [f(a), f(b), f(c), f(d), f(tx), f(ty)];
  const x0 = adjustDestinationPixel(tx);
  const y0 = adjustDestinationPixel(ty);
  const x1 = adjustDestinationPixel(f(f(a * w) + tx));
  const y1 = adjustDestinationPixel(f(f(c * w) + ty));
  const x2 = adjustDestinationPixel(f(f(b * h) + tx));
  const y2 = adjustDestinationPixel(f(f(d * h) + ty));
  return [(x1 - x0) / w, (y1 - y0) / w, (x2 - x0) / h, (y2 - y0) / h, x0, y0];
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type CanvasFactory = (w: number, h: number) => Canvas;

function defaultCanvasFactory(w: number, h: number): Canvas {
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  throw new Error("Surface: no canvas available (draw is browser only, D12)");
}

let canvasFactory: CanvasFactory = defaultCanvasFactory;

/**
 * Seam for tests (bun test has no DOM): replace how lazily created canvases
 * (offscreen surfaces, `makeSolid` images) are made. `null` restores the
 * default (`document.createElement("canvas")`, else `OffscreenCanvas`).
 */
export function setCanvasFactory(factory: CanvasFactory | null): void {
  canvasFactory = factory ?? defaultCanvasFactory;
}

function context2d(canvas: Canvas): Context {
  const ctx = canvas.getContext("2d") as Context | null;
  if (ctx === null) throw new Error("Surface: 2D context unavailable");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** The canvas behind a `makeSolid` sprite, created and filled on first draw. */
function solidSource(s: Sprite): CanvasImageSource | null {
  const asset = s.asset;
  if (asset.image !== null) return asset.image;
  if (asset.solid === undefined) return null;
  const canvas = canvasFactory(asset.width, asset.height);
  const ctx = context2d(canvas);
  ctx.fillStyle = asset.solid;
  ctx.fillRect(0, 0, asset.width, asset.height);
  asset.image = canvas;
  return canvas;
}

export class Surface {
  private canvas: Canvas | null;
  private ctx: Context | null = null;
  private w: number;
  private h: number;

  /**
   * Wraps a canvas (the visible screen or an offscreen one). Never call this
   * at import time or from `update()`/`snapshot()` (D12).
   */
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas);
  /** @internal Lazy offscreen surface: see `Surface.offscreen`. */
  constructor(canvas: null, w: number, h: number);
  constructor(canvas: Canvas | null, w?: number, h?: number) {
    this.canvas = canvas;
    this.w = canvas?.width ?? w ?? 0;
    this.h = canvas?.height ?? h ?? 0;
  }

  /**
   * Go `NewImage(w, h)`: a transparent offscreen surface. Safe to call
   * with no DOM (e.g. in a scene constructor); the canvas is created on first
   * use.
   */
  static offscreen(w: number, h: number): Surface {
    return new Surface(null, w, h);
  }

  get width(): number {
    return this.w;
  }

  get height(): number {
    return this.h;
  }

  /** The 2D context, creating the canvas first for a lazy offscreen surface. */
  private context(): Context {
    if (this.ctx !== null) return this.ctx;
    if (this.canvas === null) this.canvas = canvasFactory(this.w, this.h);
    this.ctx = context2d(this.canvas);
    return this.ctx;
  }

  /**
   * Screen only: set the logical resolution (the loop calls this when
   * `scene.layout()` changes). Re-applies `imageSmoothingEnabled = false`.
   * A no-op when the size is unchanged (assigning a canvas size clears it).
   */
  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    if (this.canvas === null) return;
    this.canvas.width = w;
    this.canvas.height = h;
    // D1: every size assignment resets the context state.
    this.context().imageSmoothingEnabled = false;
  }

  /** Clear to transparent (D1: frames are never filled black). */
  clear(): void {
    const ctx = this.context();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
  }

  /** `Image.Fill`: replace every pixel with an opaque colour. */
  fill(css: string): void {
    this.clear();
    const ctx = this.context();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
  }

  /**
   * `DrawImage(s, op)` where `x, y` is the final `GeoM` translate. Snapped
   * unless rotated (rotated corners follow `rotatedTransform`); a no-op for 0×0 sprites and for images not decoded yet.
   */
  draw(s: Sprite, x: number, y: number, opts?: DrawOpts): void {
    if (s.w <= 0 || s.h <= 0) return;
    const source = solidSource(s);
    if (source === null) return;
    this.blit(source, s.sx, s.sy, s.w, s.h, x, y, opts);
  }

  /** `DrawImage` with another surface (an offscreen Go `Image`) as source. */
  drawSurface(src: Surface, x: number, y: number, opts?: DrawOpts): void {
    // A surface that was never drawn to is fully transparent.
    if (src.canvas === null || src.w <= 0 || src.h <= 0) return;
    this.blit(src.canvas, 0, 0, src.w, src.h, x, y, opts);
  }

  private blit(
    source: CanvasImageSource,
    sx: number,
    sy: number,
    w: number,
    h: number,
    x: number,
    y: number,
    opts: DrawOpts | undefined,
  ): void {
    const ctx = this.context();
    ctx.save();
    ctx.globalAlpha = opts?.alpha ?? 1;
    const rot = opts?.rotate;
    // GeoM.Rotate(0) is a no-op in Go, so an angle of 0 is a plain draw.
    if (rot && rot.angle !== 0) {
      ctx.setTransform(...rotatedTransform(w, h, x, y, rot, opts?.flipX ?? false));
    } else {
      ctx.setTransform(1, 0, 0, 1, snap(x), snap(y));
      if (opts?.flipX) {
        // GeoM: Scale(-1, 1) then Translate(w, 0), applied first.
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
    }
    ctx.drawImage(source, sx, sy, w, h, 0, 0, w, h);
    ctx.restore();
  }

  /**
   * Fill a non-antialiased rect with edges at `snap(x)` and `snap(x + w)`,
   * the same rule as a sprite's vertices (half rounds up).
   */
  private pixelRect(
    x: number,
    y: number,
    w: number,
    h: number,
    paint: (ctx: Context, x: number, y: number, w: number, h: number) => void,
  ): void {
    const x0 = snap(x);
    const y0 = snap(y);
    const x1 = snap(x + w);
    const y1 = snap(y + h);
    if (x1 <= x0 || y1 <= y0) return;
    const ctx = this.context();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paint(ctx, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
  }

  /** Opaque rectangle on a snapped rect (`vector.FillRect` with an opaque colour). */
  fillRect(x: number, y: number, w: number, h: number, css: string): void {
    this.pixelRect(x, y, w, h, (ctx, px, py, pw, ph) => {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = css;
      ctx.fillRect(px, py, pw, ph);
    });
  }

  /**
   * D15: `dst' = C + dst*(1 - a/255)` on a snapped rect, alpha included.
   *
   * A valid premultiplied colour (`r, g, b <= a`) is plain source-over of its
   * straight colour `rgb(r*255/a, ...)` at alpha `a/255`, which is exact over
   * any destination, transparent included (the hub debug panel hangs over
   * the transparent +120 strip).
   *
   * An "invalid" one (a component above `a`: hive particles, the debug
   * overlay, fact 10) cannot be expressed as source-over: black at alpha
   * `a/255`, then `rgb(r,g,b)` added with "lighter". Exact on an opaque
   * destination; on a transparent one the result is opaque, where Go would
   * leave an invalid premultiplied pixel.
   */
  fillPremul(x: number, y: number, w: number, h: number, c: PremulColor): void {
    const valid = c.r <= c.a && c.g <= c.a && c.b <= c.a;
    if (valid && c.a === 0) return;
    this.pixelRect(x, y, w, h, (ctx, px, py, pw, ph) => {
      ctx.globalCompositeOperation = "source-over";
      if (valid) {
        const k = 255 / c.a;
        ctx.globalAlpha = c.a / 255;
        ctx.fillStyle = `rgb(${c.r * k}, ${c.g * k}, ${c.b * k})`;
        ctx.fillRect(px, py, pw, ph);
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = c.a / 255;
      ctx.fillStyle = "#000000";
      ctx.fillRect(px, py, pw, ph);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
      ctx.fillRect(px, py, pw, ph);
    });
  }

  /**
   * `vector.StrokeRect`, 1 px, premultiplied colour. Debug only. Outlines the
   * pixels of `[x, x+w] × [y, y+h]` inclusive, so Go's
   * `StrokeRect(x, y, w-1, h-1)` outlines exactly a `w × h` box. Edges do not
   * overlap, so corners blend once. Phase 4 confirms the pixel rule.
   */
  strokeRect(x: number, y: number, w: number, h: number, c: PremulColor): void {
    this.fillPremul(x, y, w + 1, 1, c);
    if (h <= 0) return;
    this.fillPremul(x, y + h, w + 1, 1, c);
    if (h > 1) {
      this.fillPremul(x, y + 1, 1, h - 1, c);
      if (w > 0) this.fillPremul(x + w, y + 1, 1, h - 1, c);
    }
  }

  /**
   * `vector.StrokeLine`, 1 px. Debug only. Bresenham between the snapped
   * endpoints (crisp, no antialiasing); Phase 4 confirms the pixel rule.
   */
  line(x1: number, y1: number, x2: number, y2: number, css: string): void {
    let x = snap(x1);
    let y = snap(y1);
    const xe = snap(x2);
    const ye = snap(y2);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.fillRect(x, y, 1, 1, css);
      if (x === xe && y === ye) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * `vector.FillCircle`. Debug only. Fills each pixel whose centre is within
   * `r` of `(x, y)`, one row at a time.
   */
  fillCircle(x: number, y: number, r: number, css: string): void {
    if (r <= 0) return;
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
      const dy = py + 0.5 - y;
      const span = r * r - dy * dy;
      if (span < 0) continue;
      const dx = Math.sqrt(span);
      const x0 = Math.ceil(x - dx - 0.5);
      const x1 = Math.floor(x + dx - 0.5);
      if (x1 >= x0) this.fillRect(x0, py, x1 - x0 + 1, 1, css);
    }
  }

  /** Make a rectangle transparent (lumberjack's init-time pixel clears). */
  clearRect(x: number, y: number, w: number, h: number): void {
    this.pixelRect(x, y, w, h, (ctx, px, py, pw, ph) => ctx.clearRect(px, py, pw, ph));
  }

  /**
   * PNG data URL of the surface at logical resolution. Needs an
   * `HTMLCanvasElement` (the screen, or an offscreen surface in a page).
   */
  toPNGDataURL(): string {
    this.context();
    const canvas = this.canvas;
    if (canvas === null || !("toDataURL" in canvas)) {
      throw new Error("Surface.toPNGDataURL: needs an HTMLCanvasElement");
    }
    return canvas.toDataURL("image/png");
  }
}
