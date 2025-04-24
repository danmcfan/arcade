import type { SweetState } from "@/lib/sweet";
import type { Corner } from "@/lib/sweet/corner";
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

    const corner = getNearestCorner(position, state.corners);
    if (corner) {
      for (const direction of corner.directions) {
        if (hasControl(input, direction)) {
          if (position.direction == direction) {
            return;
          }

          if (direction == "left" || direction == "right") {
            position.y = corner.y;
          }

          if (direction == "up" || direction == "down") {
            position.x = corner.x;
          }

          position.direction = direction as Direction;
        }
      }

      if (corner.directions.includes(position.direction)) {
        return;
      }

      if (position.direction == "left" && position.x < corner.x) {
        position.x = corner.x;
      }

      if (position.direction == "right" && position.x > corner.x) {
        position.x = corner.x;
      }

      if (position.direction == "up" && position.y < corner.y) {
        position.y = corner.y;
      }

      if (position.direction == "down" && position.y > corner.y) {
        position.y = corner.y;
      }
    }
  }
}

function getNearestCorner(
  position: Position,
  corners: Corner[]
): Corner | null {
  const corner = corners.find((corner) => {
    const dx = corner.x - position.x;
    const dy = corner.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < position.radius;
  });

  if (!corner) {
    return null;
  }

  return corner;
}

export function animationSystem(state: SweetState, timeFactor: number) {
  for (const entity of state.players) {
    const position = state.positions.get(entity);
    const sprite = state.sprites.get(entity);
    const animation = state.animations.get(entity);
    if (position && sprite && animation) {
      animation.frame += timeFactor / 10;
      animation.frame %= 6;

      let row = 0;
      switch (position.direction) {
        case "up":
          row = 5;
          break;
        case "right":
        case "left":
          row = 4;
          break;
        case "down":
          row = 3;
          break;
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

export function collisionSystem(state: SweetState) {
  const { players, points, powers, positions, sprites } = state;
  for (const entity of players) {
    const position = positions.get(entity);
    if (position) {
      const targets = new Set([...points, ...powers]);
      for (const target of targets) {
        const targetPosition = positions.get(target);
        if (targetPosition) {
          if (overlaps(position, targetPosition)) {
            positions.delete(target);
            sprites.delete(target);

            if (points.has(target)) {
              state.score += 10;
            }

            if (powers.has(target)) {
              state.score += 50;
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
  const { players, points, powers, positions, sprites } = state;
  const orderedEntities = new Set([...points, ...powers, ...players]);
  for (const entity of orderedEntities) {
    const position = positions.get(entity);
    const sprite = sprites.get(entity);
    if (position && sprite) {
      ctx.save();

      if (!debug) {
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
      } else {
        ctx.beginPath();
        ctx.arc(
          Math.floor(position.x * scale),
          Math.floor(position.y * scale),
          Math.floor(position.radius * scale),
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();

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
      ctx.restore();
    }
  }
}
