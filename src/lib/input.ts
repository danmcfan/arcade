import { Direction } from "@/lib/direction";
import { withinDistanceCorner } from "@/lib/distance";
import { State } from "@/lib/state";
import { SWEET_SAM } from "@/lib/constant";

export function handleInput(state: State) {
  if (SWEET_SAM) {
    handleSweetSamInput(state);
  } else {
    handleArcadeInput(state);
  }
}

function handleArcadeInput(state: State) {
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) {
    state.gamer.direction = Direction.UP;
    state.gamer.velocity = 1.0;
  } else if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) {
    state.gamer.direction = Direction.DOWN;
    state.gamer.velocity = 1.0;
  } else if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
    state.gamer.direction = Direction.LEFT;
    state.gamer.velocity = 1.0;
  } else if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
    state.gamer.direction = Direction.RIGHT;
    state.gamer.velocity = 1.0;
  } else {
    state.gamer.velocity = 0;
  }
}

function handleSweetSamInput(state: State) {
  const corner = withinDistanceCorner(state.bear, state.corners);
  let newDirection = null;
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) {
    newDirection = Direction.UP;
  } else if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) {
    newDirection = Direction.DOWN;
  } else if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
    newDirection = Direction.LEFT;
  } else if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
    newDirection = Direction.RIGHT;
  }

  if (corner) {
    if (!state.bear.direction) {
      throw new Error("bear has no direction");
    }

    if (newDirection && corner.directions.includes(newDirection)) {
      if (
        ([Direction.UP, Direction.DOWN].includes(newDirection) &&
          [Direction.LEFT, Direction.RIGHT].includes(state.bear.direction)) ||
        ([Direction.LEFT, Direction.RIGHT].includes(newDirection) &&
          [Direction.UP, Direction.DOWN].includes(state.bear.direction))
      ) {
        state.bear.x = corner.x;
        state.bear.y = corner.y;
      }

      state.bear.direction = newDirection;
    }
  } else {
    let validDirections = [state.bear.direction];
    if (state.bear.direction === Direction.UP) {
      validDirections.push(Direction.DOWN);
    } else if (state.bear.direction === Direction.DOWN) {
      validDirections.push(Direction.UP);
    } else if (state.bear.direction === Direction.LEFT) {
      validDirections.push(Direction.RIGHT);
    } else if (state.bear.direction === Direction.RIGHT) {
      validDirections.push(Direction.LEFT);
    }

    if (newDirection && validDirections.includes(newDirection)) {
      state.bear.direction = newDirection;
    }
  }
}
