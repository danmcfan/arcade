// Port of internal/lumberjack/player.go.

import type { Direction } from "../../engine/input.ts";
import type { DrawOpts, Surface } from "../../engine/surface.ts";
import { debug, height, width } from "./constants.ts";
import { colorPink, colorRed, drawHitbox, overlaps, resolve, type Hitbox } from "./hitbox.ts";
import { Spritesheet, mustFrame } from "./sprite.ts";
import type { Tree } from "./tree.ts";

const spriteWidth = 64;
const spriteHeight = 64;

const baseSpeed = 2.0;

export const BaseSpritesheet = new Spritesheet("Player/Player_Base/Player_Base_animations.png", spriteWidth, spriteHeight);
export const HeadSpritesheet = new Spritesheet("Player/Head/Hair_1/Hair_1_Brown.png", spriteWidth, spriteHeight);
export const ChestSpritesheet = new Spritesheet(
  "Player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png",
  spriteWidth,
  spriteHeight,
);
export const HandsSpritesheet = new Spritesheet("Player/Hands/Hands_1_Bare.png", spriteWidth, spriteHeight);
export const LegsSpritesheet = new Spritesheet("Player/Legs/OG_Pants/Pants_1_Blue.png", spriteWidth, spriteHeight);
export const FeetSpritesheet = new Spritesheet("Player/Feet/Shoes_1_Brown.png", spriteWidth, spriteHeight);
export const ToolSpritesheet = new Spritesheet("Player/Tools/Iron/Iron_Tools.png", spriteWidth, spriteHeight);

/**
 * Go `lumberjack.Input`: held keys, read directly with `IsKeyPressed` in Go
 * (`game.go:36-42`). All four directions apply independently.
 */
export interface LumberjackInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}

export class Player {
  headSpritesheet = HeadSpritesheet;
  chestSpritesheet = ChestSpritesheet;
  handsSpritesheet = HandsSpritesheet;
  legsSpritesheet = LegsSpritesheet;
  feetSpritesheet = FeetSpritesheet;

  frameX = 0;
  frameY = 0;

  frameCounter = 0;
  frameInterval = 8;
  frameTotal = 6;

  // Go untyped constants `width / 2`, `height / 2`: exact.
  positionX = width / 2;
  positionY = height / 2;

  moving = false;
  acting = false;
  direction: Direction = "DOWN";

  minX(): number {
    return this.positionX - spriteWidth / 2;
  }

  minY(): number {
    return this.positionY - spriteHeight / 2;
  }

  hitbox(): Hitbox {
    let offsetX = 25.0;
    const offsetY = 31.0;
    const w = 13.0;
    const h = 10.0;

    if (this.direction === "RIGHT") {
      offsetX = 26.0;
    }

    return { x: this.minX() + offsetX, y: this.minY() + offsetY, w, h };
  }

  actionHitbox(): Hitbox {
    const offsetSize = 16.0;
    const hitboxSize = 16.0;

    const centerX = this.positionX;
    const centerY = this.positionY;

    let offsetX = 0;
    let offsetY = 0;

    switch (this.direction) {
      case "UP":
        offsetX = 0;
        offsetY = -offsetSize;
        break;
      case "DOWN":
        offsetX = 0;
        offsetY = offsetSize;
        break;
      case "LEFT":
        offsetX = -offsetSize;
        offsetY = 0;
        break;
      case "RIGHT":
        offsetX = offsetSize;
        offsetY = 0;
        break;
    }

    const hitboxX = centerX + offsetX - hitboxSize / 2;
    const hitboxY = centerY + offsetY - hitboxSize / 2;

    return { x: hitboxX, y: hitboxY, w: hitboxSize, h: hitboxSize };
  }

  /** Go `Player.Update(i)`; `trees` is the package global Go reads (`player.go:181`). */
  update(i: LumberjackInput, trees: readonly Tree[]): void {
    if (i.up || i.down || i.left || i.right) {
      this.moving = true;
    } else {
      this.moving = false;
    }

    if (i.space && !this.moving) {
      if (!this.acting) {
        this.frameX = 0;
        this.frameCounter = 0;
      }
      this.acting = true;
    } else {
      this.acting = false;
    }

    const vertical = i.up || i.down;
    const horizontal = i.left || i.right;

    let speed = baseSpeed;
    if (vertical && horizontal) {
      speed = baseSpeed * 0.75;
    }

    // Every held direction applies, in this order; Up+Down cancel out and the
    // facing is the last one applied.
    if (i.up) {
      this.direction = "UP";
      this.positionY -= speed;
    }
    if (i.down) {
      this.direction = "DOWN";
      this.positionY += speed;
    }
    if (i.left) {
      this.direction = "LEFT";
      this.positionX -= speed;
    }
    if (i.right) {
      this.direction = "RIGHT";
      this.positionX += speed;
    }

    for (const tree of trees) {
      if (overlaps(this.hitbox(), tree.hitbox())) {
        const [overlapX, overlapY] = resolve(this.hitbox(), tree.hitbox());
        this.positionX += overlapX;
        this.positionY += overlapY;
      }
    }

    switch (this.direction) {
      case "UP":
        this.frameY = 2;
        break;
      case "DOWN":
        this.frameY = 0;
        break;
      case "LEFT":
        this.frameY = 1;
        break;
      case "RIGHT":
        this.frameY = 1;
        break;
    }

    if (this.moving) {
      this.frameY += 3;
    }

    if (this.acting) {
      this.frameY += 32;
    }

    this.frameCounter++;
    if (this.frameCounter >= this.frameInterval) {
      this.frameCounter = 0;
      this.frameX++;
      if (this.frameX >= this.frameTotal) {
        this.frameX = 0;
      }
    }
  }

  draw(screen: Surface): void {
    // Facing left: GeoM.Scale(-1, 1) then Translate(spriteWidth, 0), then the
    // position; scale is 1.
    const op: DrawOpts = { flipX: this.direction === "LEFT" };
    const x = this.minX();
    const y = this.minY();

    screen.draw(mustFrame(BaseSpritesheet, this.frameX, this.frameY), x, y, op);
    screen.draw(mustFrame(this.chestSpritesheet, this.frameX, this.frameY), x, y, op);
    screen.draw(mustFrame(this.legsSpritesheet, this.frameX, this.frameY), x, y, op);
    screen.draw(mustFrame(this.feetSpritesheet, this.frameX, this.frameY), x, y, op);
    screen.draw(mustFrame(this.headSpritesheet, this.frameX, this.frameY), x, y, op);
    screen.draw(mustFrame(this.handsSpritesheet, this.frameX, this.frameY), x, y, op);

    if (this.acting) {
      screen.draw(mustFrame(ToolSpritesheet, this.frameX, this.frameY - 32), x, y, op);
    }

    if (debug) {
      drawHitbox(screen, this.hitbox(), colorRed);
      drawHitbox(screen, this.actionHitbox(), colorPink);
    }
  }
}
