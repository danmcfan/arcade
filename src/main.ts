import "./style.css";
import {
  getResizeHandler,
  getKeyDownHandler,
  getKeyUpHandler,
  getPointerDownHandler,
  getPointerUpHandler,
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
  const pointerDownHandler = getPointerDownHandler(state);
  const pointerUpHandler = getPointerUpHandler(state);

  globalThis.addEventListener("resize", resizeHandler);
  globalThis.addEventListener("keydown", keyDownHandler);
  globalThis.addEventListener("keyup", keyUpHandler);
  globalThis.addEventListener("pointerdown", pointerDownHandler);
  globalThis.addEventListener("pointerup", pointerUpHandler);

  resizeHandler();

  try {
    const animationHandler = getAnimationHandler(state);
    requestAnimationFrame(animationHandler);
  } catch (error) {
    console.error(error);
    const errorHandler = getErrorHandler(state, error as Error);
    requestAnimationFrame(errorHandler);
  }
}

main();
