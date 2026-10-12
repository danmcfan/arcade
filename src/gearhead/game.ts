// Port of internal/gearhead/game.go.

import * as draw from "../draw/draw.ts";
import { imageGnome, imageWorkshop } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { direction, moving, type Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import type { GearheadSnapshot } from "../game/snapshot.ts";
import type { Software } from "../game/software.ts";

const height = 256.0;

/** Go `entity`. */
interface Entity {
  image: Sprite;
  position: draw.Vector;
  width: number;
  height: number;
  frame: number;
  frameIncrement: number;
  left: boolean;
  moving: boolean;
}

function newPlayer(): Entity {
  return {
    image: imageGnome,
    position: draw.newVector(16, height - 16),
    width: 16,
    height: 16,
    frame: 0,
    frameIncrement: 0.2,
    left: false,
    moving: false,
  };
}

/** Go `GearHeadSoftware`. */
export class GearheadSoftware implements Software {
  readonly name = "gearhead" as const;

  private player: Entity = newPlayer();

  background(): Sprite {
    return imageWorkshop;
  }

  update(i: Input): void {
    if (moving(i)) {
      this.player.moving = true;
      this.player.frame += this.player.frameIncrement;
      if (this.player.frame >= 4) {
        this.player.frame = 0;
      }
    } else {
      this.player.moving = false;
      this.player.frame = 0;
    }

    // Direction priority Up, Down, Left, Right: Up/Down alone still walk
    // (in the current facing), and mask Left/Right.
    if (direction(i) === "LEFT") {
      this.player.left = true;
    }

    if (direction(i) === "RIGHT") {
      this.player.left = false;
    }

    if (this.player.moving) {
      if (this.player.left) {
        this.player.position = draw.sub(this.player.position, draw.newVector(1, 0));
      } else {
        this.player.position = draw.add(this.player.position, draw.newVector(1, 0));
      }
    }

    if (this.player.position.x <= 6) {
      this.player.position.x = 6;
    }

    if (this.player.position.x >= 108) {
      this.player.position.x = 108;
    }
  }

  draw(screen: Surface, buffer: number): void {
    drawBackground(screen, this.background(), buffer);

    drawPlayer(screen, this.player, buffer);
  }

  gameOver(): boolean {
    return false;
  }

  score(): number {
    return 0;
  }

  snapshot(): GearheadSnapshot {
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      frame: this.player.frame,
      left: this.player.left,
      moving: this.player.moving,
    };
  }
}

/** Go `NewGearHeadSoftware()`. */
export function newGearheadSoftware(): GearheadSoftware {
  return new GearheadSoftware();
}

function drawBackground(screen: Surface, background: Sprite, buffer: number): void {
  screen.draw(background, buffer, buffer);
}

function drawPlayer(screen: Surface, player: Entity, buffer: number): void {
  let frame = Math.trunc(player.frame);

  // Walk cycle 0,1,2,3 shows sheet columns 0,1,0,2.
  switch (frame) {
    case 2:
      frame = 0;
      break;
    case 3:
      frame = 2;
      break;
  }

  const w = Math.trunc(player.width);
  const img = sub(player.image, frame * w, 0, (frame + 1) * w, Math.trunc(player.height));
  let position = draw.add(player.position, draw.newVector(buffer, buffer));
  position = draw.sub(position, draw.newVector(player.width / 2, player.height / 2));

  // Go: Scale(-1, 1), Translate(width, 0), then Translate(position).
  screen.draw(img, position.x, position.y, player.left ? { flipX: true } : undefined);
}
