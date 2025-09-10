import { State } from "@/lib/state";

const LEVEL_WIDTH = 304;
const LEVEL_HEIGHT = 368;

export function getResizeHandler(state: State) {
  return () => {
    const rect = state.container.getBoundingClientRect();

    const scale = Math.min(
      Math.floor(rect.width / LEVEL_WIDTH),
      Math.floor(rect.height / LEVEL_HEIGHT)
    );

    state.canvas.width = LEVEL_WIDTH * scale;
    state.canvas.height = LEVEL_HEIGHT * scale;

    state.width = state.canvas.width;
    state.height = state.canvas.height;
    state.scale = scale;

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
