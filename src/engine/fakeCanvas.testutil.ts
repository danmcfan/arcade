// Test-only stand-in for a canvas + 2D context (bun test has no DOM). It
// tracks the current transform and records each paint as a device-space
// operation, so tests assert on where pixels land, not on call sequences.

import { Surface } from "./surface.ts";

export interface PaintOp {
  op: "drawImage" | "fillRect" | "clearRect";
  /** Device-space axis-aligned bounds of the painted rect. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Device-space transform at paint time: [a, b, c, d, e, f]. */
  m: [number, number, number, number, number, number];
  alpha: number;
  composite: string;
  fill: string;
  smoothing: boolean;
  /** Device-space clip rect at paint time, `null` when unclipped. */
  clip: Rect | null;
  /** drawImage only. */
  source?: unknown;
  src?: [number, number, number, number];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type M = [number, number, number, number, number, number];
const IDENTITY: M = [1, 0, 0, 1, 0, 0];

function mul(m: M, n: M): M {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export class FakeContext {
  ops: PaintOp[] = [];
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  fillStyle = "#000000";
  imageSmoothingEnabled = true;
  private m: M = [...IDENTITY];
  private clipRect: Rect | null = null;
  private path: Rect[] = [];
  private stack: Array<{
    m: M;
    alpha: number;
    composite: string;
    fill: string;
    smoothing: boolean;
    clip: Rect | null;
  }> = [];

  readonly canvas: FakeCanvas;

  constructor(canvas: FakeCanvas) {
    this.canvas = canvas;
  }

  /** What assigning canvas.width/height does to a real context. */
  resetState(): void {
    this.globalAlpha = 1;
    this.globalCompositeOperation = "source-over";
    this.fillStyle = "#000000";
    this.imageSmoothingEnabled = true;
    this.m = [...IDENTITY];
    this.clipRect = null;
    this.path = [];
    this.stack = [];
  }

  save(): void {
    this.stack.push({
      m: [...this.m],
      alpha: this.globalAlpha,
      composite: this.globalCompositeOperation,
      fill: this.fillStyle,
      smoothing: this.imageSmoothingEnabled,
      clip: this.clipRect,
    });
  }
  restore(): void {
    const s = this.stack.pop();
    if (!s) return;
    this.m = s.m;
    this.globalAlpha = s.alpha;
    this.globalCompositeOperation = s.composite;
    this.fillStyle = s.fill;
    this.imageSmoothingEnabled = s.smoothing;
    this.clipRect = s.clip;
  }
  beginPath(): void {
    this.path = [];
  }
  /** Records the rect in device space; only axis-aligned rect paths are faked. */
  rect(x: number, y: number, w: number, h: number): void {
    this.path.push(this.bounds(x, y, w, h));
  }
  /** Intersects the clip with the path (one rect; the tests need no more). */
  clip(): void {
    const r = this.path[0];
    if (r === undefined) return;
    const c = this.clipRect;
    if (c === null) {
      this.clipRect = r;
      return;
    }
    const x = Math.max(c.x, r.x);
    const y = Math.max(c.y, r.y);
    this.clipRect = {
      x,
      y,
      w: Math.max(0, Math.min(c.x + c.w, r.x + r.w) - x),
      h: Math.max(0, Math.min(c.y + c.h, r.y + r.h) - y),
    };
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.m = [a, b, c, d, e, f];
  }
  resetTransform(): void {
    this.m = [...IDENTITY];
  }
  translate(x: number, y: number): void {
    this.m = mul(this.m, [1, 0, 0, 1, x, y]);
  }
  scale(x: number, y: number): void {
    this.m = mul(this.m, [x, 0, 0, y, 0, 0]);
  }
  rotate(a: number): void {
    const c = Math.cos(a);
    const s = Math.sin(a);
    this.m = mul(this.m, [c, s, -s, c, 0, 0]);
  }

  private bounds(x: number, y: number, w: number, h: number): Rect {
    const pts = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ].map(([px = 0, py = 0]) => [
      this.m[0] * px + this.m[2] * py + this.m[4],
      this.m[1] * px + this.m[3] * py + this.m[5],
    ]);
    const xs = pts.map((p) => p[0] ?? 0);
    const ys = pts.map((p) => p[1] ?? 0);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
  }

  private record(op: PaintOp["op"], x: number, y: number, w: number, h: number, extra: Partial<PaintOp> = {}): void {
    this.ops.push({
      op,
      ...this.bounds(x, y, w, h),
      m: [...this.m],
      alpha: this.globalAlpha,
      composite: this.globalCompositeOperation,
      fill: this.fillStyle,
      smoothing: this.imageSmoothingEnabled,
      clip: this.clipRect,
      ...extra,
    });
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.record("fillRect", x, y, w, h);
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this.record("clearRect", x, y, w, h);
  }
  drawImage(
    source: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    this.record("drawImage", dx, dy, dw, dh, { source, src: [sx, sy, sw, sh] });
  }
}

export class FakeCanvas {
  private w: number;
  private h: number;
  readonly ctx: FakeContext;
  constructor(width = 300, height = 150) {
    this.w = width;
    this.h = height;
    this.ctx = new FakeContext(this);
  }
  get width(): number {
    return this.w;
  }
  set width(v: number) {
    this.w = v;
    this.ctx.resetState();
  }
  get height(): number {
    return this.h;
  }
  set height(v: number) {
    this.h = v;
    this.ctx.resetState();
  }
  getContext(type: string): FakeContext | null {
    return type === "2d" ? this.ctx : null;
  }
  toDataURL(): string {
    return `data:image/png;fake,${this.w}x${this.h}`;
  }
}

/**
 * Lets a FakeCanvas stand in for the DOM canvas the Surface expects. It checks
 * the members the Surface uses; the rest of HTMLCanvasElement is not faked.
 */
function standsInForCanvas(c: FakeCanvas | HTMLCanvasElement): c is HTMLCanvasElement {
  return typeof c.getContext === "function" && typeof c.width === "number" && typeof c.height === "number";
}

/** `c`, typed as the DOM canvas the Surface expects. */
export function canvasElement(c: FakeCanvas): HTMLCanvasElement {
  if (!standsInForCanvas(c)) throw new Error("FakeCanvas lacks the canvas members Surface uses");
  return c;
}

/** Typed as the DOM canvas the Surface expects. */
export function fakeCanvas(width?: number, height?: number): { canvas: HTMLCanvasElement; ctx: FakeContext } {
  const c = new FakeCanvas(width, height);
  return { canvas: canvasElement(c), ctx: c.ctx };
}

/**
 * A lazy offscreen Surface with some methods replaced, for tests that record
 * calls. Methods left alone need a canvas factory (see `setCanvasFactory`).
 */
export function stubSurface<K extends keyof Surface>(overrides: Pick<Surface, K>, w = 0, h = 0): Surface {
  // A clip only runs its draws unless the test overrides it.
  const passThrough: Pick<Surface, "clipped"> = {
    clipped: (_x, _y, _w, _h, draw) => {
      draw();
    },
  };
  return Object.assign(Surface.offscreen(w, h), passThrough, overrides);
}
