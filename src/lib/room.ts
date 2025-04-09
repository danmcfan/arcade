import type { State } from "@/lib/game";
import type { Entity } from "@/lib/entity";
import type { Hitbox } from "@/lib/hitbox";
import { TILE_SIZE } from "@/lib/utils";
import { createEntity, drawEntity } from "@/lib/entity";
import { createImage, createSprite } from "@/lib/sprite";
import { createHitbox } from "@/lib/hitbox";

const FLOOR_WIDTH = 8;
const FLOOR_HEIGHT = 6;

type Machine = {
  name: string;
  entity: Entity;
  interactionHitbox: Hitbox | null;
};

export type Room = {
  floors: Entity[];
  wallFaces: Entity[];
  wallBorders: Entity[];
  machines: Machine[];
};

export function createRoom(state: State): Room {
  const { scale, width, height } = state;
  const tileSizeScaled = TILE_SIZE * scale;

  const floors = [];
  const wallFaces = [];
  const wallBorders = [];
  const machines = [];

  const imageFloor = createImage("/images/Wood_Floor_Tiles.png");
  const imageWalls = createImage("/images/Interior_Walls.png");
  const imageMachines = createImage("/images/Arcade_Machine.png");

  const spriteFloor = createSprite(imageFloor, 0, 0, 16, 16);
  const spriteWalls = {
    border: {
      corner: {
        topLeft: createSprite(imageWalls, 0, 0, 16, 16),
        topRight: createSprite(imageWalls, 32, 0, 16, 16),
        bottomLeft: createSprite(imageWalls, 0, 32, 16, 16),
        bottomRight: createSprite(imageWalls, 32, 32, 16, 16),
      },
      middle: {
        top: createSprite(imageWalls, 16, 0, 16, 16),
        bottom: createSprite(imageWalls, 16, 32, 16, 16),
        left: createSprite(imageWalls, 0, 16, 16, 16),
        right: createSprite(imageWalls, 32, 16, 16, 16),
        center: null,
      },
    },
    face: {
      corner: {
        topLeft: createSprite(imageWalls, 0, 48, 16, 16),
        topRight: createSprite(imageWalls, 32, 48, 16, 16),
        bottomLeft: createSprite(imageWalls, 0, 80, 16, 16),
        bottomRight: createSprite(imageWalls, 32, 80, 16, 16),
      },
      middle: {
        top: createSprite(imageWalls, 16, 48, 16, 16),
        bottom: createSprite(imageWalls, 16, 80, 16, 16),
        left: createSprite(imageWalls, 0, 64, 16, 16),
        right: createSprite(imageWalls, 32, 64, 16, 16),
        center: createSprite(imageWalls, 16, 64, 16, 16),
      },
    },
  };

  for (let x = 0; x < FLOOR_WIDTH; x++) {
    for (let y = 0; y < FLOOR_HEIGHT; y++) {
      floors.push(
        createEntity(spriteFloor, {
          x:
            x * tileSizeScaled +
            (width / 2 - (tileSizeScaled * FLOOR_WIDTH) / 2),
          y:
            y * tileSizeScaled +
            (height / 2 - (tileSizeScaled * (FLOOR_HEIGHT - 2)) / 2),
        })
      );
    }
  }

  const wallFaceGrid = [
    [
      spriteWalls.face.corner.topLeft,
      ...Array(FLOOR_WIDTH - 2).fill(spriteWalls.face.middle.top),
      spriteWalls.face.corner.topRight,
    ],
    [
      spriteWalls.face.corner.bottomLeft,
      ...Array(FLOOR_WIDTH - 2).fill(spriteWalls.face.middle.bottom),
      spriteWalls.face.corner.bottomRight,
    ],
  ];
  for (let x = 0; x < FLOOR_WIDTH; x++) {
    for (let y = 0; y < 2; y++) {
      const sprite = wallFaceGrid[y][x];
      if (sprite) {
        const entity = createEntity(sprite, {
          x:
            x * tileSizeScaled +
            (width / 2 - (tileSizeScaled * FLOOR_WIDTH) / 2),
          y: y * tileSizeScaled + height / 2 - tileSizeScaled * 4,
        });
        if (
          sprite !== spriteWalls.face.corner.bottomLeft &&
          sprite !== spriteWalls.face.middle.bottom &&
          sprite !== spriteWalls.face.corner.bottomRight
        ) {
          entity.hitbox = createHitbox(
            Math.floor(entity.position.x),
            Math.floor(entity.position.y),
            Math.floor(sprite.width * scale),
            Math.floor(sprite.height * scale)
          );
        }
        wallFaces.push(entity);
      }
    }
  }

  const wallBorderGrid = [
    [
      spriteWalls.border.corner.topLeft,
      ...Array(FLOOR_WIDTH).fill(spriteWalls.border.middle.top),
      spriteWalls.border.corner.topRight,
    ],
    ...Array(FLOOR_HEIGHT + 2).fill([
      spriteWalls.border.middle.left,
      ...Array(FLOOR_WIDTH).fill(spriteWalls.border.middle.center),
      spriteWalls.border.middle.right,
    ]),
    [
      spriteWalls.border.corner.bottomLeft,
      ...Array(FLOOR_WIDTH).fill(spriteWalls.border.middle.bottom),
      spriteWalls.border.corner.bottomRight,
    ],
  ];
  for (let x = 0; x < wallBorderGrid[0].length; x++) {
    for (let y = 0; y < wallBorderGrid.length; y++) {
      const sprite = wallBorderGrid[y][x];
      if (sprite) {
        const entity = createEntity(sprite, {
          x:
            x * tileSizeScaled +
            (width / 2 - (tileSizeScaled * (FLOOR_WIDTH + 2)) / 2),
          y: y * tileSizeScaled + height / 2 - tileSizeScaled * 5,
        });
        entity.hitbox = createHitbox(
          Math.floor(entity.position.x),
          Math.floor(entity.position.y),
          Math.floor(sprite.width * scale),
          Math.floor(sprite.height * scale)
        );
        wallBorders.push(entity);
      }
    }
  }

  const spriteMachine = createSprite(imageMachines, 0, 0, 16, 32);
  const entityMachine = createEntity(spriteMachine, {
    x: tileSizeScaled + (width / 2 - (tileSizeScaled * 3) / 2),
    y: tileSizeScaled + (height / 2 - (tileSizeScaled * 9) / 2),
  });
  entityMachine.hitbox = createHitbox(
    Math.floor(entityMachine.position.x),
    Math.floor(entityMachine.position.y),
    Math.floor(spriteMachine.width * scale),
    Math.floor((spriteMachine.height / 2) * scale)
  );
  machines.push({
    name: "Sweet Sam",
    entity: entityMachine,
    interactionHitbox: createHitbox(
      Math.floor(entityMachine.position.x),
      Math.floor(entityMachine.position.y + (spriteMachine.height / 2) * scale),
      Math.floor(spriteMachine.width * scale),
      Math.floor((spriteMachine.height / 2) * scale)
    ),
  });

  return { floors, wallFaces, wallBorders, machines };
}

export function drawBackground(state: State) {
  const { room } = state;
  if (!room) return;

  const { floors, wallFaces, machines } = room;
  for (const floor of floors) {
    drawEntity(state, floor);
  }
  for (const wallFace of wallFaces) {
    drawEntity(state, wallFace);
  }
  for (const machine of machines) {
    drawEntity(state, machine.entity);
  }
}

export function drawForeground(state: State) {
  const { room } = state;
  if (!room) return;

  const { wallBorders } = room;
  for (const wallBorder of wallBorders) {
    drawEntity(state, wallBorder);
  }
}
