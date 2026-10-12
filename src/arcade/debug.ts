// Port of internal/arcade/debug.go: the hub's debug overlay (hitboxes).

import type { PremulColor, Surface } from "../engine/surface.ts";
import type { Rect } from "./collision.ts";
import type { State } from "./state.ts";

// Go `color.RGBA` values are premultiplied; these are "invalid" premultiplied
// colours and draw near-additive (fact 10, D15).
export const colorPlayer: PremulColor = { r: 0, g: 255, b: 0, a: 64 };
export const colorWall: PremulColor = { r: 255, g: 0, b: 0, a: 64 };
export const colorMachine: PremulColor = { r: 255, g: 255, b: 0, a: 64 };

export function drawDebugOverlay(screen: Surface, s: State, buffer: number): void {
  const player = s.player;
  const playerRect: Rect = { x: player.x, y: player.y, w: player.width, h: player.height };
  playerRect.x += buffer - player.width / 2;
  playerRect.y += buffer - player.height / 2;
  drawDebugRect(screen, playerRect, colorPlayer);

  // Go ranges over values: offsetting the loop variable mutates a copy.
  for (const wall of s.walls) {
    const rect = { ...wall };
    rect.x += buffer;
    rect.y += buffer;
    drawDebugRect(screen, rect, colorWall);
  }

  for (const machine of s.machines) {
    const rect = { ...machine.rect };
    rect.x += buffer;
    rect.y += buffer;
    drawDebugRect(screen, rect, colorMachine);
  }

  drawDebugRect(screen, { ...s.counter, x: s.counter.x + buffer, y: s.counter.y + buffer }, colorMachine);
}

function drawDebugRect(screen: Surface, rect: Rect, clr: PremulColor): void {
  // `vector.StrokeRect(x, y, w-1, h-1, 1, clr, false)`.
  screen.strokeRect(rect.x, rect.y, rect.w - 1, rect.h - 1, clr);
}
