// Port of the Go Brass Monkey minigame's game.go (docs/port-notes.md gives its old Go name).

import * as draw from "../draw/draw.ts";
import { imageCabinetBrassMonkey, imageGnome, imageWorkshop } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { direction, moving, type Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import type { BrassMonkeySnapshot } from "../game/snapshot.ts";
import type { FixedViewport } from "../game/software.ts";
import {
  cabinetHeight,
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetJoystickFrame,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
  cabinetWidth,
  drawCabinet,
} from "../ui/cabinet.ts";

const height = 256.0;

/** The 224x256 workshop sits centred in the cabinet's 224x288 screen, with a band this tall above and below. */
const bandHeight = (cabinetPlayfieldHeight - height) / 2;
/** The workshop's darkest colour, filling the bands. */
const bandColour = "#040c06";

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

/** The Go minigame's `Software`, played inside its cabinet (#15). */
export class BrassMonkeySoftware implements FixedViewport {
  readonly name = "brassMonkey" as const;

  private player: Entity = newPlayer();
  /** The bezel's joystick frame for the last input (no gameplay effect). */
  private cabinetJoystickFrame = 0;

  background(): Sprite {
    return imageWorkshop;
  }

  update(i: Input): void {
    this.cabinetJoystickFrame = cabinetJoystickFrame(i);

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

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  /** A `FixedViewport`: `buffer` is 0; the workshop is centred vertically in the cabinet's screen. */
  draw(screen: Surface, _buffer: number): void {
    drawCabinet(screen, this.cabinetJoystickFrame, imageCabinetBrassMonkey);

    screen.fillRect(cabinetInsetLeft, cabinetInsetTop, cabinetPlayfieldWidth, bandHeight, bandColour);
    screen.fillRect(cabinetInsetLeft, cabinetInsetTop + bandHeight + height, cabinetPlayfieldWidth, bandHeight, bandColour);

    const origin = draw.newVector(cabinetInsetLeft, cabinetInsetTop + bandHeight);
    drawBackground(screen, this.background(), origin);

    drawPlayer(screen, this.player, origin);
  }

  gameOver(): boolean {
    return false;
  }

  score(): number {
    return 0;
  }

  snapshot(): BrassMonkeySnapshot {
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      frame: this.player.frame,
      left: this.player.left,
      moving: this.player.moving,
      joystick: this.cabinetJoystickFrame,
    };
  }
}

/** The Go minigame's constructor. */
export function newBrassMonkeySoftware(): BrassMonkeySoftware {
  return new BrassMonkeySoftware();
}

function drawBackground(screen: Surface, background: Sprite, origin: draw.Vector): void {
  screen.draw(background, origin.x, origin.y);
}

function drawPlayer(screen: Surface, player: Entity, origin: draw.Vector): void {
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
  let position = draw.add(player.position, origin);
  position = draw.sub(position, draw.newVector(player.width / 2, player.height / 2));

  // Go: Scale(-1, 1), Translate(width, 0), then Translate(position).
  screen.draw(img, position.x, position.y, player.left ? { flipX: true } : undefined);
}
