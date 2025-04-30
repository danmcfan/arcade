import { Direction, Entity, Corner } from "../types";
import { overlaps } from "./util";

export function handleMovement(
  entities: Entity[],
  corners: Corner[],
  deltaTime: number
) {
  for (const entity of entities) {
    const delta = entity.velocity * (deltaTime / 10);

    switch (entity.direction) {
      case Direction.UP:
        entity.y -= delta;
        break;
      case Direction.DOWN:
        entity.y += delta;
        break;
      case Direction.LEFT:
        entity.x -= delta;
        break;
      case Direction.RIGHT:
        entity.x += delta;
        break;
    }

    if (entity.y == 176) {
      if (entity.x < 30) {
        entity.x = 290;
      }

      if (entity.x > 290) {
        entity.x = 30;
      }
    }

    for (const corner of corners) {
      if (overlaps(entity, corner)) {
        if (!corner.directions.includes(entity.direction)) {
          if (entity.direction === Direction.UP && entity.y < corner.y) {
            entity.y = corner.y;
          } else if (
            entity.direction === Direction.DOWN &&
            entity.y > corner.y
          ) {
            entity.y = corner.y;
          } else if (
            entity.direction === Direction.LEFT &&
            entity.x < corner.x
          ) {
            entity.x = corner.x;
          } else if (
            entity.direction === Direction.RIGHT &&
            entity.x > corner.x
          ) {
            entity.x = corner.x;
          }
        }
      }
    }

    if (entity.x < 0 || entity.x > 320 || entity.y < 0 || entity.y > 368) {
      throw new Error(
        `Entity out of bounds: (${entity.x}, ${entity.y}, ${entity.direction})`
      );
    }
  }
}
