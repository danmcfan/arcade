import type { RefObject } from "react";
import type { Background } from "@/lib/tile";
import type { Player } from "@/lib/player";
import type { Demon } from "@/lib/demon";
import type { Sprite } from "@/lib/sprite";
import type { Chicken } from "@/lib/chicken";
import type { Skeleton } from "@/lib/skeleton";
import { getInitialBackground, drawBackground } from "@/lib/tile";
import { getInitialPlayer, drawPlayer, updatePlayer } from "@/lib/player";
import { SpriteID, getSprites, getSprite, drawSprite } from "@/lib/sprite";
import { drawGrid } from "@/lib/debug";
import {
  // getInitialChickens,
  updateChickens,
  drawChickens,
} from "@/lib/chicken";
import { FRAMES_PER_SECOND, MILLISECONDS_PER_FRAME } from "@/lib/util";
import {
  getInitialSkeletons,
  updateSkeletons,
  drawSkeletons,
} from "@/lib/skeleton";
import { overlap, createHitbox } from "@/lib/hitbox";
import { getInitialDemons, updateDemons, drawDemons } from "@/lib/demon";
export type HorizontalDirection = "left" | "right";
export type VerticalDirection = "up" | "down";

export type Cursor = {
  x: number;
  y: number;
};

export type GameState = {
  width: number;
  height: number;
  scale: number;
  currentTime: number;
  lastTime: number;
  deltaTime: number;
  frameTime: number;
  currentFrame: number;
  lastFrame: number;
  deltaFrame: number;
  cursor: Cursor | null;
  horizontalDirection: HorizontalDirection | null;
  verticalDirection: VerticalDirection | null;
  horizontalDirectionsPressed: Set<HorizontalDirection>;
  verticalDirectionsPressed: Set<VerticalDirection>;
  spacePressed: boolean;
  shiftPressed: boolean;
  player: Player;
  chickens: Chicken[];
  skeletons: Skeleton[];
  demons: Demon[];
  background: Background;
  sprites: Map<SpriteID, Sprite>;
  debug: boolean;
};

export function initializeGame(state: RefObject<GameState>) {
  state.current.player = getInitialPlayer(
    getSprite(state.current.sprites, SpriteID.PLAYER_IDLE_DOWN),
    state.current.scale
  );

  // state.current.chickens = getInitialChickens(
  //   getSprite(state.current.sprites, SpriteID.CHICKEN_WALK),
  //   state.current.scale
  // );

  state.current.skeletons = getInitialSkeletons(
    getSprite(state.current.sprites, SpriteID.SKELETON_IDLE_DOWN),
    state.current.scale
  );

  state.current.demons = getInitialDemons(
    getSprite(state.current.sprites, SpriteID.DEMON_IDLE_DOWN),
    state.current.scale
  );

  state.current.background = getInitialBackground();
}

export function getKeyDownHandler(state: RefObject<GameState>) {
  return (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === " ") {
      state.current.spacePressed = true;
    }

    if (e.key.toLowerCase() === "shift") {
      state.current.shiftPressed = true;
    }

    switch (e.key.toLowerCase()) {
      case "w":
      case "ArrowUp":
        state.current.verticalDirection = "up";
        state.current.verticalDirectionsPressed.add("up");
        break;
      case "s":
      case "ArrowDown":
        state.current.verticalDirection = "down";
        state.current.verticalDirectionsPressed.add("down");
        break;
      case "a":
      case "ArrowLeft":
        state.current.horizontalDirection = "left";
        state.current.horizontalDirectionsPressed.add("left");
        break;
      case "d":
      case "ArrowRight":
        state.current.horizontalDirection = "right";
        state.current.horizontalDirectionsPressed.add("right");
        break;
    }
  };
}

export function getKeyUpHandler(state: RefObject<GameState>) {
  return (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === " ") {
      state.current.spacePressed = false;
    }

    if (e.key.toLowerCase() === "shift") {
      state.current.shiftPressed = false;
    }

    switch (e.key.toLowerCase()) {
      case "w":
      case "ArrowUp":
        state.current.verticalDirectionsPressed.delete("up");
        break;
      case "s":
      case "ArrowDown":
        state.current.verticalDirectionsPressed.delete("down");
        break;
      case "a":
      case "ArrowLeft":
        state.current.horizontalDirectionsPressed.delete("left");
        break;
      case "d":
      case "ArrowRight":
        state.current.horizontalDirectionsPressed.delete("right");
        break;
    }
  };
}

export function getMouseMoveHandler(state: RefObject<GameState>) {
  return (e: MouseEvent) => {
    state.current.cursor = {
      x: e.clientX,
      y: e.clientY,
    };
  };
}

export function getAnimationHandler(
  ctx: CanvasRenderingContext2D,
  state: RefObject<GameState>
) {
  function animate(currentTime: number) {
    updateFrame(currentTime, state);

    updateState(state);
    drawState(ctx, state.current);

    requestAnimationFrame(animate);
  }
  return animate;
}

function updateFrame(currentTime: number, state: RefObject<GameState>) {
  state.current.currentTime = currentTime;

  state.current.deltaTime = state.current.currentTime - state.current.lastTime;
  state.current.lastTime = state.current.currentTime;

  state.current.frameTime += state.current.deltaTime;

  const deltaFrame = Math.floor(
    state.current.frameTime / MILLISECONDS_PER_FRAME
  );
  state.current.lastFrame = state.current.currentFrame;
  state.current.deltaFrame = deltaFrame;

  if (deltaFrame > 0) {
    state.current.currentFrame += deltaFrame;
    state.current.frameTime = 0;
  }
}

function updateState(state: RefObject<GameState>) {
  if (state.current.horizontalDirectionsPressed.size === 0) {
    state.current.horizontalDirection = null;
  } else {
    state.current.horizontalDirection = Array.from(
      state.current.horizontalDirectionsPressed
    )[state.current.horizontalDirectionsPressed.size - 1];
  }

  if (state.current.verticalDirectionsPressed.size === 0) {
    state.current.verticalDirection = null;
  } else {
    state.current.verticalDirection = Array.from(
      state.current.verticalDirectionsPressed
    )[state.current.verticalDirectionsPressed.size - 1];
  }

  updateSkeletons(state);
  updateDemons(state);
  updateChickens(state);
  updatePlayer(state);
  handleSwordCollision(state);
}

function drawState(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, state.width, state.height);

  drawBackground(ctx, state);
  if (state.debug) {
    drawGrid(ctx, state);
  }
  drawSkeletons(ctx, state);
  drawDemons(ctx, state);
  drawChickens(ctx, state);
  drawPlayer(ctx, state);
  drawCursor(ctx, state);
}

export function getInitialState(debug: boolean = false): GameState {
  const sprites = getSprites();

  return {
    width: 0,
    height: 0,
    scale: 0,
    currentTime: 0,
    lastTime: 0,
    deltaTime: 0,
    frameTime: 0,
    currentFrame: 0,
    lastFrame: 0,
    deltaFrame: 0,
    cursor: null,
    horizontalDirection: null,
    verticalDirection: null,
    horizontalDirectionsPressed: new Set(),
    verticalDirectionsPressed: new Set(),
    spacePressed: false,
    shiftPressed: false,
    player: {
      x: 0,
      y: 0,
      hitbox: createHitbox(0, 0, 0, 0),
      swordHitbox: null,
      image: new Image(),
      frame: 0,
      direction: "down",
      isWalking: false,
      isRolling: false,
      attackDelay: 0,
      sprite: getSprite(sprites, SpriteID.PLAYER_IDLE_DOWN),
      overlaySprite: null,
    },
    chickens: [],
    skeletons: [],
    demons: [],
    background: {
      grid: [],
    },
    sprites,
    debug,
  };
}

function drawCursor(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.cursor) {
    const cursor = getSprite(state.sprites, SpriteID.CURSOR);
    drawSprite(
      ctx,
      cursor,
      state.cursor.x - cursor.width / 2,
      state.cursor.y - cursor.height / 2,
      0,
      state.scale / 2
    );
  }
}

function handleSwordCollision(state: RefObject<GameState>) {
  if (state.current.player.swordHitbox) {
    for (const skeleton of state.current.skeletons) {
      if (skeleton.isDead) {
        continue;
      }
      if (overlap(state.current.player.swordHitbox, skeleton.hitbox)) {
        if (
          skeleton.hitbox.collisionIds.has(state.current.player.swordHitbox.id)
        ) {
          continue;
        }
        skeleton.hitbox.collisionIds.add(state.current.player.swordHitbox.id);
        skeleton.hitPoints -= 1;
        skeleton.frame = 0;
        if (skeleton.hitPoints <= 0) {
          skeleton.deadDelay = FRAMES_PER_SECOND;
          skeleton.isDead = true;
        } else {
          skeleton.damageDelay = FRAMES_PER_SECOND;
        }
      }
    }
  }
}
