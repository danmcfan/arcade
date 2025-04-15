import type { RefObject } from "react";
import type { Grid } from "@/lib/engine/grid";
import type { SpriteSheet } from "@/lib/engine/sprite";
import type { Sound } from "@/lib/engine/sound";
import type { Player } from "@/lib/engine/player";
import type { Machine } from "@/lib/engine/machine";
import type { Hitbox } from "@/lib/engine/hitbox";
import type { Input } from "@/lib/engine/input";
import type { SweetState } from "@/lib/sweet";
import { createInput, addKey, deleteKey } from "@/lib/engine/input";

const LOG_DEBUG_RATE = 1000;

export type Transition = {
  type: "fadeIn" | "fadeOut";
  time: number;
  duration: number;
};

export type State = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  offsetRatioX: number;
  offsetRatioY: number;
  gridCellSize: number;
  gridWidth: number;
  gridHeight: number;
  input: Input;
  layers: Record<number, Grid>;
  collisions: number[];
  collisionHitboxes: Hitbox[];
  spriteSheets: Record<string, SpriteSheet>;
  sounds: Record<string, Sound>;
  activeGameState: SweetState | null;
  activeGame: string | null;
  enteringGame: boolean;
  exitingGame: boolean;
  transitions: Transition[];
  opacity: number;
  player: Player | null;
  machines: Machine[];
  timeIndex: number;
  timeCurrent: number;
  timePrevious: number;
  timeDelta: number;
  updateHandler: ((state: RefObject<State | null>) => void) | null;
  drawHandler: ((state: State) => void) | null;
  debug: boolean;
};

export function createState(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  scale: number,
  gridCellSize: number,
  debug: boolean
): State {
  return {
    container,
    canvas,
    ctx,
    width: 0,
    height: 0,
    scale,
    offsetRatioX: 0,
    offsetRatioY: 0,
    gridCellSize,
    gridWidth,
    gridHeight,
    input: createInput(),
    layers: {},
    collisions: [],
    collisionHitboxes: [],
    spriteSheets: {},
    sounds: {},
    activeGameState: null,
    activeGame: null,
    enteringGame: false,
    exitingGame: false,
    transitions: [
      {
        type: "fadeIn",
        time: 0,
        duration: 500,
      },
    ],
    opacity: 1,
    player: null,
    machines: [],
    timeIndex: 0,
    timeCurrent: 0,
    timePrevious: 0,
    timeDelta: 0,
    updateHandler: null,
    drawHandler: null,
    debug,
  };
}

export function getAnimationHandler(state: RefObject<State | null>) {
  function animate(timeCurrent: number) {
    if (!state.current) return;

    if (state.current.debug) {
      if (state.current.timeIndex % LOG_DEBUG_RATE === 0) {
        console.debug({
          time: timeCurrent,
          timeIndex: state.current.timeIndex,
          timeCurrent: state.current.timeCurrent,
          timePrevious: state.current.timePrevious,
          timeDelta: state.current.timeDelta,
        });
        console.debug({ transitions: state.current.transitions });
      }
    }

    state.current.timePrevious = state.current.timeCurrent;
    state.current.timeCurrent = timeCurrent;
    state.current.timeDelta =
      state.current.timeCurrent - state.current.timePrevious;
    state.current.timeIndex += 1;

    if (!state.current.updateHandler) return;
    state.current.updateHandler(state);

    if (!state.current.drawHandler) return;
    state.current.drawHandler(state.current);

    requestAnimationFrame(animate);
  }
  return animate;
}

export function getKeyDownHandler(state: RefObject<State | null>) {
  function handleKeyDown(event: KeyboardEvent) {
    if (!state.current) return;
    state.current.input = addKey(state.current.input, event.code);
  }
  return handleKeyDown;
}

export function getKeyUpHandler(state: RefObject<State | null>) {
  function handleKeyUp(event: KeyboardEvent) {
    if (!state.current) return;
    state.current.input = deleteKey(state.current.input, event.code);
  }
  return handleKeyUp;
}
