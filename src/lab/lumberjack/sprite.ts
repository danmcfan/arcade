// Port of internal/lumberjack/sprite.go. DOM-free: a spritesheet is a
// descriptor over an `ImageAsset` whose size is hard-coded in assets.ts (D12).

import { lumberjackImages, type LumberjackImagePath } from "../../engine/assets.ts";
import { sub, whole, type Sprite } from "../../engine/image.ts";

export class Spritesheet {
  readonly image: Sprite;
  readonly width: number;
  readonly height: number;
  readonly maxX: number;
  readonly maxY: number;

  /** Go `NewSpritesheet(filepath, width, height)`; `filepath` is relative to `images/`. */
  constructor(filepath: LumberjackImagePath, width: number, height: number) {
    this.image = whole(lumberjackImages[filepath]);
    this.width = width;
    this.height = height;
    // Go int division.
    this.maxX = Math.trunc(this.image.w / width);
    this.maxY = Math.trunc(this.image.h / height);
  }

  /** Go `Frame(x, y)`: the frame's sub-image, or null (Go nil) when out of range. */
  frame(x: number, y: number): Sprite | null {
    if (x < 0 || x >= this.maxX || y < 0 || y >= this.maxY) {
      return null;
    }
    return sub(this.image, x * this.width, y * this.height, (x + 1) * this.width, (y + 1) * this.height);
  }
}

/**
 * A frame that is about to be drawn. Go passes `Frame`'s nil straight to
 * `DrawImage`, which panics; unreachable with the current sheets, so throw.
 */
export function mustFrame(sheet: Spritesheet, x: number, y: number): Sprite {
  const f = sheet.frame(x, y);
  if (f === null) {
    throw new Error(`lumberjack: spritesheet frame (${x}, ${y}) out of range (${sheet.maxX}x${sheet.maxY})`);
  }
  return f;
}
