import "./style.css";
import {
  getResizeHandler,
  getKeyDownHandler,
  getKeyUpHandler,
  getAnimationHandler,
} from "./lib/handler";
import { createState } from "./lib/state";
import { initSprites } from "./lib/sprite";
import { getErrorHandler } from "./lib/error";

function main() {
  const state = createState();
  initSprites(state.sprites);

  const resizeHandler = getResizeHandler(state);
  const keyDownHandler = getKeyDownHandler(state);
  const keyUpHandler = getKeyUpHandler(state);

  globalThis.addEventListener("resize", resizeHandler);
  globalThis.addEventListener("keydown", keyDownHandler);
  globalThis.addEventListener("keyup", keyUpHandler);
  resizeHandler();

  try {
    const animationHandler = getAnimationHandler(state);
    requestAnimationFrame(animationHandler);
  } catch (error) {
    state.gameWidth = 0;
    state.gameHeight = 0;
    resizeHandler();

    console.error(error);
    const errorHandler = getErrorHandler(state, error as Error);
    requestAnimationFrame(errorHandler);
  }
}

main();
