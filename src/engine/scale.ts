// Viewport fit (D1). The canvas renders at logical resolution and is
// upscaled by CSS with `image-rendering: pixelated`. The scale is chosen in
// **device** pixels so pixels stay crisp on 125%/150% displays.

export interface Fit {
  /**
   * Device pixels per logical pixel (an integer `k ≥ 1`), or for a fractional
   * fallback the CSS px per logical pixel.
   */
  scale: number;
  integer: boolean;
  /** CSS size to give the canvas element. */
  cssWidth: number;
  cssHeight: number;
}

const EPSILON = 1e-9;

/**
 * Largest integer `k ≥ 1` such that `k * logical / dpr` fits the viewport
 * (CSS px); CSS size = `k * logical / dpr`. If even `k = 1` does not fit,
 * fit to the viewport with a fractional downscale.
 */
export function fitScale(
  logicalW: number,
  logicalH: number,
  viewportW: number,
  viewportH: number,
  dpr: number,
): Fit {
  const k = Math.floor(Math.min((viewportW * dpr) / logicalW, (viewportH * dpr) / logicalH) + EPSILON);
  if (k >= 1) {
    return { scale: k, integer: true, cssWidth: (k * logicalW) / dpr, cssHeight: (k * logicalH) / dpr };
  }
  const s = Math.min(viewportW / logicalW, viewportH / logicalH);
  return { scale: s, integer: false, cssWidth: logicalW * s, cssHeight: logicalH * s };
}
