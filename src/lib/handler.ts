import { GameID } from "./types";
import { State } from "./state";
import { areSpritesLoaded } from "./sprite";
import { arcadeLoop } from "./arcade/loop";
import { sweetLoop } from "./sweet/loop";

export function getResizeHandler(state: State) {
  return () => {
    state.pixelRatio = globalThis.devicePixelRatio || 1;
    const rect = state.container.getBoundingClientRect();
    state.canvas.width = rect.width * state.pixelRatio;
    state.canvas.height = rect.height * state.pixelRatio;
    state.width = rect.width;
    state.height = rect.height;

    state.ctx.imageSmoothingEnabled = false;
    state.ctx.scale(state.pixelRatio, state.pixelRatio);

    setScaleModifier(state);
  };
}

function setScaleModifier(state: State) {
  if (state.width <= 800 || state.height <= 800) {
    state.scaleModifier = 1;
  } else if (state.width < 1200 || state.height < 1200) {
    state.scaleModifier = 2;
  } else if (state.width < 1600 || state.height < 1600) {
    state.scaleModifier = 3;
  } else {
    state.scaleModifier = 4;
  }
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
