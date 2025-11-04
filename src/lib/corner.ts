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
    tileX: 6,
    tileY: 1,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 1,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 15,
    tileY: 1,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 21,
    tileY: 1,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 1,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 5
  newCorner({
    tileX: 1,
    tileY: 5,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 5,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 9,
    tileY: 5,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 5,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 15,
    tileY: 5,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 5,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 21,
    tileY: 5,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 5,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  // ROW 8
  newCorner({
    tileX: 1,
    tileY: 8,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 8,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 9,
    tileY: 8,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 8,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 15,
    tileY: 8,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 8,
    directions: [Direction.UP, Direction.LEFT],
  }),
  newCorner({
    tileX: 21,
    tileY: 8,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 8,
    directions: [Direction.UP, Direction.LEFT],
  }),
  // ROW 11
  newCorner({
    tileX: 9,
    tileY: 11,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 11,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 15,
    tileY: 11,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 11,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 14
  newCorner({
    tileX: 6,
    tileY: 14,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 9,
    tileY: 14,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 18,
    tileY: 14,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 21,
    tileY: 14,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  // ROW 17
  newCorner({
    tileX: 9,
    tileY: 17,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 17,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  // ROW 20
  newCorner({
    tileX: 1,
    tileY: 20,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 20,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 9,
    tileY: 20,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 20,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 15,
    tileY: 20,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 20,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 21,
    tileY: 20,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 20,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 23
  newCorner({
    tileX: 1,
    tileY: 23,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 3,
    tileY: 23,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 6,
    tileY: 23,
    directions: [Direction.UP, Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 9,
    tileY: 23,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 23,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 15,
    tileY: 23,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 23,
    directions: [Direction.DOWN, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 21,
    tileY: 23,
    directions: [Direction.UP, Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 24,
    tileY: 23,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 23,
    directions: [Direction.UP, Direction.LEFT],
  }),
  // ROW 26
  newCorner({
    tileX: 1,
    tileY: 26,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 3,
    tileY: 26,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 6,
    tileY: 26,
    directions: [Direction.UP, Direction.LEFT],
  }),
  newCorner({
    tileX: 9,
    tileY: 26,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 26,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  newCorner({
    tileX: 15,
    tileY: 26,
    directions: [Direction.DOWN, Direction.RIGHT],
  }),
  newCorner({
    tileX: 18,
    tileY: 26,
    directions: [Direction.UP, Direction.LEFT],
  }),
  newCorner({
    tileX: 21,
    tileY: 26,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 24,
    tileY: 26,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 26,
    directions: [Direction.DOWN, Direction.LEFT],
  }),
  // ROW 29
  newCorner({
    tileX: 1,
    tileY: 29,
    directions: [Direction.UP, Direction.RIGHT],
  }),
  newCorner({
    tileX: 12,
    tileY: 29,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 15,
    tileY: 29,
    directions: [Direction.UP, Direction.LEFT, Direction.RIGHT],
  }),
  newCorner({
    tileX: 26,
    tileY: 29,
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
