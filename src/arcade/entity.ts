// Port of internal/arcade/entity.go.

import type { Direction } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import { imagePlayer } from "../engine/assets.ts";

export interface Entity {
  image: Sprite;

  frame: number;
  frameIncrement: number;
  frameTotal: number;
  /** Sprite-sheet row per facing direction (Go `map[Direction]int`). */
  frameDirection: Record<Direction, number>;

  x: number;
  y: number;
  width: number;
  height: number;
  direction: Direction;
  velocity: number;
}

export function newPlayer(): Entity {
  return {
    image: imagePlayer,
    frame: 0,
    frameIncrement: 0.1,
    frameTotal: 4,
    frameDirection: {
      UP: 0,
      DOWN: 1,
      LEFT: 2,
      RIGHT: 3,
    },
    x: 80,
    y: 92,
    width: 16,
    height: 24,
    direction: "DOWN",
    velocity: 0,
  };
}
