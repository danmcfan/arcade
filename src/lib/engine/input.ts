export type Input = {
  keys: Set<string>;
  controls: Set<string>;
};

export function createInput(): Input {
  return {
    keys: new Set(),
    controls: new Set(),
  };
}

export function addKey(input: Input, key: string): Input {
  input.keys.add(key);
  setControls(input);
  return input;
}

export function deleteKey(input: Input, key: string): Input {
  input.keys.delete(key);
  setControls(input);
  return input;
}

export function hasControl(input: Input, control: string): boolean {
  return input.controls.has(control);
}

function setControls(input: Input) {
  setControl(input, ["KeyW", "ArrowUp"], "up");
  setControl(input, ["KeyS", "ArrowDown"], "down");
  setControl(input, ["KeyA", "ArrowLeft"], "left");
  setControl(input, ["KeyD", "ArrowRight"], "right");
  setControl(input, ["Space", "Enter", "KeyE"], "interact");
  setControl(input, ["Escape"], "exit");
}

function setControl(input: Input, keys: string[], control: string) {
  let controlActive = false;
  for (const key of keys) {
    if (input.keys.has(key)) {
      controlActive = true;
      break;
    }
  }
  if (controlActive) {
    input.controls.add(control);
  } else {
    input.controls.delete(control);
  }
}
