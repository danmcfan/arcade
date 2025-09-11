import { Direction } from "@/lib/direction";
import { Entity } from "@/lib/entity";
import { SpriteSheetID, areSpritesLoaded, getSpriteSheet } from "@/lib/sprite";
import { State } from "@/lib/state";

const MS_PER_FRAME = 1000 / 60;

const LEVEL_WIDTH = 304;
const LEVEL_HEIGHT = 368;

const DISTANCE_THRESHOLD = 0.25;

const DEBUG = false;

export function getGameLoop(state: State) {
  function animate(current: number) {
    if (!areSpritesLoaded(state.spriteSheets)) {
      return;
    }

    let elapsed = current - state.previous;
    state.previous = current;

    elapsed = Math.min(elapsed, MS_PER_FRAME * 10);
    state.lag += elapsed;

    // process input
    const corner = withinDistanceCorner(state.player, state.corners);
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
      if (!state.player.direction) {
        throw new Error("Player has no direction");
      }

      if (newDirection && corner.directions.includes(newDirection)) {
        if (
          ([Direction.UP, Direction.DOWN].includes(newDirection) &&
            [Direction.LEFT, Direction.RIGHT].includes(
              state.player.direction
            )) ||
          ([Direction.LEFT, Direction.RIGHT].includes(newDirection) &&
            [Direction.UP, Direction.DOWN].includes(state.player.direction))
        ) {
          state.player.x = corner.x;
          state.player.y = corner.y;
        }

        state.player.direction = newDirection;
      }
    } else {
      let validDirections = [state.player.direction];
      if (state.player.direction === Direction.UP) {
        validDirections.push(Direction.DOWN);
      } else if (state.player.direction === Direction.DOWN) {
        validDirections.push(Direction.UP);
      } else if (state.player.direction === Direction.LEFT) {
        validDirections.push(Direction.RIGHT);
      } else if (state.player.direction === Direction.RIGHT) {
        validDirections.push(Direction.LEFT);
      }

      if (newDirection && validDirections.includes(newDirection)) {
        state.player.direction = newDirection;
      }
    }

    // update
    while (state.lag >= MS_PER_FRAME) {
      for (const entity of [
        state.player,
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

      for (const entity of [state.player, ...state.bees]) {
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

      state.lag -= MS_PER_FRAME;
    }

    // render
    state.ctx.save();
    state.ctx.scale(state.scale, state.scale);

    state.ctx.clearRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    const spriteLevel = getSpriteSheet(state.spriteSheets, SpriteSheetID.HIVE);
    if (!spriteLevel) {
      return;
    }

    state.ctx.drawImage(
      spriteLevel.image,
      0,
      0,
      spriteLevel.width,
      spriteLevel.height,
      0,
      0,
      LEVEL_WIDTH,
      LEVEL_HEIGHT
    );

    for (const entity of [
      state.player,
      ...state.bees,
      ...state.points,
      ...state.powers,
      ...state.corners,
    ]) {
      let spriteSheet = null;
      if (entity.spriteSheetID) {
        spriteSheet = getSpriteSheet(state.spriteSheets, entity.spriteSheetID);
      }

      if (spriteSheet) {
        let spriteRow = 0;
        if (entity.direction) {
          spriteRow = entity.frameDirection.get(entity.direction) || 0;
        }

        state.ctx.drawImage(
          spriteSheet.image,
          spriteSheet.width * Math.floor(entity.frame),
          spriteSheet.height * (spriteRow + entity.frameRowOffset),
          spriteSheet.width,
          spriteSheet.height,
          Math.floor(entity.x - entity.offsetX),
          Math.floor(entity.y - entity.offsetY),
          spriteSheet.width,
          spriteSheet.height
        );
      }

      if (DEBUG) {
        state.ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        state.ctx.strokeStyle = "rgba(255, 0, 0, 0.75)";
        state.ctx.lineWidth = 1;
        state.ctx.beginPath();
        state.ctx.arc(
          Math.floor(entity.x),
          Math.floor(entity.y),
          entity.radius,
          0,
          Math.PI * 2
        );
        state.ctx.fill();
        state.ctx.stroke();

        for (const direction of entity.directions) {
          state.ctx.beginPath();
          state.ctx.moveTo(entity.x, entity.y);

          if (direction === Direction.UP) {
            state.ctx.lineTo(entity.x, entity.y - 4);
          } else if (direction === Direction.DOWN) {
            state.ctx.lineTo(entity.x, entity.y + 4);
          } else if (direction === Direction.LEFT) {
            state.ctx.lineTo(entity.x - 4, entity.y);
          } else if (direction === Direction.RIGHT) {
            state.ctx.lineTo(entity.x + 4, entity.y);
          }

          state.ctx.fill();
          state.ctx.stroke();
        }
      }
    }

    state.ctx.restore();
  }

  function gameLoop(timestamp: number) {
    animate(timestamp);
    requestAnimationFrame(gameLoop);
  }

  return gameLoop;
}

function withinDistanceCorner(
  entity: Entity,
  corners: Entity[]
): Entity | null {
  for (const corner of corners) {
    if (withinDistance(entity, corner)) {
      return corner;
    }
  }
  return null;
}

function withinDistance(entity1: Entity, entity2: Entity) {
  return (
    Math.abs(entity1.x - entity2.x) <= DISTANCE_THRESHOLD &&
    Math.abs(entity1.y - entity2.y) <= DISTANCE_THRESHOLD
  );
}
