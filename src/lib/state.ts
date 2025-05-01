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
  background: {
    cells: number[];
    collisions: number[];
    spriteIDs: SpriteID[];
    width: number;
    height: number;
  };
  player: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    direction: Direction;
    running: boolean;
    frame: number;
  };
  machines: {
    gameID: GameID;
    x: number;
    y: number;
    spriteID: SpriteID;
    active: boolean;
    frame: number;
  }[];
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
    background: {
      cells: [
        25, 26, 26, 26, 26, 26, 26, 26, 26, 27, 39, 67, 68, 68, 68, 68, 68, 68,
        69, 41, 39, 81, 82, 82, 82, 82, 82, 82, 83, 41, 39, 95, 96, 96, 96, 96,
        96, 96, 97, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 39, 3, 3, 3, 3, 3, 3, 3,
        3, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 39, 3, 3, 3, 3, 3, 3, 3, 3, 41,
        39, 3, 3, 3, 3, 3, 3, 3, 3, 41, 53, 54, 54, 54, 54, 54, 54, 54, 54, 55,
      ],
      collisions: [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1,
      ],
      spriteIDs: [SpriteID.WOOD_FLOOR_TILES, SpriteID.INTERIOR_WALLS],
      width: 10,
      height: 10,
    },
    player: {
      x: 80,
      y: 112,
      dx: 0,
      dy: 0,
      direction: Direction.DOWN,
      running: false,
      frame: 0,
    },
    machines: [
      {
        gameID: GameID.SWEET_SAM,
        x: 72,
        y: 48,
        spriteID: SpriteID.GREEN_MACHINE,
        active: false,
        frame: 0,
      },
    ],
    activeGame: null,
    activeGameState: null,
    keys: new Set(),
    mouseDown: null,
  };

  state.scaleBase = 2;
  state.gameWidth = state.background.width * 16;
  state.gameHeight = state.background.height * 16;

  return state;
}
