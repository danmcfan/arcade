import { Direction } from "../types";
import { State } from "../state";
import { getResizeHandler } from "../handler";
import { createSweetState } from "../sweet/state";

export function handleInput(state: State) {
  if (
    state.keys.has("KeyW") ||
    state.keys.has("KeyS") ||
    state.keys.has("KeyA") ||
    state.keys.has("KeyD") ||
    state.keys.has("ArrowUp") ||
    state.keys.has("ArrowDown") ||
    state.keys.has("ArrowLeft") ||
    state.keys.has("ArrowRight")
  ) {
    state.player.running = true;
  } else {
    state.player.running = false;
    state.player.dx = 0;
    state.player.dy = 0;
  }

  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) {
    state.player.direction = Direction.UP;
    state.player.dx = 0;
    state.player.dy = -1;
  }

  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) {
    state.player.direction = Direction.DOWN;
    state.player.dx = 0;
    state.player.dy = 1;
  }

  if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
    state.player.direction = Direction.LEFT;
    state.player.dx = -1;
    state.player.dy = 0;
  }

  if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
    state.player.direction = Direction.RIGHT;
    state.player.dx = 1;
    state.player.dy = 0;
  }

  if (
    state.keys.has("Space") ||
    state.keys.has("Enter") ||
    state.keys.has("KeyE")
  ) {
    const resizeHandler = getResizeHandler(state);
    for (const machine of state.machines) {
      if (machine.active) {
        state.activeGame = machine.gameID;
        state.activeGameState = createSweetState();
        state.initialScale = 0.5;
        state.gameWidth = state.activeGameState.background.width * 16;
        state.gameHeight = state.activeGameState.background.height * 16;
        resizeHandler();
      }
    }
  }
}
