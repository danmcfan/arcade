import { State } from "./state";
import { areSpritesLoaded, getSprite, SpriteID } from "./sprite";
import { Direction } from "./types";

const LEVEL_WIDTH = 304;
const LEVEL_HEIGHT = 368;
const PLAYER_SPEED = 1.0;

export function getResizeHandler(state: State) {
  return () => {
    state.pixelRatio = globalThis.devicePixelRatio || 1;
    const rect = state.container.getBoundingClientRect();

    const scale = Math.min(
      Math.floor(rect.width / LEVEL_WIDTH),
      Math.floor(rect.height / LEVEL_HEIGHT)
    );

    state.canvas.width = LEVEL_WIDTH * scale;
    state.canvas.height = LEVEL_HEIGHT * scale;

    state.width = state.canvas.width;
    state.height = state.canvas.height;
    state.scaleBase = scale;

    state.ctx.imageSmoothingEnabled = false;
  };
}

export function getKeyDownHandler(state: State) {
  return (event: KeyboardEvent) => {
    state.keys.add(event.code);
  };
}

export function getKeyUpHandler(state: State) {
  return (event: KeyboardEvent) => {
    state.keys.delete(event.code);
  };
}

export function getPointerDownHandler(state: State) {
  return (event: PointerEvent) => {
    const scale = state.scaleBase * state.scaleModifier;
    const translateX = Math.floor((state.width / scale - state.gameWidth) / 2);
    const translateY = Math.floor(
      (state.height / scale - state.gameHeight - state.controlsHeight) / 2
    );

    const screenX = event.clientX;
    const screenY = event.clientY;

    const gameX = screenX / scale - translateX;
    const gameY = screenY / scale - translateY;

    state.mouseDown = { x: gameX, y: gameY };
  };
}

export function getPointerUpHandler(state: State) {
  return () => {
    state.mouseDown = null;
    state.keys.clear();
  };
}

export function getAnimationHandler(state: State) {
  function animate(timestamp: number) {
    let lag = 0;

    if (!areSpritesLoaded(state.sprites)) {
      return;
    }

    let deltaTime = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;

    if (deltaTime > 15) {
      deltaTime = 15;
    }
    lag += deltaTime;

    if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
      state.player.direction = Direction.RIGHT;
    } else if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
      state.player.direction = Direction.LEFT;
    }

    while (lag >= 15) {
      state.player.frame += 0.1;
      state.player.frame %= 4;

      if (state.player.direction === Direction.RIGHT) {
        state.player.x += PLAYER_SPEED;
      } else if (state.player.direction === Direction.LEFT) {
        state.player.x -= PLAYER_SPEED;
      }
      state.player.x = Math.max(56, Math.min(215, state.player.x));
      lag -= 15;
    }

    state.ctx.save();
    state.ctx.scale(state.scaleBase, state.scaleBase);

    state.ctx.clearRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    const spriteLevel = getSprite(state.sprites, SpriteID.HIVE);
    if (!spriteLevel) {
      return;
    }

    state.ctx.drawImage(
      spriteLevel.image,
      0,
      0,
      spriteLevel.width,
      spriteLevel.height,
      0,
      0,
      LEVEL_WIDTH,
      LEVEL_HEIGHT
    );

    const spriteBear = getSprite(state.sprites, SpriteID.BEAR);
    if (!spriteBear) {
      return;
    }

    let spriteRow = 0;
    if (state.player.direction === Direction.RIGHT) {
      spriteRow = 0;
    } else if (state.player.direction === Direction.LEFT) {
      spriteRow = 1;
    }

    state.ctx.drawImage(
      spriteBear.image,
      spriteBear.width * Math.floor(state.player.frame),
      spriteBear.height * spriteRow,
      spriteBear.width,
      spriteBear.height,
      Math.floor(state.player.x),
      Math.floor(state.player.y),
      spriteBear.width,
      spriteBear.height
    );

    state.ctx.restore();
  }

  function animationLoop(timestamp: number) {
    animate(timestamp);
    requestAnimationFrame(animationLoop);
  }

  return animationLoop;
}
