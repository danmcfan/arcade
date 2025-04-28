import { Direction } from "../state";
import { SweetState } from "./state";
import { overlaps } from "./util";
export function handleMovement(state: SweetState, deltaTime: number) {
  const { player, corners } = state;

  const delta = player.velocity * (deltaTime / 10);

  switch (player.direction) {
    case Direction.UP:
      player.y -= delta;
      break;
    case Direction.DOWN:
      player.y += delta;
      break;
    case Direction.LEFT:
      player.x -= delta;
      break;
    case Direction.RIGHT:
      player.x += delta;
      break;
  }

  if (player.x < 8) {
    player.x = 280;
  }

  if (player.x > 280) {
    player.x = 8;
  }

  for (const corner of corners) {
    if (overlaps(player, corner)) {
      if (!corner.directions.includes(player.direction)) {
        if (player.direction === Direction.UP && player.y < corner.y) {
          player.y = corner.y;
        } else if (player.direction === Direction.DOWN && player.y > corner.y) {
          player.y = corner.y;
        } else if (player.direction === Direction.LEFT && player.x < corner.x) {
          player.x = corner.x;
        } else if (
          player.direction === Direction.RIGHT &&
          player.x > corner.x
        ) {
          player.x = corner.x;
        }
      }
    }
  }
}
