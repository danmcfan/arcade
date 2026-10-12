// Port of internal/input (§3.1).

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type Axis = "VERTICAL" | "HORIZONTAL";

/**
 * One tick of input. Everything is **held** state except `shiftP`, which is
 * "Shift held and P just pressed this tick". Scenes that need other edges
 * (wave's Space) derive them from the previous tick's `Input`.
 */
export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  escape: boolean;
  shiftP: boolean;
}

export const NO_INPUT: Readonly<Input> = Object.freeze({
  up: false,
  down: false,
  left: false,
  right: false,
  space: false,
  escape: false,
  shiftP: false,
});

export function moving(i: Input): boolean {
  return i.up || i.down || i.left || i.right;
}

/** Priority Up, Down, Left, Right, as Go's `Input.Direction()`; "" when idle. */
export function direction(i: Input): Direction | "" {
  if (i.up) return "UP";
  if (i.down) return "DOWN";
  if (i.left) return "LEFT";
  if (i.right) return "RIGHT";
  return "";
}

/** Throws on an invalid direction, like the Go panic. */
export function opposite(d: Direction): Direction {
  switch (d) {
    case "UP":
      return "DOWN";
    case "DOWN":
      return "UP";
    case "LEFT":
      return "RIGHT";
    case "RIGHT":
      return "LEFT";
  }
  throw new Error(`invalid direction: ${String(d)}`);
}

export function axis(d: Direction): Axis {
  return d === "UP" || d === "DOWN" ? "VERTICAL" : "HORIZONTAL";
}

/**
 * Builds an `Input` from `KeyboardEvent.code` sets (D3): `pressed` is every
 * key held this tick, `justPressed` the keys pressed this tick but not last.
 */
export function readInput(pressed: ReadonlySet<string>, justPressed: ReadonlySet<string>): Input {
  return {
    up: pressed.has("KeyW") || pressed.has("ArrowUp"),
    down: pressed.has("KeyS") || pressed.has("ArrowDown"),
    left: pressed.has("KeyA") || pressed.has("ArrowLeft"),
    right: pressed.has("KeyD") || pressed.has("ArrowRight"),
    space: pressed.has("Space"),
    escape: pressed.has("Escape"),
    shiftP: (pressed.has("ShiftLeft") || pressed.has("ShiftRight")) && justPressed.has("KeyP"),
  };
}
