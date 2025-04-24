import type { SweetState } from "@/lib/sweet";
import type { Input } from "@/lib/engine/input";
import { hasControl } from "@/lib/engine/input";
import { overlaps } from "@/lib/sweet/util";

export type Entity = number;

export type Direction = "up" | "down" | "left" | "right";

export type Position = {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  velocity: number;
};

export type Enemy = {
  lastCorner: Entity | null;
  scaredTime: number;
};

export type Sprite = {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  size: number;
};

export type Animation = {
  frame: number;
};

export function createEntity(entities: Set<Entity>): Entity {
  const entity = entities.size;
  entities.add(entity);
  return entity;
}

export function createPosition(
  x: number,
  y: number,
  radius: number = 0,
  direction: Direction = "down",
  velocity: number = 0
): Position {
  return { x, y, radius, direction, velocity };
}

export function createEnemy(lastCorner: Entity | null): Enemy {
  return { lastCorner, scaredTime: 0 };
}

export function createSprite(
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number = 0,
  offsetY: number = 0,
  size: number = 1
): Sprite {
  const image = new Image();
  image.src = src;
  return { image, x, y, width, height, offsetX, offsetY, size };
}

export function createAnimation(frame: number): Animation {
  return { frame };
}

export function inputSystem(state: SweetState, input: Input) {
  for (const entity of state.players) {
    const position = state.positions.get(entity);

    if (!position) {
      continue;
    }

    const verticalDirections = ["up", "down"];
    if (verticalDirections.includes(position.direction)) {
      for (const direction of verticalDirections) {
        if (hasControl(input, direction)) {
          position.direction = direction as Direction;
        }
      }
    }

    const horizontalDirections = ["left", "right"];
    if (horizontalDirections.includes(position.direction)) {
      for (const direction of horizontalDirections) {
        if (hasControl(input, direction)) {
          position.direction = direction as Direction;
        }
      }
    }

    for (const cornerEntity of state.corners) {
      const cornerPosition = state.positions.get(cornerEntity);
      const cornerDirections = state.directions.get(cornerEntity);

      if (cornerPosition && cornerDirections) {
        if (overlaps(position, cornerPosition)) {
          for (const direction of cornerDirections) {
            if (hasControl(input, direction)) {
              if (position.direction == direction) {
                return;
              }

              if (direction == "left" || direction == "right") {
                position.y = cornerPosition.y;
              }

              if (direction == "up" || direction == "down") {
                position.x = cornerPosition.x;
              }

              position.direction = direction;
              return;
            }
          }
        }
      }
    }
  }
}

export function enemySystem(state: SweetState, timeFactor: number) {
  for (const entity of state.enemies) {
    const position = state.positions.get(entity);
    const enemyComponent = state.enemyComponents.get(entity);
    if (position && enemyComponent) {
      if (enemyComponent.scaredTime > 0) {
        enemyComponent.scaredTime -= timeFactor;
        if (enemyComponent.scaredTime <= 0) {
          enemyComponent.scaredTime = 0;
        }
      }

      for (const corner of state.corners) {
        const cornerPosition = state.positions.get(corner);
        const cornerDirections = state.directions.get(corner);
        if (cornerPosition && cornerDirections) {
          if (overlaps(position, cornerPosition)) {
            if (enemyComponent.lastCorner == corner) {
              continue;
            }

            let randomDirections = [...cornerDirections];
            switch (position.direction) {
              case "up":
                randomDirections = randomDirections.filter(
                  (direction) => direction !== "down"
                );
                break;
              case "down":
                randomDirections = randomDirections.filter(
                  (direction) => direction !== "up"
                );
                break;
              case "left":
                randomDirections = randomDirections.filter(
                  (direction) => direction !== "right"
                );
                break;
              case "right":
                randomDirections = randomDirections.filter(
                  (direction) => direction !== "left"
                );
                break;
            }

            const randomDirection =
              randomDirections[
                Math.floor(Math.random() * randomDirections.length)
              ];

            if (position.direction == randomDirection) {
              continue;
            }

            if (randomDirection == "left" || randomDirection == "right") {
              position.y = cornerPosition.y;
            }

            if (randomDirection == "up" || randomDirection == "down") {
              position.x = cornerPosition.x;
            }

            position.direction = randomDirection;
            enemyComponent.lastCorner = corner;
          }
        }
      }
    }
  }
}

export function animationSystem(state: SweetState, timeFactor: number) {
  for (const entity of [...state.players, ...state.enemies]) {
    const position = state.positions.get(entity);
    const sprite = state.sprites.get(entity);
    const animation = state.animations.get(entity);
    const enemyComponent = state.enemyComponents.get(entity);

    if (position && sprite && animation) {
      let row = 0;

      if (state.players.has(entity)) {
        animation.frame += timeFactor / 15;
        animation.frame %= 4;

        switch (position.direction) {
          case "up":
            row = 17;
            break;
          case "right":
          case "left":
            row = 1;
            break;
          case "down":
            row = 18;
            break;
        }

        if (state.winner) {
          row = 19;
        }
      }

      if (state.enemies.has(entity)) {
        animation.frame += timeFactor / 15;
        animation.frame %= 4;

        if (enemyComponent) {
          if (enemyComponent.scaredTime > 0) {
            row = 1;
            if (enemyComponent.scaredTime < 300) {
              row = 2;
            }
          }
        }
      }

      sprite.x = Math.floor(animation.frame) * sprite.width;
      sprite.y = row * sprite.height;
    }
  }
}

export function positionSystem(state: SweetState, timeFactor: number) {
  const { entities, positions } = state;
  for (const entity of entities) {
    const position = positions.get(entity);
    if (position) {
      const delta = position.velocity * timeFactor;
      switch (position.direction) {
        case "up":
          position.y -= delta;
          break;
        case "down":
          position.y += delta;
          break;
        case "left":
          position.x -= delta;
          break;
        case "right":
          position.x += delta;
          break;
      }

      if (position.x < 8) {
        position.x = 280;
      }

      if (position.x > 280) {
        position.x = 8;
      }
    }
  }
}

export function cornerSystem(state: SweetState) {
  const { players, enemies, corners, positions } = state;
  for (const entity of [...players, ...enemies]) {
    const position = positions.get(entity);
    if (position) {
      for (const corner of corners) {
        const cornerPosition = positions.get(corner);
        const cornerDirections = state.directions.get(corner);

        if (cornerPosition && cornerDirections) {
          if (overlaps(position, cornerPosition)) {
            if (!cornerDirections.includes(position.direction)) {
              if (
                position.direction == "left" &&
                position.x < cornerPosition.x
              ) {
                position.x = cornerPosition.x;
              }

              if (
                position.direction == "right" &&
                position.x > cornerPosition.x
              ) {
                position.x = cornerPosition.x;
              }

              if (position.direction == "up" && position.y < cornerPosition.y) {
                position.y = cornerPosition.y;
              }

              if (
                position.direction == "down" &&
                position.y > cornerPosition.y
              ) {
                position.y = cornerPosition.y;
              }
            }
          }
        }
      }
    }
  }
}

export function collisionSystem(state: SweetState) {
  const { players, points, powers, enemies, positions, enemyComponents } =
    state;
  for (const entity of players) {
    const position = positions.get(entity);
    if (position) {
      const targets = new Set([...points, ...powers]);
      for (const target of targets) {
        const targetPosition = positions.get(target);
        if (targetPosition) {
          if (overlaps(position, targetPosition)) {
            if (points.has(target)) {
              points.delete(target);
              state.score += 10;
            }

            if (powers.has(target)) {
              powers.delete(target);
              state.score += 50;
              for (const enemy of enemies) {
                const enemyComponent = enemyComponents.get(enemy);
                if (enemyComponent) {
                  enemyComponent.scaredTime = 1200;
                }
              }
            }
          }
        }
      }

      if (points.size === 0 && powers.size === 0) {
        state.winner = true;
      }

      for (const enemy of enemies) {
        const enemyPosition = positions.get(enemy);
        const enemyComponent = enemyComponents.get(enemy);
        if (enemyPosition && enemyComponent) {
          if (overlaps(position, enemyPosition)) {
            if (enemyComponent.scaredTime > 0) {
              state.score += 200;
              enemyPosition.x = 96;
              enemyPosition.y = 128;
              enemyPosition.direction = "right";
              enemyComponent.scaredTime = 0;
            } else {
              state.dead = true;
            }
          }
        }
      }
    }
  }
}

export function floatSystem(state: SweetState, timeDelta: number) {
  state.timeDeltaFloat += timeDelta;
  if (state.timeDeltaFloat < 1000 / 120) {
    return;
  }

  const timeFactor = state.timeDeltaFloat / (1000 / 120);

  if (state.floating) {
    state.floatOffset += timeFactor / 40;
  } else {
    state.floatOffset -= timeFactor / 40;
  }

  if (state.floatOffset <= -1) {
    state.floatOffset = -1;
    state.floating = true;
  }

  if (state.floatOffset >= 0) {
    state.floatOffset = 0;
    state.floating = false;
  }

  state.timeDeltaFloat = 0;
}

export function drawSystem(
  state: SweetState,
  ctx: CanvasRenderingContext2D,
  scale: number,
  debug: boolean = false
) {
  const { players, enemies, corners, points, powers, positions, sprites } =
    state;
  const orderedEntities = new Set([
    ...points,
    ...powers,
    ...enemies,
    ...corners,
    ...players,
  ]);
  for (const entity of orderedEntities) {
    const position = positions.get(entity);
    const sprite = sprites.get(entity);

    if (!debug) {
      if (!position || !sprite) {
        continue;
      }

      ctx.save();

      let dx = position.x + sprite.offsetX * sprite.size;
      let dy = position.y + sprite.offsetY * sprite.size;
      if (position.direction == "left") {
        dx = -position.x + sprite.offsetX * sprite.size;
        ctx.scale(-1, 1);
      }

      if (points.has(entity) || powers.has(entity)) {
        dy += state.floatOffset;
      }

      ctx.drawImage(
        sprite.image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        Math.floor(dx * scale),
        Math.floor(dy * scale),
        Math.floor(sprite.width * scale * sprite.size),
        Math.floor(sprite.height * scale * sprite.size)
      );

      ctx.restore();
    } else {
      if (!position) {
        continue;
      }

      ctx.save();

      let radius = 0;
      let color = "red";
      if (players.has(entity)) {
        radius = position.radius;
      } else if (corners.has(entity)) {
        radius = 4;
        color = "blue";
      } else if (points.has(entity)) {
        radius = 2;
        color = "green";
      } else if (powers.has(entity)) {
        radius = 2;
        color = "yellow";
      }

      ctx.beginPath();
      ctx.arc(
        Math.floor(position.x * scale),
        Math.floor(position.y * scale),
        Math.floor(radius * scale),
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (players.has(entity)) {
        const centerX = Math.floor(position.x * scale);
        const centerY = Math.floor(position.y * scale);
        const hashSize = Math.floor(position.radius * scale * 0.5);

        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(centerX - hashSize, centerY);
        ctx.lineTo(centerX + hashSize, centerY);
        // Vertical line
        ctx.moveTo(centerX, centerY - hashSize);
        ctx.lineTo(centerX, centerY + hashSize);

        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (corners.has(entity)) {
        const centerX = Math.floor(position.x * scale);
        const centerY = Math.floor(position.y * scale);
        const hashSize = Math.floor(position.radius * scale * 1.5);

        const directions = state.directions.get(entity);
        if (directions) {
          for (const direction of directions) {
            let endX = centerX;
            let endY = centerY;
            switch (direction) {
              case "up":
                endY -= hashSize;
                break;
              case "down":
                endY += hashSize;
                break;
              case "left":
                endX -= hashSize;
                break;
              case "right":
                endX += hashSize;
                break;
            }
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }
  }
}
