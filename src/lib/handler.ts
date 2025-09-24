import { State } from "@/lib/state";

export function getResizeHandler(state: State) {
  return () => {
    const rect = state.container.getBoundingClientRect();

    const scale = Math.min(
      Math.floor(rect.width / state.levelWidth),
      Math.floor(rect.height / state.levelHeight)
    );

    state.canvas.width = state.levelWidth * scale;
    state.canvas.height = state.levelHeight * scale;

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
