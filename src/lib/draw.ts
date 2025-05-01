import { State } from "./state";

export function clear(state: State) {
  state.ctx.clearRect(0, 0, state.width, state.height);
}

export function scale(state: State) {
  state.ctx.scale(
    state.scaleBase * state.scaleModifier,
    state.scaleBase * state.scaleModifier
  );
}

export function center(state: State) {
  const scale = state.scaleBase * state.scaleModifier;
  const translateX = Math.floor((state.width / scale - state.gameWidth) / 2);
  const translateY = Math.floor((state.height / scale - state.gameHeight) / 2);
  state.ctx.translate(translateX, translateY);
}
