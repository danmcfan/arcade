import type { Direction, Position } from "@/lib/sweet/ecs";
import { createPosition } from "@/lib/sweet/ecs";

export type CornerConfig = {
  x: number;
  y: number;
  directions: Direction[];
};

export function createCorners(): CornerConfig[] {
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

export function createPoints(): Position[] {
  return [
    // row 1
    createPosition(17, 17),
    ...createPositionRow(17, 65, 2, 17),
    createPosition(65, 17),
    ...createPositionRow(65, 129, 3, 17),
    createPosition(129, 17),
    createPosition(161, 17),
    ...createPositionRow(161, 225, 3, 17),
    createPosition(225, 17),
    ...createPositionRow(225, 273, 2, 17),
    createPosition(273, 17),
    // cols 1
    createPosition(17, 33),
    createPosition(65, 33),
    createPosition(65, 49),
    createPosition(129, 33),
    createPosition(129, 49),
    createPosition(161, 33),
    createPosition(161, 49),
    createPosition(225, 33),
    createPosition(225, 49),
    createPosition(273, 33),
    // row 2
    createPosition(17, 65),
    ...createPositionRow(17, 65, 2, 65),
    createPosition(65, 65),
    ...createPositionRow(65, 129, 3, 65),
    createPosition(129, 65),
    createPosition(144, 65),
    createPosition(161, 65),
    ...createPositionRow(161, 225, 3, 65),
    createPosition(225, 65),
    ...createPositionRow(225, 273, 2, 65),
    createPosition(273, 65),
    // cols 2
    createPosition(17, 81),
    createPosition(65, 81),
    createPosition(97, 81),
    createPosition(193, 81),
    createPosition(225, 81),
    createPosition(273, 81),
    // row 3
    createPosition(17, 97),
    ...createPositionRow(17, 65, 2, 97),
    createPosition(65, 97),
    createPosition(97, 97),
    createPosition(113, 97),
    createPosition(128, 97),
    createPosition(161, 97),
    createPosition(177, 97),
    createPosition(193, 97),
    createPosition(225, 97),
    ...createPositionRow(225, 273, 2, 97),
    createPosition(273, 97),
    // cols 3
    ...createPositionCol(97, 225, 7, 65),
    createPosition(128, 113),
    ...createPositionCol(97, 225, 7, 225),
    createPosition(161, 113),
    // row 4
    createPosition(17, 225),
    ...createPositionRow(17, 128, 6, 225),
    createPosition(128, 225),
    createPosition(161, 225),
    ...createPositionRow(161, 273, 6, 225),
    createPosition(273, 225),
    //cols 4
    createPosition(17, 241),
    createPosition(65, 241),
    createPosition(128, 241),
    createPosition(161, 241),
    createPosition(225, 241),
    createPosition(273, 241),
    // row 5
    createPosition(33, 257),
    createPosition(65, 257),
    ...createPositionRow(65, 128, 3, 257),
    createPosition(128, 257),
    createPosition(161, 257),
    ...createPositionRow(161, 225, 3, 257),
    createPosition(225, 257),
    createPosition(257, 257),
    // cols 5
    createPosition(33, 273),
    createPosition(65, 273),
    createPosition(97, 273),
    createPosition(193, 273),
    createPosition(225, 273),
    createPosition(257, 273),
    // row 6
    createPosition(17, 288),
    ...createPositionRow(17, 65, 2, 288),
    createPosition(65, 288),
    createPosition(97, 288),
    createPosition(113, 288),
    createPosition(128, 288),
    createPosition(161, 288),
    createPosition(177, 288),
    createPosition(193, 288),
    createPosition(225, 288),
    ...createPositionRow(225, 273, 2, 288),
    createPosition(273, 288),
    // cols 6
    createPosition(17, 305),
    createPosition(128, 305),
    createPosition(161, 305),
    createPosition(273, 305),
    // row 7
    createPosition(17, 320),
    ...createPositionRow(17, 128, 6, 320),
    createPosition(128, 320),
    createPosition(144, 320),
    createPosition(161, 320),
    ...createPositionRow(161, 273, 6, 320),
    createPosition(273, 320),
  ];
}

export function createPowers(): Position[] {
  return [
    createPosition(17, 49),
    createPosition(273, 49),
    createPosition(17, 256),
    createPosition(273, 256),
  ];
}

function createPositionRow(
  startX: number,
  endX: number,
  count: number,
  y: number
): Position[] {
  const step = (endX - startX) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push(createPosition(startX + i * step, y));
  }
  return coordinates;
}

function createPositionCol(
  startY: number,
  endY: number,
  count: number,
  x: number
): Position[] {
  const step = (endY - startY) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push(createPosition(x, startY + i * step));
  }
  return coordinates;
}
