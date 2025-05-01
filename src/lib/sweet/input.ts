import { Direction } from "../types";
import { State } from "../state";
import { overlaps } from "./util";

export function handleInput(state: State) {
  if (state.keys.has("Escape")) {
    state.activeGame = null;
    state.activeGameState = null;

    state.scaleBase = 2;
    state.gameWidth = state.background.width * 16;
    state.gameHeight = state.background.height * 16;
  }

  const { activeGameState } = state;

  if (!activeGameState) {
    return;
  }

  const { player, corners } = activeGameState;

  if ([Direction.UP, Direction.DOWN].includes(player.direction)) {
    if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) {
      player.direction = Direction.UP;
    } else if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) {
      player.direction = Direction.DOWN;
    }
  }

  if ([Direction.LEFT, Direction.RIGHT].includes(player.direction)) {
    if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
      player.direction = Direction.LEFT;
    } else if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
      player.direction = Direction.RIGHT;
    }
  }

  for (const corner of corners) {
    if (overlaps(player, corner)) {
      for (const direction of corner.directions) {
        if (
          direction === Direction.UP &&
          (state.keys.has("KeyW") || state.keys.has("ArrowUp"))
        ) {
          player.direction = direction;
          player.x = corner.x;
        }
        if (
          direction === Direction.DOWN &&
          (state.keys.has("KeyS") || state.keys.has("ArrowDown"))
        ) {
          player.direction = direction;
          player.x = corner.x;
        }
        if (
          direction === Direction.LEFT &&
          (state.keys.has("KeyA") || state.keys.has("ArrowLeft"))
        ) {
          player.direction = direction;
          player.y = corner.y;
        }
        if (
          direction === Direction.RIGHT &&
          (state.keys.has("KeyD") || state.keys.has("ArrowRight"))
        ) {
          player.direction = direction;
          player.y = corner.y;
        }
      }
    }
  }
}
