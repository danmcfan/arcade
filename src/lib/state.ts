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
  scale: number;
  initialScale: number;
  gameWidth: number;
  gameHeight: number;
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
};

export function createState() {
  const container = document.getElementById("app") as HTMLDivElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const pixelRatio = globalThis.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  const width = rect.width;
  const height = rect.height;

  ctx.imageSmoothingEnabled = false;
  ctx.scale(pixelRatio, pixelRatio);

  const state: State = {
    container,
    canvas,
    ctx,
    pixelRatio,
    width,
    height,
    scale: 0,
    initialScale: 1,
    gameWidth: 160,
    gameHeight: 160,
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
  };

  return state;
}
