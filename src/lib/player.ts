import type { RefObject } from "react";
import type { GameState } from "@/lib/game";
import type { Sprite } from "@/lib/sprite";
import type { Hitbox } from "@/lib/hitbox";
import { createHitbox } from "@/lib/hitbox";
import { SpriteID, drawSprite, getSprite } from "@/lib/sprite";
import { calculateFrame, screenPosition, screenCenter } from "@/lib/util";

const PLAYER_WALKING_SPEED = 1.5;
const PLAYER_ROLLING_SPEED = 2.5;

export type Player = {
  x: number;
  y: number;
  image: HTMLImageElement;
  frame: number;
  direction: "down" | "right" | "left" | "up";
  isWalking: boolean;
  isRolling: boolean;
  attackDelay: number;
  sprite: Sprite;
  overlaySprite: Sprite | null;
  hitbox: Hitbox;
  swordHitbox: Hitbox | null;
};

export function updatePlayer(state: RefObject<GameState>) {
  if (state.current.shiftPressed) {
    state.current.player.isRolling = true;
  } else {
    state.current.player.isRolling = false;
    if (state.current.spacePressed && state.current.player.attackDelay === 0) {
      state.current.player.attackDelay = 20;
    }
  }

  if (state.current.horizontalDirection || state.current.verticalDirection) {
    state.current.player.isWalking = true;
    if (state.current.horizontalDirection) {
      state.current.player.direction = state.current.horizontalDirection;
    } else if (state.current.verticalDirection) {
      state.current.player.direction = state.current.verticalDirection;
    }
  } else {
    state.current.player.isWalking = false;
  }

  state.current.player.overlaySprite = null;
  if (state.current.player.attackDelay > 0) {
    switch (state.current.player.direction) {
      case "up":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ATTACK_UP
        );
        state.current.player.overlaySprite = getSprite(
          state.current.sprites,
          SpriteID.SWORD_ATTACK_UP
        );
        break;
      case "right":
      case "left":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ATTACK_RIGHT
        );
        state.current.player.overlaySprite = getSprite(
          state.current.sprites,
          SpriteID.SWORD_ATTACK_RIGHT
        );
        break;
      case "down":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ATTACK_DOWN
        );
        state.current.player.overlaySprite = getSprite(
          state.current.sprites,
          SpriteID.SWORD_ATTACK_DOWN
        );
        break;
    }
  } else if (state.current.player.isRolling) {
    switch (state.current.player.direction) {
      case "up":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ROLL_UP
        );
        break;
      case "right":
      case "left":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ROLL_RIGHT
        );
        break;
      case "down":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_ROLL_DOWN
        );
        break;
    }
  } else if (state.current.player.isWalking) {
    switch (state.current.player.direction) {
      case "up":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_WALK_UP
        );
        break;
      case "right":
      case "left":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_WALK_RIGHT
        );
        break;
      case "down":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_WALK_DOWN
        );
        break;
    }
  } else {
    switch (state.current.player.direction) {
      case "up":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_IDLE_UP
        );
        break;
      case "right":
      case "left":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_IDLE_RIGHT
        );
        break;
      case "down":
        state.current.player.sprite = getSprite(
          state.current.sprites,
          SpriteID.PLAYER_IDLE_DOWN
        );
        break;
    }
  }

  if (state.current.player.isWalking || state.current.player.isRolling) {
    const speed = state.current.player.isRolling
      ? PLAYER_ROLLING_SPEED
      : PLAYER_WALKING_SPEED;
    const positionDelta =
      speed * state.current.scale * state.current.deltaFrame;
    switch (state.current.horizontalDirection) {
      case "left":
        state.current.player.x += positionDelta;
        break;
      case "right":
        state.current.player.x -= positionDelta;
        break;
    }
    switch (state.current.verticalDirection) {
      case "up":
        state.current.player.y += positionDelta;
        break;
      case "down":
        state.current.player.y -= positionDelta;
        break;
    }
  }

  state.current.player.frame = calculateFrame(
    state.current.player.sprite,
    state.current.player.frame,
    state.current.deltaFrame
  );

  state.current.player.attackDelay = Math.max(
    0,
    state.current.player.attackDelay - state.current.deltaFrame
  );

  const offsetX = state.current.player.x;
  const offsetY = state.current.player.y;
  const { x: centerX, y: centerY } = screenCenter(state.current);

  const playerX = centerX - offsetX;
  const playerY = centerY - offsetY;

  const hitboxWidth = state.current.player.sprite.width * state.current.scale;
  const hitboxHeight = state.current.player.sprite.height * state.current.scale;

  state.current.player.hitbox.x = playerX - hitboxWidth / 2;
  state.current.player.hitbox.y = playerY - hitboxHeight / 2;
  state.current.player.hitbox.width = hitboxWidth;
  state.current.player.hitbox.height = hitboxHeight;

  if (state.current.player.attackDelay > 0) {
    // Create sword hitbox in the direction the player is facing
    if (state.current.player.swordHitbox === null) {
      switch (state.current.player.direction) {
        case "up":
          state.current.player.swordHitbox = createHitbox(
            playerX - hitboxWidth / 2,
            playerY - hitboxHeight / 2,
            hitboxWidth,
            hitboxHeight / 2
          );
          break;
        case "down":
          state.current.player.swordHitbox = createHitbox(
            playerX - hitboxWidth / 2,
            playerY,
            hitboxWidth,
            hitboxHeight / 2
          );
          break;
        case "left":
          state.current.player.swordHitbox = createHitbox(
            playerX - hitboxWidth / 2,
            playerY - hitboxHeight / 2,
            hitboxWidth / 2,
            hitboxHeight
          );
          break;
        case "right":
          state.current.player.swordHitbox = createHitbox(
            playerX,
            playerY - hitboxHeight / 2,
            hitboxWidth / 2,
            hitboxHeight
          );
          break;
      }
    }
  } else {
    state.current.player.swordHitbox = null;
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  // Draw character
  const scale = state.scale;
  const centerX = Math.floor(state.width / 2);
  const centerY = Math.floor(state.height / 2);

  // Save the current context state
  ctx.save();

  let x = Math.floor(centerX - (state.player.sprite.width * scale) / 2);
  let y = Math.floor(centerY - (state.player.sprite.height * scale) / 2);

  drawSprite(
    ctx,
    state.player.sprite,
    x,
    y,
    Math.floor(state.player.frame),
    scale,
    state.player.direction === "left"
  );
  if (state.player.overlaySprite) {
    drawSprite(
      ctx,
      state.player.overlaySprite,
      x,
      y,
      Math.floor(state.player.frame),
      scale,
      state.player.direction === "left"
    );
  }

  if (state.debug) {
    const offsetX = state.player.x;
    const offsetY = state.player.y;

    ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
    ctx.fillRect(
      state.player.hitbox.x + offsetX,
      state.player.hitbox.y + offsetY,
      state.player.hitbox.width,
      state.player.hitbox.height
    );
    if (state.player.swordHitbox) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
      ctx.fillRect(
        state.player.swordHitbox.x + offsetX,
        state.player.swordHitbox.y + offsetY,
        state.player.swordHitbox.width,
        state.player.swordHitbox.height
      );
    }
  }
  ctx.restore();
}

export function getInitialPlayer(sprite: Sprite, scale: number): Player {
  const { x, y } = screenPosition(90, 90, scale);
  return {
    x: -x,
    y: -y,
    hitbox: createHitbox(0, 0, 0, 0),
    swordHitbox: null,
    image: getPlayerImage(),
    frame: 0,
    direction: "down",
    isWalking: false,
    isRolling: false,
    attackDelay: 0,
    sprite,
    overlaySprite: null,
  };
}

function getPlayerImage(): HTMLImageElement {
  const image = new Image();
  image.src = "/images/player/Player.png";
  return image;
}
