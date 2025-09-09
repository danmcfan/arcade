import type { Sprite } from "./sprite";
import { SpriteID } from "./sprite";
import { SweetState } from "./sweet/state";
import { Direction, GameID } from "./types";

export type State = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pixelRatio: number;
  width: number;
  height: number;
  scaleBase: number;
  scaleModifier: number;
  gameWidth: number;
  gameHeight: number;
  controlsHeight: number;
  lastTimestamp: number;
  sprites: Map<SpriteID, Sprite>;
  player: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    direction: Direction;
    running: boolean;
    frame: number;
  };
  activeGame: GameID | null;
  activeGameState: SweetState | null;
  keys: Set<string>;
  mouseDown: {
    x: number;
    y: number;
  } | null;
};

export function createState() {
  const container = document.getElementById("app") as HTMLDivElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const state: State = {
    container,
    canvas,
    ctx,
    pixelRatio: 0,
    width: 0,
    height: 0,
    scaleBase: 1,
    scaleModifier: 0,
    gameWidth: 0,
    gameHeight: 0,
    controlsHeight: 0,
    lastTimestamp: 0,
    sprites: new Map(),
    player: {
      x: 136,
      y: 240,
      dx: 0,
      dy: 0,
      direction: Direction.RIGHT,
      running: false,
      frame: 0,
    },
    activeGame: null,
    activeGameState: null,
    keys: new Set(),
    mouseDown: null,
  };

  return state;
}
