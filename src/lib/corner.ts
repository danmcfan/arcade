import { Direction } from "@/lib/direction";
import { Entity, newEntity } from "@/lib/entity";

export function defaultCorners(): Entity[] {
  return [
    // ROW 1
    newCorner({
      tileX: 1,
      tileY: 1,
      directions: [Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 4,
      tileY: 1,
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 8,
      tileY: 1,
      directions: [Direction.DOWN, Direction.LEFT],
    }),
    newCorner({
      tileX: 10,
      tileY: 1,
      directions: [Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 14,
      tileY: 1,
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 17,
      tileY: 1,
      directions: [Direction.DOWN, Direction.LEFT],
    }),
    // ROW 2
    newCorner({
      tileX: 1,
      tileY: 3,
      directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 4,
      tileY: 3,
      directions: [
        Direction.UP,
        Direction.DOWN,
        Direction.LEFT,
        Direction.RIGHT,
      ],
    }),
    newCorner({
      tileX: 6,
      tileY: 3,
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 8,
      tileY: 3,
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 10,
      tileY: 3,
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 12,
      tileY: 3,
      directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 14,
      tileY: 3,
      directions: [
        Direction.UP,
        Direction.DOWN,
        Direction.LEFT,
        Direction.RIGHT,
      ],
    }),
    newCorner({
      tileX: 17,
      tileY: 3,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    }),
    // ROW 3
    newCorner({
      tileX: 1,
      tileY: 5,
      directions: [Direction.UP, Direction.RIGHT],
    }),
    newCorner({
      tileX: 4,
      tileY: 5,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    }),
    newCorner({
      tileX: 6,
      tileY: 5,
      directions: [Direction.UP, Direction.RIGHT],
    }),
    newCorner({
      tileX: 8,
      tileY: 5,
      directions: [Direction.DOWN, Direction.LEFT],
    }),
    newCorner({
      tileX: 10,
      tileY: 5,
      directions: [Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 12,
      tileY: 5,
      directions: [Direction.UP, Direction.LEFT],
    }),
    newCorner({
      tileX: 14,
      tileY: 5,
      directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 17,
      tileY: 5,
      directions: [Direction.UP, Direction.LEFT],
    }),
    // ROW 4
    newCorner({
      tileX: 6,
      tileY: 7,
      directions: [Direction.DOWN, Direction.RIGHT],
    }),
    newCorner({
      tileX: 8,
      tileY: 7,
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 10,
      tileY: 7,
      directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
    }),
    newCorner({
      tileX: 12,
      tileY: 7,
      directions: [Direction.DOWN, Direction.LEFT],
    }),
    // ROW 5
    newCorner({
      tileX: 4,
      tileY: 9,
      directions: [
        Direction.UP,
        Direction.DOWN,
        Direction.LEFT,
        Direction.RIGHT,
      ],
    }),
    newCorner({
      tileX: 4,
      tileY: 7,
      directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
    }),
  ];
}

export function newCorner({
  tileX,
  tileY,
  directions,
}: {
  tileX: number;
  tileY: number;
  directions: Direction[];
}): Entity {
  return newEntity({
    x: tileX * 16 + 8,
    y: (tileY + 1) * 16 + 8,
    radius: 1,
    directions,
  });
}
