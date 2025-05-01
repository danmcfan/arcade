import { State } from "../state";

const BUTTONS = [
  {
    code: "ArrowUp",
    x: 68,
    y: 176,
    width: 24,
    height: 24,
  },
  {
    code: "ArrowDown",
    x: 68,
    y: 200,
    width: 24,
    height: 24,
  },
  {
    code: "ArrowLeft",
    x: 32,
    y: 188,
    width: 24,
    height: 24,
  },
  {
    code: "ArrowRight",
    x: 92,
    y: 188,
    width: 24,
    height: 24,
  },
];

export function handleMouse(state: State) {
  if (state.mouseDown) {
    for (const button of BUTTONS) {
      if (
        state.mouseDown.x >= button.x &&
        state.mouseDown.x <= button.x + button.width &&
        state.mouseDown.y >= button.y &&
        state.mouseDown.y <= button.y + button.height
      ) {
        state.keys.add(button.code);
      }
    }
  } else {
    state.keys.clear();
  }
}
