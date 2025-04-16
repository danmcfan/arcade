import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet, Sprite } from "@/lib/engine/sprite";
import type { Grid } from "@/lib/engine/grid";
import type { Input } from "@/lib/engine/input";
import type { Hitbox } from "@/lib/engine/hitbox";
import { hasControl } from "@/lib/engine/input";
import { createSpriteSheet, getSprite } from "@/lib/engine/sprite";
import { _drawLayers } from "@/lib/engine/grid";

const HITBOX_X_OFFSET = -8;
const HITBOX_Y_OFFSET = -2;
const HITBOX_WIDTH_OFFSET = -16;
const HITBOX_HEIGHT_OFFSET = -8;

type Direction = "up" | "right" | "down" | "left";

export type Player = {
  x: number;
  y: number;
  sprite: Sprite;
  timeDelta: number;
  frame: number;
  direction: Direction;
  hitbox: Hitbox;
};

export type Corner = {
  x: number;
  y: number;
  directions: Direction[];
};

export type Bee = {
  x: number;
  y: number;
  sprite: Sprite;
  timeDelta: number;
  frame: number;
};

export type Consumable = {
  x: number;
  y: number;
};

export type SweetState = {
  scaleModifier: number;
  gridWidth: number;
  gridHeight: number;
  gridCellSize: number;
  spriteSheets: Record<string, SpriteSheet>;
  layers: Record<number, Grid>;
  player: Player;
  corners: Corner[];
  bees: Bee[];
  berries: Consumable[];
  berrySprite: Sprite;
  powerUps: Consumable[];
  powerUpSprite: Sprite;
  timeDeltaFloat: number;
  floating: boolean;
  floatOffset: number;
};

export function createSweetState(): SweetState {
  const playerSpriteSheet = createSpriteSheet("images/Player.png", 32, 32);
  const beeSpriteSheet = createSpriteSheet("images/Bee.png", 16, 16);
  const foodSpriteSheet = createSpriteSheet("images/Food.png", 16, 16);

  return {
    scaleModifier: 0.5,
    gridWidth: 18,
    gridHeight: 21,
    gridCellSize: 16,
    spriteSheets: {
      grassTiles: createSpriteSheet("images/GrassTiles.png", 16, 16),
      grassMiddle: createSpriteSheet("images/GrassMiddle.png", 16, 16),
      pathMiddle: createSpriteSheet("images/PathMiddle.png", 16, 16),
      player: playerSpriteSheet,
      bee: beeSpriteSheet,
      food: foodSpriteSheet,
    },
    layers: {
      0: {
        cells: [
          41, 42, 42, 42, 42, 42, 42, 42, 43, 41, 42, 42, 42, 42, 42, 42, 42,
          43, 49, 65, 58, 66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58,
          66, 51, 49, 51, 81, 49, 51, 81, 81, 49, 51, 49, 51, 81, 81, 49, 51,
          81, 49, 51, 49, 73, 42, 74, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74,
          73, 42, 74, 51, 49, 65, 58, 66, 65, 66, 65, 58, 58, 58, 58, 66, 65,
          66, 65, 58, 66, 51, 49, 73, 42, 74, 51, 49, 73, 42, 43, 41, 42, 74,
          51, 49, 73, 42, 74, 51, 57, 58, 58, 66, 51, 57, 58, 66, 51, 49, 65,
          58, 59, 49, 65, 58, 58, 59, 81, 81, 81, 49, 51, 41, 42, 74, 73, 74,
          73, 42, 43, 49, 51, 81, 81, 81, 81, 81, 81, 49, 51, 49, 82, 82, 82,
          82, 82, 82, 51, 49, 51, 81, 81, 81, 41, 42, 42, 74, 73, 74, 82, 82,
          82, 82, 82, 82, 73, 74, 73, 42, 42, 43, 57, 58, 58, 66, 65, 66, 82,
          82, 82, 82, 82, 82, 65, 66, 65, 58, 58, 59, 81, 81, 81, 49, 51, 49,
          82, 82, 82, 82, 82, 82, 51, 49, 51, 81, 81, 81, 81, 81, 81, 49, 51,
          49, 65, 58, 58, 58, 58, 66, 51, 49, 51, 81, 81, 81, 41, 42, 42, 74,
          73, 74, 73, 42, 43, 41, 42, 74, 73, 74, 73, 42, 42, 43, 49, 65, 58,
          66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58, 66, 51, 49, 73,
          43, 49, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74, 51, 41, 74, 51, 57,
          66, 51, 49, 65, 66, 65, 58, 58, 58, 58, 66, 65, 66, 51, 49, 65, 59,
          41, 74, 73, 74, 51, 49, 73, 42, 43, 41, 42, 74, 51, 49, 73, 74, 73,
          43, 49, 65, 58, 58, 59, 57, 58, 66, 51, 49, 65, 58, 59, 57, 58, 58,
          66, 51, 49, 73, 42, 42, 42, 42, 42, 74, 73, 74, 73, 42, 42, 42, 42,
          42, 74, 51, 57, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58,
          58, 58, 58, 59,
        ],
        spriteSheetMap: {
          0: "grassTiles",
          1: "grassMiddle",
          2: "pathMiddle",
        },
      },
    },
    player: {
      x: 124,
      y: 236,
      sprite: getSprite(playerSpriteSheet, 4, 0),
      timeDelta: 0,
      frame: 0,
      direction: "left",
      hitbox: {
        x: 124 - HITBOX_X_OFFSET,
        y: 236 - HITBOX_Y_OFFSET,
        width: 32 + HITBOX_WIDTH_OFFSET,
        height: 32 + HITBOX_HEIGHT_OFFSET,
      },
    },
    corners: [
      {
        x: 60,
        y: 252,
        directions: ["up", "right", "down"],
      },
    ],
    bees: [
      {
        x: 135,
        y: 150,
        sprite: getSprite(beeSpriteSheet, 0, 0),
        timeDelta: 0,
        frame: 0,
      },
    ],
    berries: [
      {
        x: 14,
        y: 12,
      },
      {
        x: 14 + ((61 - 14) / 3) * 1,
        y: 12,
      },
      {
        x: 14 + ((61 - 14) / 3) * 2,
        y: 12,
      },
      {
        x: 61,
        y: 12,
      },
      {
        x: 61 + ((124 - 61) / 4) * 1,
        y: 12,
      },
      {
        x: 61 + ((124 - 61) / 4) * 2,
        y: 12,
      },
      {
        x: 61 + ((124 - 61) / 4) * 3,
        y: 12,
      },
      {
        x: 124,
        y: 12,
      },
      // column
      {
        x: 14,
        y: 58,
      },
    ],
    berrySprite: getSprite(foodSpriteSheet, 11, 0),
    powerUps: [
      {
        x: 8,
        y: 36,
      },
    ],
    powerUpSprite: getSprite(foodSpriteSheet, 7, 7),
    timeDeltaFloat: 0,
    floating: false,
    floatOffset: 0,
  };
}

export function update(state: RefObject<State | null>) {
  if (!state.current) return;
  const { input, activeGameState } = state.current;
  if (!activeGameState) return;

  if (hasControl(state.current.input, "exit")) {
    state.current.exitingGame = true;
    if (state.current.transitions.length === 0) {
      state.current.transitions.push({
        type: "fadeOut",
        time: 0,
        duration: 500,
      });
      state.current.transitions.push({
        type: "fadeIn",
        time: 0,
        duration: 500,
      });
    }
  }

  updatePlayer(
    input,
    activeGameState.player,
    activeGameState.corners,
    state.current.timeDelta
  );
  for (const bee of activeGameState.bees) {
    updateBee(bee, state.current.timeDelta);
  }
  updateFloat(activeGameState, state.current.timeDelta);

  state.current.activeGameState = activeGameState;

  return;
}

export function draw(state: State) {
  const { ctx, scale, activeGameState } = state;

  if (!activeGameState) return;

  const {
    layers,
    spriteSheets,
    scaleModifier,
    gridWidth,
    gridCellSize,
    player,
    corners,
    bees,
    berries,
    berrySprite,
    powerUps,
    powerUpSprite,
    floatOffset,
  } = activeGameState;

  ctx.save();

  _drawLayers(
    ctx,
    layers,
    spriteSheets,
    scale * scaleModifier,
    gridWidth,
    gridCellSize
  );

  const modifiedScale = scale * scaleModifier;

  drawPlayer(ctx, player, modifiedScale);
  drawCorners(ctx, corners, modifiedScale);
  drawBees(ctx, bees, modifiedScale);
  drawBerries(ctx, berrySprite, berries, floatOffset, modifiedScale);
  drawPowerUps(ctx, powerUpSprite, powerUps, floatOffset, modifiedScale);

  ctx.restore();

  return;
}

function updatePlayer(
  input: Input,
  player: Player,
  corners: Corner[],
  timeDelta: number
) {
  player.timeDelta += timeDelta;
  if (player.timeDelta < 1000 / 120) {
    return;
  }

  switch (player.direction) {
    case "down":
      player.sprite.y = 32 * 3;
      break;
    case "right":
    case "left":
      player.sprite.y = 32 * 4;
      break;
    case "up":
      player.sprite.y = 32 * 5;
      break;
  }
  const elapsedFrames = Math.floor(player.timeDelta / (1000 / 120));

  player.frame += elapsedFrames / 10;
  player.frame %= 6;
  player.sprite.x = Math.floor(player.frame) * player.sprite.width;

  // Calculate movement speed based on timeDelta for smoother movement
  const speed = 0.5 * (timeDelta / (1000 / 120));

  if (["up", "down"].includes(player.direction)) {
    if (hasControl(input, "up")) {
      player.direction = "up";
    }
    if (hasControl(input, "down")) {
      player.direction = "down";
    }
  }

  if (["left", "right"].includes(player.direction)) {
    if (hasControl(input, "left")) {
      player.direction = "left";
    }
    if (hasControl(input, "right")) {
      player.direction = "right";
    }
  }

  // Find the nearest corner within a small radius
  const corner = corners.find((corner) => {
    const dx = corner.x - (player.x + player.sprite.width / 2);
    const dy = corner.y - (player.y + player.sprite.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 8; // Smaller detection radius
  });

  if (corner) {
    let turning = false;
    const inputDirection = getInputDirection(input);

    if (inputDirection && corner.directions.includes(inputDirection)) {
      player.direction = inputDirection;

      // Smoothly align to corner instead of snapping
      const targetX = corner.x - player.sprite.width / 2;
      const targetY = corner.y - player.sprite.height / 2;

      if (Math.abs(player.x - targetX) > 0.1) {
        player.x += (targetX - player.x) * 0.2;
        player.hitbox.x = player.x - HITBOX_X_OFFSET;
        turning = true;
      }
      if (Math.abs(player.y - targetY) > 0.1) {
        player.y += (targetY - player.y) * 0.2;
        player.hitbox.y = player.y - HITBOX_Y_OFFSET;
        turning = true;
      }
    }

    if (turning) {
      player.timeDelta = 0;
      return;
    }
  }

  // Only move if we're not at a corner or if the current direction is allowed
  if (!corner || corner.directions.includes(player.direction)) {
    switch (player.direction) {
      case "up":
        player.y -= speed;
        player.hitbox.y -= speed;
        break;
      case "down":
        player.y += speed;
        player.hitbox.y += speed;
        break;
      case "right":
        player.x += speed;
        player.hitbox.x += speed;
        break;
      case "left":
        player.x -= speed;
        player.hitbox.x -= speed;
        break;
    }
  }

  player.timeDelta = 0;
}

// Helper function to get the current input direction
function getInputDirection(input: Input): Direction | null {
  if (hasControl(input, "up")) return "up";
  if (hasControl(input, "down")) return "down";
  if (hasControl(input, "left")) return "left";
  if (hasControl(input, "right")) return "right";
  return null;
}

function updateBee(bee: Bee, timeDelta: number) {
  bee.timeDelta += timeDelta;
  if (bee.timeDelta < 1000 / 120) {
    return;
  }

  const elapsedFrames = Math.floor(bee.timeDelta / (1000 / 120));

  bee.frame += elapsedFrames / 10;
  bee.frame %= 4;
  bee.sprite.x = Math.floor(bee.frame) * bee.sprite.width;

  bee.timeDelta = 0;
}

function updateFloat(state: SweetState, timeDelta: number) {
  state.timeDeltaFloat += timeDelta;
  if (state.timeDeltaFloat < 1000 / 120) {
    return;
  }

  const elapsedFrames = Math.floor(state.timeDeltaFloat / (1000 / 120));

  if (state.floating) {
    state.floatOffset += elapsedFrames / 40;
  } else {
    state.floatOffset -= elapsedFrames / 40;
  }

  if (state.floatOffset <= 0) {
    state.floatOffset = 0;
    state.floating = true;
  }

  if (state.floatOffset >= 1) {
    state.floatOffset = 1;
    state.floating = false;
  }

  state.timeDeltaFloat = 0;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  scale: number
) {
  ctx.save();

  let dxPlayer = player.x;
  let dxHitbox = player.hitbox.x;
  if (player.direction === "left") {
    ctx.scale(-1, 1);
    dxPlayer = -player.x - player.sprite.width;
    dxHitbox = -player.hitbox.x - player.hitbox.width;
  }

  drawSprite(ctx, player.sprite, dxPlayer, player.y, scale);
  drawHitbox(
    ctx,
    dxHitbox,
    player.hitbox.y,
    player.hitbox.width,
    player.hitbox.height,
    scale
  );
  ctx.restore();
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  corners: Corner[],
  scale: number
) {
  ctx.save();

  for (const corner of corners) {
    ctx.beginPath();
    ctx.arc(
      Math.floor(corner.x * scale),
      Math.floor(corner.y * scale),
      Math.floor(2 * scale),
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const direction of corner.directions) {
      // Draw a small blue line in the given direction
      ctx.beginPath();
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 1;

      // Start from center of circle
      ctx.moveTo(Math.floor(corner.x * scale), Math.floor(corner.y * scale));

      // Calculate end point based on direction
      let endX = corner.x;
      let endY = corner.y;

      if (direction === "up") {
        endY -= 3;
      } else if (direction === "down") {
        endY += 3;
      } else if (direction === "left") {
        endX -= 3;
      } else if (direction === "right") {
        endX += 3;
      }

      ctx.lineTo(Math.floor(endX * scale), Math.floor(endY * scale));
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBees(ctx: CanvasRenderingContext2D, bees: Bee[], scale: number) {
  for (const bee of bees) {
    drawSprite(ctx, bee.sprite, bee.x, bee.y, scale, 1.5);
  }
}

function drawBerries(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  berries: Consumable[],
  floatOffset: number,
  scale: number
) {
  for (const berry of berries) {
    drawSprite(ctx, sprite, berry.x, berry.y + floatOffset, scale, 0.5);
  }
}

function drawPowerUps(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  powerUps: Consumable[],
  floatOffset: number,
  scale: number
) {
  for (const powerUp of powerUps) {
    drawSprite(ctx, sprite, powerUp.x, powerUp.y + floatOffset, scale);
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  scale: number,
  sizeModifier: number = 1
) {
  ctx.save();

  ctx.drawImage(
    sprite.image,
    Math.floor(sprite.x),
    Math.floor(sprite.y),
    Math.floor(sprite.width),
    Math.floor(sprite.height),
    Math.floor(x * scale),
    Math.floor(y * scale),
    Math.floor(sprite.width * scale * sizeModifier),
    Math.floor(sprite.height * scale * sizeModifier)
  );

  ctx.restore();
}

function drawHitbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
) {
  ctx.save();
  ctx.strokeStyle = "red";
  ctx.strokeRect(
    Math.floor(x * scale),
    Math.floor(y * scale),
    Math.floor(width * scale),
    Math.floor(height * scale)
  );
  ctx.restore();
}
