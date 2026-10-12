// Port of internal/arcade/draw.go.

import { imageArcade } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawDebugOverlay } from "./debug.ts";
import { titleImages } from "./machine.ts";
import type { State } from "./state.ts";

export function draw(screen: Surface, s: State, buffer: number, debugMode: boolean): void {
  drawImage(screen, imageArcade, buffer, buffer);

  const player = s.player;
  const row = player.frameDirection[player.direction];
  const playerImageFrame = cutImage(
    player.image,
    Math.trunc(player.frame) * player.width,
    row * player.height,
    player.width,
    player.height,
  );
  drawImage(screen, playerImageFrame, player.x + buffer - player.width / 2, player.y + buffer - player.height / 2);

  if (s.melodyPlaying && s.imageTitle !== null) {
    drawImage(screen, titleImages[s.imageTitle], buffer, buffer);
  }

  if (debugMode) {
    drawDebugOverlay(screen, s, buffer);
  }
}

/** Go `img.SubImage(image.Rect(int(x), int(y), int(x+w), int(y+h)))`. */
export function cutImage(img: Sprite, x: number, y: number, w: number, h: number): Sprite {
  return sub(img, Math.trunc(x), Math.trunc(y), Math.trunc(x + w), Math.trunc(y + h));
}

function drawImage(screen: Surface, img: Sprite, x: number, y: number): void {
  screen.draw(img, x, y);
}
