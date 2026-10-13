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

/** Every `Input` key, in declaration order. */
const INPUT_KEYS: readonly (keyof Input)[] = ["up", "down", "left", "right", "space", "escape", "shiftP"];

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
    default:
      throw new Error(`invalid direction: ${String(d)}`);
  }
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

/** Keys a menu reacts to on the tick they go down. */
export const MENU_KEYS = ["up", "down", "space", "escape"] as const;
export type MenuKey = (typeof MENU_KEYS)[number];
/** Which menu keys went down this tick. */
export type MenuEdges = Record<MenuKey, boolean>;

/**
 * Key presses (edges) for a scene's menus, plus keys hidden until released:
 * when a menu closes, the Space or Esc that closed it must not also act on
 * what comes back (start a cabinet, fire in a minigame).
 */
export class MenuKeys {
  private prev: Input = NO_INPUT;
  private readonly masked = new Set<keyof Input>();

  /** Feed this tick's raw input; call once per tick. */
  read(i: Input): { edges: MenuEdges; anyPressed: boolean } {
    const pressed = (k: keyof Input): boolean => i[k] && !this.prev[k];
    const edges: MenuEdges = {
      up: pressed("up"),
      down: pressed("down"),
      space: pressed("space"),
      escape: pressed("escape"),
    };
    const anyPressed = INPUT_KEYS.some((k) => pressed(k));
    this.prev = i;
    return { edges, anyPressed };
  }

  /** Hide the keys held in `i` (default: the last input read) until each is released. */
  maskHeld(i: Input = this.prev): void {
    this.masked.clear();
    for (const k of INPUT_KEYS) if (i[k]) this.masked.add(k);
  }

  /** `i` with the hidden keys released; a key that is up is no longer hidden. */
  unmasked(i: Input): Input {
    for (const k of this.masked) if (!i[k]) this.masked.delete(k);
    const out = { ...i };
    for (const k of this.masked) out[k] = false;
    return out;
  }
}
