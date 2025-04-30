import { Direction } from "../state";

export function createEnemies(): {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  velocity: number;
  lastCorner: { x: number; y: number; directions: Direction[] } | null;
  scaredTime: number;
  frame: number;
}[] {
  return [
    {
      x: 113,
      y: 144,
      radius: 1,
      direction: Direction.RIGHT,
      velocity: 0.5,
      lastCorner: null,
      scaredTime: 0,
      frame: 0,
    },
    {
      x: 209,
      y: 144,
      radius: 1,
      direction: Direction.LEFT,
      velocity: 0.5,
      lastCorner: null,
      scaredTime: 0,
      frame: 0,
    },
    {
      x: 113,
      y: 208,
      radius: 1,
      direction: Direction.UP,
      velocity: 0.5,
      lastCorner: null,
      scaredTime: 0,
      frame: 0,
    },
    {
      x: 209,
      y: 208,
      radius: 1,
      direction: Direction.UP,
      velocity: 0.5,
      lastCorner: null,
      scaredTime: 0,
      frame: 0,
    },
  ];
}

export function createCorners(): {
  x: number;
  y: number;
  directions: Direction[];
}[] {
  return [
    // ROW 1
    {
      x: 33,
      y: 32,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 81,
      y: 32,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 145,
      y: 32,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    {
      x: 177,
      y: 32,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 241,
      y: 32,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 289,
      y: 32,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    // ROW 2
    {
      x: 33,
      y: 80,
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 81,
      y: 80,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    {
      x: 113,
      y: 80,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 145,
      y: 80,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 177,
      y: 80,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 209,
      y: 80,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 241,
      y: 80,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    {
      x: 289,
      y: 80,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    },
    // ROW 3
    {
      x: 33,
      y: 112,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 81,
      y: 112,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 113,
      y: 112,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 145,
      y: 112,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    {
      x: 177,
      y: 112,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 209,
      y: 112,
      directions: [Direction.UP, Direction.LEFT],
    },
    {
      x: 241,
      y: 112,
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 289,
      y: 112,
      directions: [Direction.UP, Direction.LEFT],
    },
    // ROW A
    {
      x: 113,
      y: 144,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 145,
      y: 144,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 177,
      y: 144,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 209,
      y: 144,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    // ROW B
    {
      x: 81,
      y: 176,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    {
      x: 113,
      y: 176,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 209,
      y: 176,
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 241,
      y: 176,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    // row C
    {
      x: 113,
      y: 208,
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 209,
      y: 208,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    },
    // ROW 4
    {
      x: 33,
      y: 240,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 81,
      y: 240,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    {
      x: 113,
      y: 240,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 145,
      y: 240,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    {
      x: 177,
      y: 240,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 209,
      y: 240,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 241,
      y: 240,
      directions: [
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
      ],
    },
    {
      x: 289,
      y: 240,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    // ROW 5
    {
      x: 33,
      y: 272,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 49,
      y: 272,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    {
      x: 81,
      y: 272,
      directions: [Direction.UP, Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 113,
      y: 272,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 145,
      y: 272,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 177,
      y: 272,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 209,
      y: 272,
      directions: [Direction.RIGHT, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 241,
      y: 272,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    },
    {
      x: 273,
      y: 272,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 289,
      y: 272,
      directions: [Direction.UP, Direction.LEFT],
    },
    // ROW 6
    {
      x: 33,
      y: 304,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 49,
      y: 304,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 81,
      y: 304,
      directions: [Direction.UP, Direction.LEFT],
    },
    {
      x: 113,
      y: 304,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 145,
      y: 304,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    {
      x: 177,
      y: 304,
      directions: [Direction.RIGHT, Direction.DOWN],
    },
    {
      x: 209,
      y: 304,
      directions: [Direction.UP, Direction.LEFT],
    },
    {
      x: 241,
      y: 304,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 273,
      y: 304,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 289,
      y: 304,
      directions: [Direction.DOWN, Direction.LEFT],
    },
    // ROW 7
    {
      x: 33,
      y: 336,
      directions: [Direction.UP, Direction.RIGHT],
    },
    {
      x: 145,
      y: 336,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    // ROW 8
    {
      x: 177,
      y: 336,
      directions: [Direction.UP, Direction.RIGHT, Direction.LEFT],
    },
    {
      x: 289,
      y: 336,
      directions: [Direction.UP, Direction.LEFT],
    },
  ];
}

export function createPoints(): { x: number; y: number }[] {
  return [
    // ROW 1
    createPosition(33, 32),
    ...createPositionRow(33, 81, 2, 32),
    createPosition(81, 32),
    ...createPositionRow(81, 145, 3, 32),
    createPosition(145, 32),
    createPosition(177, 32),
    ...createPositionRow(177, 241, 3, 32),
    createPosition(241, 32),
    ...createPositionRow(241, 289, 2, 32),
    createPosition(289, 32),
    // ROW 2
    createPosition(33, 80),
    ...createPositionRow(33, 81, 2, 80),
    createPosition(81, 80),
    ...createPositionRow(81, 145, 3, 80),
    createPosition(145, 80),
    ...createPositionRow(145, 177, 1, 80),
    createPosition(177, 80),
    ...createPositionRow(177, 241, 3, 80),
    createPosition(241, 80),
    ...createPositionRow(241, 289, 2, 80),
    createPosition(289, 80),
    // ROW 3
    createPosition(33, 112),
    ...createPositionRow(33, 81, 2, 112),
    createPosition(81, 112),
    createPosition(113, 112),
    ...createPositionRow(113, 145, 1, 112),
    createPosition(145, 112),
    createPosition(177, 112),
    ...createPositionRow(177, 209, 1, 112),
    createPosition(209, 112),
    createPosition(241, 112),
    ...createPositionRow(241, 289, 2, 112),
    createPosition(289, 112),
    // ROW 4
    createPosition(33, 240),
    ...createPositionRow(33, 81, 2, 240),
    createPosition(81, 240),
    ...createPositionRow(81, 145, 3, 240),
    createPosition(145, 240),
    createPosition(177, 240),
    ...createPositionRow(177, 241, 3, 240),
    createPosition(241, 240),
    ...createPositionRow(241, 289, 2, 240),
    createPosition(289, 240),
    // ROW 5
    createPosition(49, 272),
    createPosition(81, 272),
    ...createPositionRow(81, 145, 3, 272),
    createPosition(145, 272),
    createPosition(177, 272),
    ...createPositionRow(177, 241, 3, 272),
    createPosition(241, 272),
    createPosition(272, 272),
    // ROW 6
    createPosition(33, 304),
    ...createPositionRow(33, 81, 2, 304),
    createPosition(81, 304),
    createPosition(113, 304),
    ...createPositionRow(113, 145, 1, 304),
    createPosition(145, 304),
    createPosition(177, 304),
    ...createPositionRow(177, 209, 1, 304),
    createPosition(209, 304),
    createPosition(241, 304),
    ...createPositionRow(241, 289, 2, 304),
    createPosition(289, 304),
    // ROW 7
    createPosition(33, 336),
    ...createPositionRow(33, 81, 2, 336),
    createPosition(81, 336),
    ...createPositionRow(81, 145, 3, 336),
    createPosition(145, 336),
    ...createPositionRow(145, 177, 1, 336),
    createPosition(177, 336),
    ...createPositionRow(177, 241, 3, 336),
    createPosition(241, 336),
    ...createPositionRow(241, 289, 2, 336),
    createPosition(289, 336),
    // COL 1
    createPosition(33, 64),
    createPosition(33, 96),
    createPosition(33, 256),
    createPosition(33, 320),
    // COL 2
    createPosition(49, 288),
    // COL 3
    ...createPositionCol(32, 80, 2, 81),
    ...createPositionCol(80, 112, 1, 81),
    ...createPositionCol(112, 240, 7, 81),
    ...createPositionCol(240, 272, 1, 81),
    ...createPositionCol(272, 304, 1, 81),
    // COL 4
    createPosition(113, 96),
    createPosition(113, 288),
    // COL 5
    ...createPositionCol(32, 80, 2, 145),
    ...createPositionCol(240, 272, 1, 145),
    ...createPositionCol(304, 336, 1, 145),
    // COL 6
    ...createPositionCol(32, 80, 2, 177),
    ...createPositionCol(240, 272, 1, 177),
    ...createPositionCol(304, 336, 1, 177),
    // COL 7
    createPosition(209, 96),
    createPosition(209, 288),
    // COL 8
    ...createPositionCol(32, 80, 2, 241),
    ...createPositionCol(80, 112, 1, 241),
    ...createPositionCol(112, 240, 7, 241),
    ...createPositionCol(240, 272, 1, 241),
    ...createPositionCol(272, 304, 1, 241),
    // COL 9
    createPosition(273, 288),
    // COL 10
    createPosition(289, 64),
    createPosition(289, 96),
    createPosition(289, 256),
    createPosition(289, 320),
  ];
}

export function createPowers(): { x: number; y: number }[] {
  return [
    createPosition(33, 48),
    createPosition(289, 48),
    createPosition(33, 272),
    createPosition(289, 272),
  ];
}

function createPosition(x: number, y: number): { x: number; y: number } {
  return { x, y };
}

function createPositionRow(
  startX: number,
  endX: number,
  count: number,
  y: number
): { x: number; y: number }[] {
  const step = (endX - startX) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push({ x: startX + i * step, y });
  }
  return coordinates;
}

function createPositionCol(
  startY: number,
  endY: number,
  count: number,
  x: number
): { x: number; y: number }[] {
  const step = (endY - startY) / (count + 1);
  const coordinates = [];
  for (let i = 1; i < count + 1; i++) {
    coordinates.push({ x, y: startY + i * step });
  }
  return coordinates;
}
