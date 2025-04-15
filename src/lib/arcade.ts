import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet } from "@/lib/engine/sprite";
import type { Sound } from "@/lib/engine/sound";
import { drawLayers } from "@/lib/engine/grid";
import { createPlayer, updatePlayer, drawPlayer } from "@/lib/engine/player";
import { getSprite, createSpriteSheet } from "@/lib/engine/sprite";
import { createSound } from "@/lib/engine/sound";
import { createHitbox } from "@/lib/engine/hitbox";
import {
  createMachine,
  updateMachines,
  drawMachines,
} from "@/lib/engine/machine";
import * as Sweet from "@/lib/sweet";

export function initialize(state: RefObject<State | null>) {
  if (!state.current) return;

  state.current.layers = {
    0: {
      cells: [
        25, 26, 26, 26, 26, 26, 26, 26, 26, 27, 39, 67, 68, 68, 68, 68, 68, 68,
        69, 41, 39, 81, 82, 82, 82, 82, 82, 82, 83, 41, 39, 95, 96, 96, 96, 96,
        96, 96, 97, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 39, 3, 3, 3, 3, 3, 3, 3,
        3, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41,
        39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 53, 54, 54, 54, 54, 54, 54, 54, 54, 55,
      ],
      spriteSheetMap: {
        0: "woodFloorTiles",
        1: "interiorWalls",
      },
    },
  };

  state.current.collisions = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ];

  const { gridWidth, gridCellSize } = state.current;
  for (let i = 0; i < state.current.collisions.length; i++) {
    const collision = state.current.collisions[i];
    if (collision === 1) {
      const x = (i % gridWidth) * gridCellSize;
      const y = Math.floor(i / gridWidth) * gridCellSize;
      const hitbox = createHitbox(x, y, gridCellSize, gridCellSize);
      state.current.collisionHitboxes.push(hitbox);
    }
  }

  state.current.spriteSheets = createSpriteSheets();
  state.current.sounds = createSounds();

  state.current.player = createPlayer(
    5 * gridCellSize - 8,
    7 * gridCellSize - 12,
    getSprite(state.current.spriteSheets.player, 0, 0)
  );

  state.current.machines = [
    createMachine(
      "Sweet Sam",
      3 * gridCellSize,
      3 * gridCellSize,
      getSprite(state.current.spriteSheets.machine, 0, 0),
      createHitbox(
        3 * gridCellSize,
        4 * gridCellSize,
        gridCellSize,
        gridCellSize
      )
    ),
  ];

  state.current.updateHandler = update;
  state.current.drawHandler = draw;
}

function update(state: RefObject<State | null>) {
  if (!state.current) return;

  const { transitions, timeDelta } = state.current;

  if (state.current.enteringGame && transitions.length === 1) {
    state.current.enteringGame = false;
  }

  if (state.current.exitingGame && transitions.length === 1) {
    state.current.activeGame = null;
    state.current.activeGameState = null;
    state.current.exitingGame = false;
  }

  if (transitions.length >= 1) {
    const transition = transitions[0];

    transition.time += timeDelta;
    switch (transition.type) {
      case "fadeIn":
        state.current.opacity = Math.max(
          0,
          1 - transition.time / transition.duration
        );
        break;
      case "fadeOut":
        state.current.opacity = Math.min(
          1,
          transition.time / transition.duration
        );
        break;
    }

    if (transition.time >= transition.duration) {
      state.current.transitions.shift();
    }
    return;
  }

  switch (state.current.activeGame) {
    case "Sweet Sam":
      Sweet.update(state);
      break;
    default:
      updatePlayer(state);
      updateMachines(state);
  }
}

function draw(state: State) {
  const {
    ctx,
    gridWidth,
    gridHeight,
    gridCellSize,
    scale,
    offsetRatioX,
    offsetRatioY,
    activeGameState,
  } = state;

  // Save the current state of the canvas
  ctx.save();

  // Clear the canvas
  ctx.clearRect(0, 0, state.width, state.height);

  ctx.save();

  let activeGame = state.activeGame;
  if (state.enteringGame && state.transitions.length === 2) {
    activeGame = null;
  }

  let widthPixels = 0;
  let heightPixels = 0;
  let translateX = 0;
  let translateY = 0;

  switch (activeGame) {
    case "Sweet Sam":
      if (!activeGameState) return;

      widthPixels =
        activeGameState.gridWidth *
        activeGameState.gridCellSize *
        scale *
        activeGameState.scaleModifier;
      heightPixels =
        activeGameState.gridHeight *
        activeGameState.gridCellSize *
        scale *
        activeGameState.scaleModifier;
      translateX = Math.floor((state.width - widthPixels) * offsetRatioX);
      translateY = Math.floor((state.height - heightPixels) * offsetRatioY);
      ctx.translate(translateX, translateY);
      Sweet.draw(state);
      break;
    default:
      // Translate the canvas to the center of the screen
      widthPixels = gridCellSize * gridWidth * scale;
      heightPixels = gridCellSize * gridHeight * scale;
      translateX = Math.floor((state.width - widthPixels) * offsetRatioX);
      translateY = Math.floor((state.height - heightPixels) * offsetRatioY);
      ctx.translate(translateX, translateY);
      drawLayers(state);
      drawMachines(state);
      drawPlayer(state);
      break;
  }

  ctx.restore();

  ctx.fillStyle = `rgba(0, 0, 0, ${state.opacity})`;
  ctx.fillRect(0, 0, state.width, state.height);

  // Restore the original state of the canvas
  ctx.restore();
}

function createSpriteSheets(): Record<string, SpriteSheet> {
  return {
    player: createSpriteSheet("/images/Player.png", 32, 32),
    woodFloorTiles: createSpriteSheet("/images/Wood_Floor_Tiles.png", 16, 16),
    interiorWalls: createSpriteSheet("/images/Interior_Walls.png", 16, 16),
    machine: createSpriteSheet("/images/ArcadeMachine.png", 16, 32),
  };
}

function createSounds(): Record<string, Sound> {
  return {
    arcade: createSound("/audio/arcade.mp3", 0.2),
    footstep: createSound("/audio/footstep.mp3", 0.4),
  };
}
