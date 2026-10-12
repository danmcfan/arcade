// Image descriptors and sprites (§3.2, D12). Everything here is DOM-free:
// pixels are attached later, in the browser only.

/**
 * A loadable image. `width`/`height` are hard-coded in `assets.ts` (checked
 * against the PNG headers by a unit test) so layout and game code can read
 * sizes under `bun test`, which has no DOM.
 *
 * `image` is `null` until `loadImages()` decodes it in the browser. It is
 * typed `CanvasImageSource` (not just `HTMLImageElement`) so solids from
 * `makeSolid` can attach their lazily created canvas the same way.
 */
export interface ImageAsset {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  image: CanvasImageSource | null;
  /** Set by `makeSolid`: CSS fill colour of a generated solid image. */
  readonly solid?: string;
}

/**
 * The TS equivalent of a Go `*Image` used as a draw source: an asset plus
 * a source rectangle in the asset's (root) pixel coordinates.
 */
export interface Sprite {
  readonly asset: ImageAsset;
  readonly sx: number;
  readonly sy: number;
  readonly w: number;
  readonly h: number;
}

/** The whole asset as a sprite (a Go `*Image` loaded from a PNG). */
export function whole(asset: ImageAsset): Sprite {
  return { asset, sx: 0, sy: 0, w: asset.width, h: asset.height };
}

/**
 * Go `SubImage(image.Rect(x0, y0, x1, y1))`. Coordinates are in the
 * **root asset's** space, as with Go sub-images (a sub-image of a sub-image
 * still uses the original image's coordinates). Corners are canonicalized
 * like `image.Rect`, then intersected with `s`'s bounds. An empty
 * intersection gives a 0×0 sprite, which `Surface.draw` skips.
 */
export function sub(s: Sprite, x0: number, y0: number, x1: number, y1: number): Sprite {
  const minX = Math.max(Math.min(x0, x1), s.sx);
  const minY = Math.max(Math.min(y0, y1), s.sy);
  const maxX = Math.min(Math.max(x0, x1), s.sx + s.w);
  const maxY = Math.min(Math.max(y0, y1), s.sy + s.h);
  if (minX >= maxX || minY >= maxY) {
    return { asset: s.asset, sx: 0, sy: 0, w: 0, h: 0 };
  }
  return { asset: s.asset, sx: minX, sy: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Go `NewImage(w, h)` + `Fill(css)`. Returns a descriptor only; the
 * backing canvas is created lazily by `Surface.draw` on first draw (D12).
 */
export function makeSolid(w: number, h: number, css: string): Sprite {
  return whole({ url: "", width: w, height: h, image: null, solid: css });
}
