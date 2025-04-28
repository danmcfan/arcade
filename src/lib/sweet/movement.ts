import { Direction } from "../state";
import { SweetState } from "./state";
import { overlaps } from "./util";
export function handleMovement(state: SweetState, deltaTime: number) {
  const { player, enemies, corners } = state;

  for (const entity of [player, ...enemies]) {
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

    if (entity.x < 8) {
      entity.x = 280;
    }

    if (entity.x > 280) {
      entity.x = 8;
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
  }
}
