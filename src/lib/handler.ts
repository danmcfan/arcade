import { State, GameID } from "./state";
import { areSpritesLoaded } from "./sprite";
import { arcadeLoop } from "./arcade/loop";
import { sweetLoop } from "./sweet/loop";

export function getResizeHandler(state: State) {
  return () => {
    const pixelRatio = globalThis.devicePixelRatio || 1;
    const rect = state.container.getBoundingClientRect();
    state.canvas.width = rect.width * pixelRatio;
    state.canvas.height = rect.height * pixelRatio;
    state.width = rect.width;
    state.height = rect.height;

    if (state.width < 600 || state.height < 600) {
      state.scale = state.initialScale * 2;
    } else if (state.width < 768 || state.height < 768) {
      state.scale = state.initialScale * 3;
    } else if (state.width < 1024 || state.height < 1024) {
      state.scale = state.initialScale * 4;
    } else {
      state.scale = state.initialScale * 6;
    }

    state.ctx.imageSmoothingEnabled = false;
    state.ctx.scale(pixelRatio, pixelRatio);
    state.ctx.scale(state.scale, state.scale);

    // Center everything on the screen
    const translateX = Math.floor(
      (state.width / state.scale - state.gameWidth) / 2
    );
    const translateY = Math.floor(
      (state.height / state.scale - state.gameHeight) / 2
    );
    state.ctx.translate(translateX, translateY);
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

export function getAnimationHandler(state: State) {
  function animate(timestamp: number) {
    if (!areSpritesLoaded(state.sprites)) {
      return;
    }

    let deltaTime = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;

    if (deltaTime > 15) {
      deltaTime = 15;
    }

    switch (state.activeGame) {
      case GameID.SWEET_SAM:
        sweetLoop(state, deltaTime);
        return;
      default:
        arcadeLoop(state, deltaTime);
        return;
    }
  }

  function animationLoop(timestamp: number) {
    animate(timestamp);
    requestAnimationFrame(animationLoop);
  }

  return animationLoop;
}
