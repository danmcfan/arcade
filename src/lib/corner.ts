import { Direction } from "@/lib/direction";
import { Entity, newEntity } from "@/lib/entity";

export async function defaultCorners(): Promise<Entity[]> {
  const data = await readCsv("/corners.csv");

  console.log(data);

  return data.map((corner: Record<string, string>) => {
    const directions = [];

    if (corner.up === "1") {
      directions.push(Direction.UP);
    }
    if (corner.down === "1") {
      directions.push(Direction.DOWN);
    }
    if (corner.left === "1") {
      directions.push(Direction.LEFT);
    }
    if (corner.right === "1") {
      directions.push(Direction.RIGHT);
    }

    return newCorner({
      tileX: parseInt(corner.x),
      tileY: parseInt(corner.y),
      directions,
    });
  });
}

export const CORNERS = [
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
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
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
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
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
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 9,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 12,
    tileY: 9,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 14,
    tileY: 9,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  // ROW 6
  newCorner({
    tileX: 6,
    tileY: 11,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 11,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  // ROW 7
  newCorner({
    tileX: 1,
    tileY: 13,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 4,
    tileY: 13,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 13,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 8,
    tileY: 13,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 10,
    tileY: 13,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 13,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 14,
    tileY: 13,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 17,
    tileY: 13,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 8
  newCorner({
    tileX: 1,
    tileY: 15,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 2,
    tileY: 15,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 4,
    tileY: 15,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 15,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 8,
    tileY: 15,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 10,
    tileY: 15,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 15,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 14,
    tileY: 15,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 16,
    tileY: 15,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 17,
    tileY: 15,
    directions: [Direction.UP, Direction.LEFT],
  }),
  // ROW 9
  newCorner({
    tileX: 1,
    tileY: 17,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 2,
    tileY: 17,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 4,
    tileY: 17,
    directions: [Direction.UP, Direction.LEFT],
  }),
  newCorner({
    tileX: 6,
    tileY: 17,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 8,
    tileY: 17,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 10,
    tileY: 17,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 17,
    directions: [Direction.UP, Direction.LEFT],
  }),
  newCorner({
    tileX: 14,
    tileY: 17,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 16,
    tileY: 17,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 17,
    tileY: 17,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 10
  newCorner({
    tileX: 1,
    tileY: 19,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 8,
    tileY: 19,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 10,
    tileY: 19,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 17,
    tileY: 19,
    directions: [Direction.UP, Direction.LEFT],
  }),
];

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
    x: tileX * 8 + 4,
    y: (tileY + 3) * 8 + 4,
    radius: 1,
    directions,
  });
}

export async function readCsv(
  filename: string
): Promise<Record<string, string>[]> {
  const response = await fetch(filename);
  const text = await response.text();
  const headers = text.split("\n")[0].split(",");
  return text
    .split("\n")
    .map((row) => row.split(","))
    .slice(1)
    .map((row) => {
      return headers.reduce((acc: Record<string, string>, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {});
    });
}
