// Ebitengine-shaped draw API over Canvas 2D (§3.2). Implemented by T3
// (engine); the signatures here are the contract every porter draws against.
//
// Rules: `imageSmoothingEnabled = false` on every context, re-applied after
// every resize (D1). Every unrotated `draw`/`fillRect` snaps its final
// translate with `snap()` (D13). Translucent Go `color.RGBA` values are
// premultiplied and go through `fillPremul`/`strokeRect` (D15).

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
   * x/y. Disables snapping (D13).
   */
  rotate?: { angle: number; pivotX: number; pivotY: number };
  /** `ColorScale.ScaleAlpha`, 0..1. */
  alpha?: number;
}

/**
 * Ebitengine's nearest-filter result for a fractional translate (fact 11,
 * D13): `Math.ceil(v - 0.5)`, normalized so it never returns `-0`.
 */
export function snap(v: number): number {
  return Math.ceil(v - 0.5) + 0;
}

export class Surface {
  /**
   * Wraps a canvas (the visible screen or an offscreen one). Never call this
   * at import time or from `update()`/`snapshot()` (D12).
   */
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    throw new Error("TODO");
  }

  /** `ebiten.NewImage(w, h)`: a transparent offscreen surface. */
  static offscreen(w: number, h: number): Surface {
    throw new Error("TODO");
  }

  get width(): number {
    throw new Error("TODO");
  }

  get height(): number {
    throw new Error("TODO");
  }

  /**
   * Screen only: set the logical resolution (the loop calls this when
   * `scene.layout()` changes). Re-applies `imageSmoothingEnabled = false`.
   */
  resize(w: number, h: number): void {
    throw new Error("TODO");
  }

  /** Clear to transparent (D1: frames are never filled black). */
  clear(): void {
    throw new Error("TODO");
  }

  /** `Image.Fill`: replace every pixel with an opaque colour. */
  fill(css: string): void {
    throw new Error("TODO");
  }

  /**
   * `DrawImage(s, op)` where `x, y` is the final `GeoM` translate. Snapped
   * unless rotated; a no-op for 0×0 sprites.
   */
  draw(s: Sprite, x: number, y: number, opts?: DrawOpts): void {
    throw new Error("TODO");
  }

  /** `DrawImage` with another surface (an offscreen `ebiten.Image`) as source. */
  drawSurface(src: Surface, x: number, y: number, opts?: DrawOpts): void {
    throw new Error("TODO");
  }

  /** Opaque rectangle on a snapped rect (`vector.FillRect` with an opaque colour). */
  fillRect(x: number, y: number, w: number, h: number, css: string): void {
    throw new Error("TODO");
  }

  /** D15: `dst' = C + dst*(1 - a/255)` on a snapped rect. */
  fillPremul(x: number, y: number, w: number, h: number, c: PremulColor): void {
    throw new Error("TODO");
  }

  /** `vector.StrokeRect`, 1 px, premultiplied colour. Debug only. */
  strokeRect(x: number, y: number, w: number, h: number, c: PremulColor): void {
    throw new Error("TODO");
  }

  /** `vector.StrokeLine`, 1 px. Debug only. */
  line(x1: number, y1: number, x2: number, y2: number, css: string): void {
    throw new Error("TODO");
  }

  /** `vector.FillCircle`. Debug only. */
  fillCircle(x: number, y: number, r: number, css: string): void {
    throw new Error("TODO");
  }

  /** Make a rectangle transparent (lumberjack's init-time pixel clears). */
  clearRect(x: number, y: number, w: number, h: number): void {
    throw new Error("TODO");
  }

  /** PNG data URL of the surface at logical resolution. */
  toPNGDataURL(): string {
    throw new Error("TODO");
  }
}
