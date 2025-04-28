import "./style.css";
import {
  getResizeHandler,
  getKeyDownHandler,
  getKeyUpHandler,
  getAnimationHandler,
} from "./lib/handler";
import { createState } from "./lib/state";
import { initSprites } from "./lib/sprite";

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

  const animationHandler = getAnimationHandler(state);
  requestAnimationFrame(animationHandler);

  return () => {
    globalThis.removeEventListener("resize", resizeHandler);
  };
}

main();
