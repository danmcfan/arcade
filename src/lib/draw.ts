import { State } from "./state";

export function clearScreen(state: State) {
  state.ctx.clearRect(0, 0, state.width, state.height);
}

export function scaleScreen(state: State) {
  state.ctx.setTransform(1, 0, 0, 1, 0, 0);
  state.ctx.scale(
    state.scaleBase * state.scaleModifier,
    state.scaleBase * state.scaleModifier
  );
}

export function centerScreen(state: State) {
  const scale = state.scaleBase * state.scaleModifier;
  const translateX = Math.floor((state.width / scale - state.gameWidth) / 2);
  const translateY = Math.floor(
    (state.height / scale - state.gameHeight - state.controlsHeight) / 2
  );
  state.ctx.translate(translateX, translateY);
}
