import { State, Direction } from "../state";

export function handleCollision(state: State) {
  if (state.player.x < 22) {
    state.player.x = 22;
  }

  if (state.player.x > 137) {
    state.player.x = 137;
  }

  if (state.player.y < 59) {
    state.player.y = 59;
  }

  if (state.player.y > 136) {
    state.player.y = 136;
  }

  for (const machine of state.machines) {
    const minX = machine.x - 7;
    const maxX = machine.x + 23;
    const minY = machine.y;
    const maxY = machine.y + 27;

    if (
      state.player.x >= minX &&
      state.player.x <= maxX &&
      state.player.y >= minY &&
      state.player.y <= maxY
    ) {
      // Determine which side of the machine the player is colliding with
      const fromLeft = state.player.x - minX;
      const fromRight = maxX - state.player.x;
      const fromTop = state.player.y - minY;
      const fromBottom = maxY - state.player.y;

      // Find the minimum distance to push the player out
      const minDistance = Math.min(fromLeft, fromRight, fromTop, fromBottom);

      // Push the player out based on the closest edge
      if (minDistance === fromLeft && state.player.dx > 0) {
        state.player.x = minX;
      } else if (minDistance === fromRight && state.player.dx < 0) {
        state.player.x = maxX;
      } else if (minDistance === fromTop && state.player.dy > 0) {
        state.player.y = minY;
      } else if (minDistance === fromBottom && state.player.dy < 0) {
        state.player.y = maxY;
      }
    }
  }

  for (const machine of state.machines) {
    const minX = machine.x;
    const maxX = machine.x + 16;
    const minY = machine.y + 16;
    const maxY = machine.y + 36;

    if (
      state.player.x >= minX &&
      state.player.x <= maxX &&
      state.player.y >= minY &&
      state.player.y <= maxY &&
      state.player.direction === Direction.UP
    ) {
      machine.active = true;
    } else {
      machine.active = false;
      machine.frame = 0;
    }
  }
}
