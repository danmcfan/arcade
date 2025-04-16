import type { Player } from "@/lib/sweet/player";
import type { Corner } from "@/lib/sweet/corner";
import type { Point } from "@/lib/sweet/point";
import { createSpriteSheet, getSprite } from "@/lib/engine/sprite";
import { Power } from "./power";

export const PLAYER_SPRITE_SHEET = createSpriteSheet(
  "/images/Player.png",
  32,
  32
);

export const FOOD_SPRITE_SHEET = createSpriteSheet("/images/Food.png", 16, 16);
export const STRAWBERRY_SPRITE = getSprite(FOOD_SPRITE_SHEET, 11, 0);
export const FISH_SPRITE = getSprite(FOOD_SPRITE_SHEET, 2, 6);

export function createPlayer(): Player {
  return {
    x: 144,
    y: 256,
    radius: 3,
    direction: "left",
    sprite: getSprite(PLAYER_SPRITE_SHEET, 4, 0),
    frame: 0,
  };
}

export function createCorners(): Corner[] {
  return [
    // row 1, section 1
    {
      x: 17,
      y: 17,
      directions: ["right", "down"],
    },
    {
      x: 65,
      y: 17,
      directions: ["right", "down", "left"],
    },
    {
      x: 128,
      y: 17,
      directions: ["down", "left"],
    },
    // row 1, section 2
    {
      x: 161,
      y: 17,
      directions: ["right", "down"],
    },
    {
      x: 224,
      y: 17,
      directions: ["right", "down", "left"],
    },
    {
      x: 272,
      y: 17,
      directions: ["down", "left"],
    },
    // row 2, section 1
    {
      x: 17,
      y: 65,
      directions: ["up", "right", "down"],
    },
    {
      x: 65,
      y: 65,
      directions: ["up", "right", "down", "left"],
    },
    {
      x: 96,
      y: 65,
      directions: ["right", "down", "left"],
    },
    {
      x: 128,
      y: 65,
      directions: ["up", "right", "left"],
    },
    // row 2, section 2
    {
      x: 161,
      y: 65,
      directions: ["up", "right", "left"],
    },
    {
      x: 194,
      y: 65,
      directions: ["right", "down", "left"],
    },
    {
      x: 224,
      y: 65,
      directions: ["up", "right", "down", "left"],
    },
    {
      x: 272,
      y: 65,
      directions: ["up", "down", "left"],
    },
    // row 3, section 1
    {
      x: 17,
      y: 96,
      directions: ["up", "right"],
    },
    {
      x: 65,
      y: 96,
      directions: ["up", "down", "left"],
    },
    {
      x: 96,
      y: 96,
      directions: ["up", "right"],
    },
    {
      x: 128,
      y: 96,
      directions: ["down", "left"],
    },
    // row 3, section 2
    {
      x: 161,
      y: 96,
      directions: ["right", "down"],
    },
    {
      x: 194,
      y: 96,
      directions: ["up", "left"],
    },
    {
      x: 224,
      y: 96,
      directions: ["up", "right", "down"],
    },
    {
      x: 272,
      y: 96,
      directions: ["up", "left"],
    },
    // row 4a
    {
      x: 96,
      y: 128,
      directions: ["right", "down"],
    },
    {
      x: 128,
      y: 128,
      directions: ["up", "right", "left"],
    },
    {
      x: 161,
      y: 128,
      directions: ["up", "right", "left"],
    },
    {
      x: 194,
      y: 128,
      directions: ["down", "left"],
    },
    // row 4b
    {
      x: 65,
      y: 161,
      directions: ["up", "right", "down", "left"],
    },
    {
      x: 96,
      y: 161,
      directions: ["up", "down", "left"],
    },
    {
      x: 194,
      y: 161,
      directions: ["up", "right", "down"],
    },
    {
      x: 224,
      y: 161,
      directions: ["up", "right", "down", "left"],
    },
    // row 4c
    {
      x: 96,
      y: 194,
      directions: ["up", "right", "down"],
    },
    {
      x: 194,
      y: 194,
      directions: ["up", "down", "left"],
    },
    // row 5, section 1
    {
      x: 17,
      y: 224,
      directions: ["right", "down"],
    },
    {
      x: 65,
      y: 224,
      directions: ["up", "right", "down", "left"],
    },
    {
      x: 96,
      y: 224,
      directions: ["up", "right", "left"],
    },
    {
      x: 128,
      y: 224,
      directions: ["down", "left"],
    },
    // row 5, section 2
    {
      x: 161,
      y: 224,
      directions: ["right", "down"],
    },
    {
      x: 194,
      y: 224,
      directions: ["up", "right", "left"],
    },
    {
      x: 224,
      y: 224,
      directions: ["up", "right", "down", "left"],
    },
    {
      x: 272,
      y: 224,
      directions: ["down", "left"],
    },
    // row 6, section 1
    {
      x: 17,
      y: 256,
      directions: ["up", "right"],
    },
    {
      x: 32,
      y: 256,
      directions: ["down", "left"],
    },
    {
      x: 65,
      y: 256,
      directions: ["up", "right", "down"],
    },
    {
      x: 96,
      y: 256,
      directions: ["right", "down", "left"],
    },
    {
      x: 128,
      y: 256,
      directions: ["up", "right", "left"],
    },
    // row 6, section 2
    {
      x: 161,
      y: 256,
      directions: ["up", "right", "left"],
    },
    {
      x: 194,
      y: 256,
      directions: ["right", "down", "left"],
    },
    {
      x: 224,
      y: 256,
      directions: ["up", "down", "left"],
    },
    {
      x: 256,
      y: 256,
      directions: ["right", "down"],
    },
    {
      x: 272,
      y: 256,
      directions: ["up", "left"],
    },
    // row 7, section 1
    {
      x: 17,
      y: 288,
      directions: ["right", "down"],
    },
    {
      x: 32,
      y: 288,
      directions: ["up", "right", "left"],
    },
    {
      x: 65,
      y: 288,
      directions: ["up", "left"],
    },
    {
      x: 96,
      y: 288,
      directions: ["up", "right"],
    },
    {
      x: 128,
      y: 288,
      directions: ["down", "left"],
    },
    // row 7, section 2
    {
      x: 161,
      y: 288,
      directions: ["right", "down"],
    },
    {
      x: 194,
      y: 288,
      directions: ["up", "left"],
    },
    {
      x: 224,
      y: 288,
      directions: ["up", "right"],
    },
    {
      x: 256,
      y: 288,
      directions: ["up", "right", "left"],
    },
    {
      x: 272,
      y: 288,
      directions: ["down", "left"],
    },
    // row 8, section 1
    {
      x: 17,
      y: 320,
      directions: ["up", "right"],
    },
    {
      x: 128,
      y: 320,
      directions: ["up", "right", "left"],
    },
    // row 8, section 2
    {
      x: 161,
      y: 320,
      directions: ["up", "right", "left"],
    },
    {
      x: 272,
      y: 320,
      directions: ["up", "left"],
    },
  ];
}

export function createPoints(): Point[] {
  return [
    // row 1
    createCoordinate(17, 17),
    ...createCoordinateRow(17, 65, 2, 17),
    createCoordinate(65, 17),
    ...createCoordinateRow(65, 129, 3, 17),
    createCoordinate(129, 17),
    createCoordinate(161, 17),
    ...createCoordinateRow(161, 225, 3, 17),
    createCoordinate(225, 17),
    ...createCoordinateRow(225, 273, 2, 17),
    createCoordinate(273, 17),
    // cols 1
    createCoordinate(17, 33),
    createCoordinate(65, 33),
    createCoordinate(65, 49),
    createCoordinate(129, 33),
    createCoordinate(129, 49),
    createCoordinate(161, 33),
    createCoordinate(161, 49),
    createCoordinate(225, 33),
    createCoordinate(225, 49),
    createCoordinate(273, 33),
    // row 2
    createCoordinate(17, 65),
    ...createCoordinateRow(17, 65, 2, 65),
    createCoordinate(65, 65),
    ...createCoordinateRow(65, 129, 3, 65),
    createCoordinate(129, 65),
    createCoordinate(144, 65),
    createCoordinate(161, 65),
    ...createCoordinateRow(161, 225, 3, 65),
    createCoordinate(225, 65),
    ...createCoordinateRow(225, 273, 2, 65),
    createCoordinate(273, 65),
    // cols 2
    createCoordinate(17, 81),
    createCoordinate(65, 81),
    createCoordinate(97, 81),
    createCoordinate(193, 81),
    createCoordinate(225, 81),
    createCoordinate(273, 81),
    // row 3
    createCoordinate(17, 97),
    ...createCoordinateRow(17, 65, 2, 97),
    createCoordinate(65, 97),
    createCoordinate(97, 97),
    createCoordinate(113, 97),
    createCoordinate(128, 97),
    createCoordinate(161, 97),
    createCoordinate(177, 97),
    createCoordinate(193, 97),
    createCoordinate(225, 97),
    ...createCoordinateRow(225, 273, 2, 97),
    createCoordinate(273, 97),
    // cols 3
    ...createCoordinateCol(97, 225, 7, 65),
    createCoordinate(128, 113),
    ...createCoordinateCol(97, 225, 7, 225),
    createCoordinate(161, 113),
    // row 4
    createCoordinate(17, 225),
    ...createCoordinateRow(17, 128, 6, 225),
    createCoordinate(128, 225),
    createCoordinate(161, 225),
    ...createCoordinateRow(161, 273, 6, 225),
    createCoordinate(273, 225),
    //cols 4
    createCoordinate(17, 241),
    createCoordinate(65, 241),
    createCoordinate(128, 241),
    createCoordinate(161, 241),
    createCoordinate(225, 241),
    createCoordinate(273, 241),
    // row 5
    createCoordinate(33, 257),
    createCoordinate(65, 257),
    ...createCoordinateRow(65, 128, 3, 257),
    createCoordinate(128, 257),
    createCoordinate(161, 257),
    ...createCoordinateRow(161, 225, 3, 257),
    createCoordinate(225, 257),
    createCoordinate(257, 257),
    // cols 5
    createCoordinate(33, 273),
    createCoordinate(65, 273),
    createCoordinate(97, 273),
    createCoordinate(193, 273),
    createCoordinate(225, 273),
    createCoordinate(257, 273),
    // row 6
    createCoordinate(17, 288),
    ...createCoordinateRow(17, 65, 2, 288),
    createCoordinate(65, 288),
    createCoordinate(97, 288),
    createCoordinate(113, 288),
    createCoordinate(128, 288),
    createCoordinate(161, 288),
    createCoordinate(177, 288),
    createCoordinate(193, 288),
    createCoordinate(225, 288),
    ...createCoordinateRow(225, 273, 2, 288),
    createCoordinate(273, 288),
    // cols 6
    createCoordinate(17, 305),
    createCoordinate(128, 305),
    createCoordinate(161, 305),
    createCoordinate(273, 305),
    // row 7
    createCoordinate(17, 320),
    ...createCoordinateRow(17, 128, 6, 320),
    createCoordinate(128, 320),
    createCoordinate(144, 320),
    createCoordinate(161, 320),
    ...createCoordinateRow(161, 273, 6, 320),
    createCoordinate(273, 320),
  ];
}

export function createPowers(): Power[] {
  return [
    createCoordinate(17, 49),
    createCoordinate(273, 49),
    createCoordinate(17, 256),
    createCoordinate(273, 256),
  ];
}

function createCoordinateRow(
  startX: number,
  endX: number,
  count: number,
  y: number
): { x: number; y: number }[] {
  const step = (endX - startX) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push(createCoordinate(startX + i * step, y));
  }
  return coordinates;
}

function createCoordinateCol(
  startY: number,
  endY: number,
  count: number,
  x: number
): { x: number; y: number }[] {
  const step = (endY - startY) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push(createCoordinate(x, startY + i * step));
  }
  return coordinates;
}

function createCoordinate(x: number, y: number): { x: number; y: number } {
  return {
    x,
    y,
  };
}
