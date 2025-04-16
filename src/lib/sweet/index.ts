import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet, Sprite } from "@/lib/engine/sprite";
import type { Grid } from "@/lib/engine/grid";
import type { Corner } from "@/lib/sweet/corner";
import type { Player } from "@/lib/sweet/player";
import { PLAYER, CORNERS } from "@/lib/sweet/constants";
import { hasControl } from "@/lib/engine/input";
import { createSpriteSheet, getSprite } from "@/lib/engine/sprite";
import { _drawLayers } from "@/lib/engine/grid";
import { drawCorner } from "@/lib/sweet/corner";
import { updatePlayer, drawPlayer } from "@/lib/sweet/player";

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
    player: PLAYER,
    corners: CORNERS,
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
  const { timeDelta, input, activeGameState } = state.current;
  if (!activeGameState) return;

  const { player, corners } = activeGameState;

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

  updatePlayer(player, timeDelta, input, corners);
  for (const bee of activeGameState.bees) {
    updateBee(bee, state.current.timeDelta);
  }
  updateFloat(activeGameState, state.current.timeDelta);

  state.current.activeGameState = activeGameState;

  return;
}

export function draw(state: State) {
  const { ctx, scale, activeGameState, debug } = state;

  if (!activeGameState) return;

  const {
    layers,
    spriteSheets,
    scaleModifier,
    gridWidth,
    gridCellSize,
    player,
    corners,
    // bees,
    // berries,
    // berrySprite,
    // powerUps,
    // powerUpSprite,
    // floatOffset,
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

  drawPlayer(player, ctx, modifiedScale, debug);

  if (debug) {
    for (const corner of corners) {
      drawCorner(corner, ctx, modifiedScale);
    }
  }

  // drawBees(ctx, bees, modifiedScale);
  // drawBerries(ctx, berrySprite, berries, floatOffset, modifiedScale);
  // drawPowerUps(ctx, powerUpSprite, powerUps, floatOffset, modifiedScale);

  ctx.restore();

  return;
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

// function drawPlayer(
//   ctx: CanvasRenderingContext2D,
//   player: Player,
//   scale: number
// ) {
//   ctx.save();

//   let dxPlayer = player.x;
//   let dxHitbox = player.hitbox.x;
//   if (player.direction === "left") {
//     ctx.scale(-1, 1);
//     dxPlayer = -player.x - player.sprite.width;
//     dxHitbox = -player.hitbox.x - player.hitbox.width;
//   }

//   drawSprite(ctx, player.sprite, dxPlayer, player.y, scale);
//   drawHitbox(
//     ctx,
//     dxHitbox,
//     player.hitbox.y,
//     player.hitbox.width,
//     player.hitbox.height,
//     scale
//   );
//   ctx.restore();
// }

// function drawBees(ctx: CanvasRenderingContext2D, bees: Bee[], scale: number) {
//   for (const bee of bees) {
//     drawSprite(ctx, bee.sprite, bee.x, bee.y, scale, 1.5);
//   }
// }

// function drawBerries(
//   ctx: CanvasRenderingContext2D,
//   sprite: Sprite,
//   berries: Consumable[],
//   floatOffset: number,
//   scale: number
// ) {
//   for (const berry of berries) {
//     drawSprite(ctx, sprite, berry.x, berry.y + floatOffset, scale, 0.5);
//   }
// }

// function drawPowerUps(
//   ctx: CanvasRenderingContext2D,
//   sprite: Sprite,
//   powerUps: Consumable[],
//   floatOffset: number,
//   scale: number
// ) {
//   for (const powerUp of powerUps) {
//     drawSprite(ctx, sprite, powerUp.x, powerUp.y + floatOffset, scale);
//   }
// }

// function drawSprite(
//   ctx: CanvasRenderingContext2D,
//   sprite: Sprite,
//   x: number,
//   y: number,
//   scale: number,
//   sizeModifier: number = 1
// ) {
//   ctx.save();

//   ctx.drawImage(
//     sprite.image,
//     Math.floor(sprite.x),
//     Math.floor(sprite.y),
//     Math.floor(sprite.width),
//     Math.floor(sprite.height),
//     Math.floor(x * scale),
//     Math.floor(y * scale),
//     Math.floor(sprite.width * scale * sizeModifier),
//     Math.floor(sprite.height * scale * sizeModifier)
//   );

//   ctx.restore();
// }

// function drawHitbox(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   scale: number
// ) {
//   ctx.save();
//   ctx.strokeStyle = "red";
//   ctx.strokeRect(
//     Math.floor(x * scale),
//     Math.floor(y * scale),
//     Math.floor(width * scale),
//     Math.floor(height * scale)
//   );
//   ctx.restore();
// }
