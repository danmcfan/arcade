import { State } from "@/lib/state";
import { Direction } from "@/lib/direction";
import { withinDistanceCorner } from "@/lib/distance";
import { SWEET_SAM } from "@/lib/constant";

export function update(state: State) {
  if (SWEET_SAM) {
    updateSweetSam(state);
  } else {
    updateArcade(state);
  }
}

function updateArcade(state: State) {
  const entity = state.gamer;
  entity.frame += entity.frameIncrement;
  entity.frame %= entity.frameCount;

  switch (entity.direction) {
    case Direction.UP:
      entity.y -= entity.velocity;
      break;
    case Direction.DOWN:
      entity.y += entity.velocity;
      break;
    case Direction.LEFT:
      entity.x -= entity.velocity;
      break;
    case Direction.RIGHT:
      entity.x += entity.velocity;
      break;
  }

  entity.x = Math.max(
    8 * 3 + entity.offsetX,
    Math.min(entity.x, 8 * 15 + entity.offsetX)
  );

  entity.y = Math.max(
    8 * 6 + entity.offsetY,
    Math.min(entity.y, 8 * 12 + entity.offsetY)
  );

  if (
    entity.x >= 8 * 9 &&
    entity.x <= 8 * 11 &&
    entity.y >= 8 * 8 &&
    entity.y <= 8 * 9 &&
    entity.direction === Direction.UP
  ) {
    state.title = true;
  } else {
    state.title = false;
  }
}

function updateSweetSam(state: State) {
  for (const entity of [
    state.bear,
    ...state.bees,
    ...state.points,
    ...state.powers,
  ]) {
    entity.frame += entity.frameIncrement;
    entity.frame %= entity.frameCount;
  }

  for (const entity of state.bees) {
    const corner = withinDistanceCorner(entity, state.corners);
    if (corner) {
      if (entity.lastCorner !== corner) {
        entity.lastCorner = corner;

        if (!entity.direction) {
          throw new Error("Entity has no direction");
        }

        let newDirection = entity.direction;
        while (newDirection === entity.direction) {
          newDirection =
            corner.directions[
              Math.floor(Math.random() * corner.directions.length)
            ];
        }

        entity.x = corner.x;
        entity.y = corner.y;
        entity.direction = newDirection;
      }
    }
  }

  for (const entity of [state.bear, ...state.bees]) {
    if (!entity.direction) {
      throw new Error("Entity has no direction");
    }

    const corner = withinDistanceCorner(entity, state.corners);
    let validDirections = [
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    ];
    if (corner) {
      validDirections = corner.directions;
    }

    if (validDirections.includes(entity.direction)) {
      if (entity.direction === Direction.UP) {
        entity.y -= entity.velocity;
      } else if (entity.direction === Direction.DOWN) {
        entity.y += entity.velocity;
      } else if (entity.direction === Direction.LEFT) {
        entity.x -= entity.velocity;
      } else if (entity.direction === Direction.RIGHT) {
        entity.x += entity.velocity;
      }
    }

    if (entity.y === 16 * 10 + 8) {
      if (entity.x <= 16) {
        entity.x = 16 * 18;
      } else if (entity.x >= 16 * 18) {
        entity.x = 16;
      }
    }
  }
}
