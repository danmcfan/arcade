import { Direction } from "../state";
import { Background } from "../background";
import { SpriteID } from "../sprite";
import { createCorners, createPoints, createPowers } from "./constant";
export type SweetState = {
  background: Background;
  player: {
    x: number;
    y: number;
    radius: number;
    velocity: number;
    direction: Direction;
    frame: number;
    size: number;
  };
  enemies: {
    x: number;
    y: number;
    radius: number;
    velocity: number;
    direction: Direction;
    lastCorner: { x: number; y: number; directions: Direction[] } | null;
    scaredTime: number;
    frame: number;
  }[];
  corners: { x: number; y: number; directions: Direction[] }[];
  points: { x: number; y: number }[];
  powers: { x: number; y: number }[];
  score: number;
};

export function createSweetState(): SweetState {
  return {
    background: {
      cells: [
        41, 42, 42, 42, 42, 42, 42, 42, 43, 41, 42, 42, 42, 42, 42, 42, 42, 43,
        49, 65, 58, 66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58, 66, 51,
        49, 51, 81, 49, 51, 81, 81, 49, 51, 49, 51, 81, 81, 49, 51, 81, 49, 51,
        49, 73, 42, 74, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74, 73, 42, 74, 51,
        49, 65, 58, 66, 65, 66, 65, 58, 58, 58, 58, 66, 65, 66, 65, 58, 66, 51,
        49, 73, 42, 74, 51, 49, 73, 42, 43, 41, 42, 74, 51, 49, 73, 42, 74, 51,
        57, 58, 58, 66, 51, 57, 58, 66, 51, 49, 65, 58, 59, 49, 65, 58, 58, 59,
        81, 81, 81, 49, 51, 41, 42, 74, 73, 74, 73, 42, 43, 49, 51, 81, 81, 81,
        81, 81, 81, 49, 51, 49, 82, 82, 82, 82, 82, 82, 51, 49, 51, 81, 81, 81,
        41, 42, 42, 74, 73, 74, 82, 82, 82, 82, 82, 82, 73, 74, 73, 42, 42, 43,
        57, 58, 58, 66, 65, 66, 82, 82, 82, 82, 82, 82, 65, 66, 65, 58, 58, 59,
        81, 81, 81, 49, 51, 49, 82, 82, 82, 82, 82, 82, 51, 49, 51, 81, 81, 81,
        81, 81, 81, 49, 51, 49, 65, 58, 58, 58, 58, 66, 51, 49, 51, 81, 81, 81,
        41, 42, 42, 74, 73, 74, 73, 42, 43, 41, 42, 74, 73, 74, 73, 42, 42, 43,
        49, 65, 58, 66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58, 66, 51,
        49, 73, 43, 49, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74, 51, 41, 74, 51,
        57, 66, 51, 49, 65, 66, 65, 58, 58, 58, 58, 66, 65, 66, 51, 49, 65, 59,
        41, 74, 73, 74, 51, 49, 73, 42, 43, 41, 42, 74, 51, 49, 73, 74, 73, 43,
        49, 65, 58, 58, 59, 57, 58, 66, 51, 49, 65, 58, 59, 57, 58, 58, 66, 51,
        49, 73, 42, 42, 42, 42, 42, 74, 73, 74, 73, 42, 42, 42, 42, 42, 74, 51,
        57, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 59,
      ],
      spriteIDs: [
        SpriteID.GRASS_TILES,
        SpriteID.GRASS_MIDDLE,
        SpriteID.PATH_MIDDLE,
      ],
      width: 18,
    },
    player: {
      x: 144,
      y: 256,
      radius: 3,
      velocity: 0.5,
      direction: Direction.LEFT,
      frame: 0,
      size: 0.75,
    },
    enemies: [
      {
        x: 96,
        y: 128,
        radius: 1,
        direction: Direction.RIGHT,
        velocity: 0.5,
        lastCorner: null,
        scaredTime: 0,
        frame: 0,
      },
      {
        x: 194,
        y: 128,
        radius: 1,
        direction: Direction.LEFT,
        velocity: 0.5,
        lastCorner: null,
        scaredTime: 0,
        frame: 0,
      },
      {
        x: 96,
        y: 194,
        radius: 1,
        direction: Direction.UP,
        velocity: 0.5,
        lastCorner: null,
        scaredTime: 0,
        frame: 0,
      },
      {
        x: 194,
        y: 194,
        radius: 1,
        direction: Direction.UP,
        velocity: 0.5,
        lastCorner: null,
        scaredTime: 0,
        frame: 0,
      },
    ],
    corners: createCorners(),
    points: createPoints(),
    powers: createPowers(),
    score: 0,
  };
}
