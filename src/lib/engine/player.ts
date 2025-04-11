import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { Sprite } from "@/lib/engine/sprite";
import type { Hitbox } from "@/lib/engine/hitbox";
import { createHitbox, intersects } from "@/lib/engine/hitbox";
import { playSound, pauseSound } from "@/lib/engine/sound";

const HITBOX_X_OFFSET = -8;
const HITBOX_Y_OFFSET = -2;
const HITBOX_WIDTH_OFFSET = -16;
const HITBOX_HEIGHT_OFFSET = -8;

export type Player = {
  frame: number;
  timeDelta: number;
  sprite: Sprite;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isRunning: boolean;
  hitbox: Hitbox;
};

export function createPlayer(x: number, y: number, sprite: Sprite): Player {
  return {
    frame: 0,
    timeDelta: 0,
    sprite,
    x,
    y,
    direction: "down",
    isRunning: false,
    hitbox: createHitbox(
      x,
      y,
      sprite.width + HITBOX_WIDTH_OFFSET,
      sprite.height + HITBOX_HEIGHT_OFFSET
    ),
  };
}

export function drawPlayer(state: State) {
  const { ctx, player } = state;

  if (!player) return;

  if (player.isRunning) {
    playSound(state.sounds.footstep);
  } else {
    pauseSound(state.sounds.footstep, 100);
  }

  ctx.save();

  let dx = player.x + HITBOX_X_OFFSET;
  let dy = player.y + HITBOX_Y_OFFSET;

  if (player.direction === "left") {
    ctx.scale(-1, 1);
    dx = -player.x - HITBOX_X_OFFSET - player.sprite.width;
  }

  ctx.drawImage(
    player.sprite.image,
    player.sprite.x,
    player.sprite.y,
    player.sprite.width,
    player.sprite.height,
    Math.floor(dx * state.scale),
    Math.floor(dy * state.scale),
    Math.floor(player.sprite.width * state.scale),
    Math.floor(player.sprite.height * state.scale)
  );

  ctx.restore();

  if (state.debug) {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 255, 0.25)";
    ctx.fillRect(
      Math.floor(player.x + HITBOX_X_OFFSET) * state.scale,
      Math.floor(player.y + HITBOX_Y_OFFSET) * state.scale,
      Math.floor(player.sprite.width * state.scale),
      Math.floor(player.sprite.height * state.scale)
    );

    ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
    ctx.fillRect(
      Math.floor(player.hitbox.x) * state.scale,
      Math.floor(player.hitbox.y) * state.scale,
      Math.floor(player.hitbox.width * state.scale),
      Math.floor(player.hitbox.height * state.scale)
    );

    ctx.restore();
  }
}

export function updatePlayer(state: RefObject<State | null>) {
  if (!state.current) return;

  const { player, keysDown, timeDelta } = state.current;

  if (!player) return;

  player.timeDelta += timeDelta;
  if (player.timeDelta > 100) {
    player.frame += 1;
    player.frame %= 6;
    player.sprite.x = player.frame * player.sprite.width;
    player.timeDelta = 0;
  }

  let vertical = 0;
  let horizontal = 0;

  if (keysDown.has("KeyW") || keysDown.has("ArrowUp")) {
    vertical = -1;
  }
  if (keysDown.has("KeyS") || keysDown.has("ArrowDown")) {
    vertical = 1;
  }
  if (keysDown.has("KeyA") || keysDown.has("ArrowLeft")) {
    horizontal = -1;
  }
  if (keysDown.has("KeyD") || keysDown.has("ArrowRight")) {
    horizontal = 1;
  }

  if (horizontal !== 0) {
    player.isRunning = true;
    player.direction = horizontal === -1 ? "left" : "right";
  } else if (vertical !== 0) {
    player.isRunning = true;
    player.direction = vertical === -1 ? "up" : "down";
  } else {
    player.isRunning = false;
  }

  switch (player.direction) {
    case "down":
      player.sprite.y = 0 * player.sprite.height;
      break;
    case "left":
    case "right":
      player.sprite.y = 1 * player.sprite.height;
      break;
    case "up":
      player.sprite.y = 2 * player.sprite.height;
      break;
  }

  if (player.isRunning) {
    player.sprite.y += 3 * player.sprite.height;
  }

  let speed = 0.5;
  if (horizontal !== 0 && vertical !== 0) {
    speed *= 0.7;
  }

  if (horizontal) {
    move(state, { x: horizontal * speed, y: 0 });
  }

  if (vertical) {
    move(state, { x: 0, y: vertical * speed });
  }

  player.hitbox.x = player.x;
  player.hitbox.y = player.y;
}

function move(
  state: RefObject<State | null>,
  direction: { x: number; y: number }
) {
  if (!state.current) return;

  const { player } = state.current;

  if (!player) return;

  let newX = player.x + direction.x;
  let newY = player.y + direction.y;

  const { collisionHitboxes } = state.current;

  const intersectingHitboxes = collisionHitboxes.filter((hitbox) =>
    intersects(
      {
        x: newX,
        y: newY,
        width: player.hitbox.width,
        height: player.hitbox.height,
      },
      hitbox
    )
  );

  if (intersectingHitboxes.length > 0) {
    for (const hitbox of intersectingHitboxes) {
      if (direction.x > 0) {
        newX = hitbox.x - player.hitbox.width;
      } else if (direction.x < 0) {
        newX = hitbox.x + hitbox.width;
      }

      if (direction.y > 0) {
        newY = hitbox.y - player.hitbox.height;
      } else if (direction.y < 0) {
        newY = hitbox.y + hitbox.height;
      }

      if (
        intersects(
          {
            x: newX,
            y: newY,
            width: player.hitbox.width,
            height: player.hitbox.height,
          },
          hitbox
        )
      ) {
        return;
      }

      player.x = newX;
      player.y = newY;
    }
  } else {
    player.x = newX;
    player.y = newY;
  }
}
