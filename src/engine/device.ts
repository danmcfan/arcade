// Is this a touch-first device (a phone or tablet with no keyboard)? The
// arcade only reads the keyboard, so main.ts shows a "needs a keyboard"
// notice on one (src/ui/notice.ts). DOM-free: main.ts reads `matchMedia` and
// the window size and passes them in.

export interface TouchSignals {
  /**
   * `(pointer: coarse) and (hover: none)` matches: true; a fine pointer or
   * hover is available: false; the browser reports neither: null.
   */
  coarseNoHover: boolean | null;
  /** Viewport size in CSS px. */
  width: number;
  height: number;
}

/** A viewport whose shortest side is under this many CSS px counts as small. */
export const smallViewport = 768;

/**
 * The pointer decides; the viewport size only breaks a tie, when the browser
 * reports neither a coarse, hover-less pointer nor a fine one or hover.
 */
export function looksTouchFirst({ coarseNoHover, width, height }: TouchSignals): boolean {
  if (coarseNoHover !== null) return coarseNoHover;
  return Math.min(width, height) < smallViewport;
}

/** The `coarseNoHover` signal from a `matchMedia` (browser only). */
export function readPointer(matchMedia: (query: string) => { matches: boolean }): boolean | null {
  if (matchMedia("(pointer: coarse) and (hover: none)").matches) return true;
  if (matchMedia("(pointer: fine)").matches || matchMedia("(hover: hover)").matches) return false;
  return null;
}
