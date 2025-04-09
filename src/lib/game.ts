import type { RefObject } from "react";
import type { Entity } from "@/lib/entity";
import type { Room } from "@/lib/room";
import {
  FRAME_RATE,
  MILLISECONDS_PER_FRAME,
  TILE_SIZE,
  PLAYER_SPEED,
} from "@/lib/utils";
import { createImage, createSprite } from "@/lib/sprite";
import { createEntity, drawEntity } from "@/lib/entity";
import { createRoom, drawBackground, drawForeground } from "@/lib/room";
import { checkCollision, createHitbox } from "@/lib/hitbox";

export type State = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  timeCurrent: number;
  timePrevious: number;
  timeDelta: number;
  timeFrame: number;
  frameCurrent: number;
  framePrevious: number;
  frameDelta: number;
  player: Entity | null;
  room: Room | null;
  keysDown: Set<string>;
  debug: boolean;
};

export function createState(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): State {
  return {
    container,
    canvas,
    ctx,
    timeCurrent: 0,
    timePrevious: 0,
    timeDelta: 0,
    timeFrame: 0,
    frameCurrent: 0,
    framePrevious: 0,
    frameDelta: 0,
    width: 0,
    height: 0,
    scale: 4,
    player: null,
    room: null,
    keysDown: new Set(),
    debug: false,
  };
}

export function initialize(state: RefObject<State | null>) {
  if (!state.current) return;

  const imagePlayer = createImage("/images/Player.png");
  const spritePlayer = createSprite(imagePlayer, 0, 0, 32, 32);

  const tileSizeScaled = TILE_SIZE * state.current.scale;
  state.current.player = createEntity(spritePlayer, {
    x: state.current.width / 2 - (spritePlayer.width / 2) * state.current.scale,
    y:
      state.current.height / 2 -
      (spritePlayer.height / 2) * state.current.scale +
      tileSizeScaled * 1,
  });
  state.current.player.hitbox = createHitbox(
    Math.floor(state.current.player.position.x + 8 * state.current.scale),
    Math.floor(state.current.player.position.y + 4 * state.current.scale),
    Math.floor(16 * state.current.scale),
    Math.floor(20 * state.current.scale)
  );

  state.current.room = createRoom(state.current);
}

export function getAnimationHandler(state: RefObject<State | null>) {
  function animate(timeCurrent: number) {
    if (!state.current) return;

    state.current.timeCurrent = timeCurrent;
    state.current.timeDelta = timeCurrent - state.current.timePrevious;
    state.current.timeFrame += state.current.timeDelta;

    state.current.framePrevious = state.current.frameCurrent;
    state.current.frameDelta = 0;
    if (state.current.timeFrame > MILLISECONDS_PER_FRAME) {
      state.current.frameCurrent += Math.floor(
        state.current.timeFrame / MILLISECONDS_PER_FRAME
      );
      state.current.frameDelta =
        state.current.frameCurrent - state.current.framePrevious;
      state.current.timeFrame = 0;
    }

    update(state);
    draw(state.current);

    state.current.timePrevious = timeCurrent;

    requestAnimationFrame(animate);
  }
  return animate;
}

export function getKeyDownHandler(state: RefObject<State | null>) {
  function handleKeyDown(event: KeyboardEvent) {
    if (!state.current) return;
    state.current.keysDown.add(event.code);
  }
  return handleKeyDown;
}

export function getKeyUpHandler(state: RefObject<State | null>) {
  function handleKeyUp(event: KeyboardEvent) {
    if (!state.current) return;
    state.current.keysDown.delete(event.code);
  }
  return handleKeyUp;
}

function update(state: RefObject<State | null>) {
  if (!state.current) return;

  const { player } = state.current;
  if (!player) return;

  player.isWalking = false;

  const { keysDown } = state.current;
  if (keysDown.has("KeyW") || keysDown.has("ArrowUp")) {
    move(state, { x: 0, y: -PLAYER_SPEED });
    player.direction = "up";
    player.isWalking = true;
  }
  if (keysDown.has("KeyS") || keysDown.has("ArrowDown")) {
    move(state, { x: 0, y: PLAYER_SPEED });
    player.direction = "down";
    player.isWalking = true;
  }
  if (keysDown.has("KeyA") || keysDown.has("ArrowLeft")) {
    move(state, { x: -PLAYER_SPEED, y: 0 });
    player.direction = "left";
    player.isWalking = true;
  }
  if (keysDown.has("KeyD") || keysDown.has("ArrowRight")) {
    move(state, { x: PLAYER_SPEED, y: 0 });
    player.direction = "right";
    player.isWalking = true;
  }

  updateSprite(state);
}

function draw(state: State) {
  const { ctx, width, height } = state;

  ctx.save();

  ctx.clearRect(0, 0, width, height);

  drawBackground(state);

  if (state.player) {
    drawEntity(state, state.player);
  }

  drawForeground(state);

  ctx.restore();
}

function move(
  state: RefObject<State | null>,
  direction: { x: number; y: number }
) {
  if (!state.current) return;

  const { player } = state.current;

  if (!player) return;

  let newX = player.position.x + direction.x * state.current.scale;
  let newY = player.position.y + direction.y * state.current.scale;

  if (!player.hitbox) return;
  let hitbox = { ...player.hitbox };

  if (newX < 0) {
    newX = 0;
  } else if (newX > state.current.width - hitbox.width) {
    newX = state.current.width - hitbox.width;
  }

  if (newY < 0) {
    newY = 0;
  } else if (newY > state.current.height - hitbox.height) {
    newY = state.current.height - hitbox.height;
  }

  hitbox.x = Math.floor(newX + 8 * state.current.scale);
  hitbox.y = Math.floor(newY + 4 * state.current.scale);

  const room = state.current.room;
  if (!room) return;

  const wallFaces = room.wallFaces;
  for (const wallFace of wallFaces) {
    if (wallFace.hitbox) {
      if (checkCollision(hitbox, wallFace.hitbox)) {
        return;
      }
    }
  }
  const wallBorders = room.wallBorders;
  for (const wallBorder of wallBorders) {
    if (wallBorder.hitbox) {
      if (checkCollision(hitbox, wallBorder.hitbox)) {
        return;
      }
    }
  }

  const machines = room.machines;
  for (const machine of machines) {
    if (machine.hitbox) {
      if (checkCollision(hitbox, machine.hitbox)) {
        return;
      }
    }
  }

  player.position.x = newX;
  player.position.y = newY;
  player.hitbox = hitbox;
}

function updateSprite(state: RefObject<State | null>) {
  if (!state.current) return;

  const { player } = state.current;
  if (!player) return;

  const { direction, isWalking } = player;

  let rowIndex = 0;
  if (isWalking) {
    switch (direction) {
      case "down":
        rowIndex = 3;
        break;
      case "left":
      case "right":
        rowIndex = 4;
        break;
      case "up":
        rowIndex = 5;
        break;
    }
  } else {
    switch (direction) {
      case "down":
        rowIndex = 0;
        break;
      case "left":
      case "right":
        rowIndex = 1;
        break;
      case "up":
        rowIndex = 2;
        break;
    }
  }

  player.frame += state.current.frameDelta / (FRAME_RATE / (2 * 6));
  player.frame %= 6;

  player.sprite = createSprite(
    createImage("/images/Player.png"),
    Math.floor(player.frame) * 32,
    rowIndex * 32,
    32,
    32
  );

  if (!state.current.room) return;
  const { machines } = state.current.room;
  for (const machine of machines) {
    machine.frame += state.current.frameDelta / (FRAME_RATE / (2 * 6));
    machine.frame %= 6;

    machine.sprite = createSprite(
      createImage("/images/Arcade_Machine.png"),
      Math.floor(machine.frame) * 16,
      0,
      16,
      32
    );
  }
}
