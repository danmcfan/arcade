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

  window.addEventListener("resize", resizeHandler);
  window.addEventListener("keydown", keyDownHandler);
  window.addEventListener("keyup", keyUpHandler);
  resizeHandler();

  const animationHandler = getAnimationHandler(state);
  requestAnimationFrame(animationHandler);

  return () => {
    window.removeEventListener("resize", resizeHandler);
  };
}

main();
