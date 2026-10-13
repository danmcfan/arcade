// Port of internal/lumberjack/tree.go.

import { Surface } from "../../engine/surface.ts";
import { colorRed, drawHitbox, type Hitbox } from "./hitbox.ts";
import { debug } from "./constants.ts";
import { Spritesheet, mustFrame } from "./sprite.ts";

const splitHeight = 56;

const pivotXLeft = 26.0;
const pivotXRight = 37.0;
const pivotY = 58.0;

// Go untyped constants `radians * 4.0` and `radians * 0.25` (radians =
// math.Pi / 180.0), folded exactly at compile time and rounded once; the
// literals are the values Go prints (tree.test.ts).
export const thetaMax = 0.06981317007977318;
export const thetaInterval = 0.004363323129985824;

export const oakTreeBigSpritesheet = new Spritesheet("Trees/Big_Oak_Tree.png", 64, 80);
// Go also loads `Trees/Oak_Leaf_Particle.png` (16x16) and the trunk (0,0) and
// canopy (2,0) frames, but never draws them: not ported (docs/port-notes.md).

/**
 * Go `treeBottomFrame` / `treeTopFrame`: two copies of frame (1, 0), with
 * rows [0, 56) cleared on the bottom and rows [56, 80) cleared on the top
 * (the `init()` pixel writes). Built lazily on first draw (D12).
 */
let splitFrames: { bottom: Surface; top: Surface } | null = null;

function treeSplitFrames(): { bottom: Surface; top: Surface } {
  if (splitFrames === null) {
    const frame = mustFrame(oakTreeBigSpritesheet, 1, 0);
    const w = oakTreeBigSpritesheet.width;
    const h = oakTreeBigSpritesheet.height;

    const bottom = Surface.offscreen(w, h);
    bottom.draw(frame, 0, 0);
    bottom.clearRect(0, 0, w, splitHeight);

    const top = Surface.offscreen(w, h);
    top.draw(frame, 0, 0);
    top.clearRect(0, splitHeight, w, h - splitHeight);

    splitFrames = { bottom, top };
  }
  return splitFrames;
}

export class Tree {
  positionX: number;
  positionY: number;

  shaking = false;
  shakeRight = false;

  theta = 0.0;
  thetaIncreasing = false;

  behind = false;
  transparent = false;

  /** 0-100; goes negative when chopped past 0. */
  health: number;

  /** Go `NewTree(positionX, positionY)`. */
  constructor(positionX: number, positionY: number) {
    this.positionX = positionX;
    this.positionY = positionY;
    this.health = 100.0;
  }

  minX(): number {
    return this.positionX - oakTreeBigSpritesheet.width / 2;
  }

  minY(): number {
    return this.positionY - oakTreeBigSpritesheet.height / 2;
  }

  hitbox(): Hitbox {
    const offsetX = 24.0;
    const offsetY = 56.0;
    const hitboxWidth = 16.0;
    const hitboxHeight = 8.0;

    return { x: this.minX() + offsetX, y: this.minY() + offsetY, w: hitboxWidth, h: hitboxHeight };
  }

  shake(right: boolean): void {
    this.shaking = true;
    this.shakeRight = right;
    this.thetaIncreasing = right;
  }

  pivotX(): number {
    if (this.shakeRight) {
      return pivotXRight;
    }
    return pivotXLeft;
  }

  update(): void {
    if (!this.shaking) {
      return;
    }

    if (this.thetaIncreasing) {
      this.theta += thetaInterval;
    } else {
      this.theta -= thetaInterval;
    }

    if (this.shakeRight) {
      if (this.theta >= thetaMax) {
        this.theta = thetaMax;
        this.thetaIncreasing = false;
      }

      if (this.theta <= 0.0) {
        this.theta = 0.0;
        this.shaking = false;
      }
    } else {
      if (this.theta <= -thetaMax) {
        this.theta = -thetaMax;
        this.thetaIncreasing = true;
      }

      if (this.theta >= 0.0) {
        this.theta = 0.0;
        this.shaking = false;
      }
    }
  }

  draw(screen: Surface): void {
    if (this.health <= 0) {
      return;
    }

    const { bottom, top } = treeSplitFrames();
    // `ColorScale.ScaleAlpha(0.5)` when transparent (1 is the identity);
    // `GeoM.Scale(scale, scale)` is the identity (scale = 1).
    const alpha = this.transparent ? 0.5 : 1;

    screen.drawSurface(bottom, this.minX(), this.minY(), { alpha });

    // Translate(-pivot) Rotate(theta) Translate(+pivot), then the tree's
    // position. Rotated corners follow the Go engine's vertex adjustment (D13).
    screen.drawSurface(top, this.minX(), this.minY(), {
      rotate: { angle: this.theta, pivotX: this.pivotX(), pivotY },
      alpha,
    });

    if (debug) {
      drawHitbox(screen, this.hitbox(), colorRed);
    }
  }
}
