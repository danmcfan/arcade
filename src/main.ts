import { CORNERS } from "@/lib/corner";
import { Direction } from "@/lib/direction";
import { newEntity } from "@/lib/entity";
import {
  getResizeHandler,
  getKeyDownHandler,
  getKeyUpHandler,
} from "@/lib/handler";
import { getGameLoop } from "@/lib/loop";
import {
  SpriteSheetID,
  createSpriteSheets,
  SpriteSheetConfig,
} from "@/lib/sprite";
import { createState } from "@/lib/state";

function main() {
  const spriteSheetConfigs: Map<SpriteSheetID, SpriteSheetConfig> = new Map([
    [SpriteSheetID.ARCADE, { width: 160, height: 144 }],
    [SpriteSheetID.BEAR, { width: 16, height: 16 }],
    [SpriteSheetID.BEE, { width: 16, height: 16 }],
    [SpriteSheetID.HIVE, { width: 224, height: 288 }],
    [SpriteSheetID.GAMER, { width: 16, height: 24 }],
    [SpriteSheetID.SWEET_SAM_TITLE, { width: 160, height: 144 }],
  ]);

  const state = createState();
  state.spriteSheets = createSpriteSheets(spriteSheetConfigs);

  state.gamer = newEntity({
    spriteSheetID: SpriteSheetID.GAMER,
    frameIncrement: 0.1,
    frameCount: 4,
    frameDirection: new Map([
      [Direction.UP, 0],
      [Direction.DOWN, 1],
      [Direction.LEFT, 2],
      [Direction.RIGHT, 3],
    ]),
    x: 80,
    y: 92,
    offsetX: 8,
    offsetY: 16,
    direction: Direction.DOWN,
    velocity: 1.0,
  });

  state.bear = newEntity({
    spriteSheetID: SpriteSheetID.BEAR,
    frameIncrement: 0.1,
    frameCount: 4,
    frameDirection: new Map([
      [Direction.DOWN, 0],
      [Direction.UP, 1],
      [Direction.LEFT, 2],
      [Direction.RIGHT, 3],
    ]),
    x: 112,
    y: 212,
    offsetX: 8,
    offsetY: 8,
    direction: Direction.LEFT,
    radius: 4,
    velocity: 1.0,
  });

  state.bees = [
    newEntity({
      spriteSheetID: SpriteSheetID.BEE,
      frameIncrement: 0.1,
      frameCount: 4,
      frameDirection: new Map([
        [Direction.DOWN, 0],
        [Direction.UP, 1],
        [Direction.LEFT, 1],
        [Direction.RIGHT, 0],
      ]),
      x: 8 * 1 + 4,
      y: 8 * 4 + 4,
      offsetX: 8,
      offsetY: 8,
      direction: Direction.RIGHT,
      radius: 4,
      velocity: 0.75,
    }),
    newEntity({
      spriteSheetID: SpriteSheetID.BEE,
      frameIncrement: 0.1,
      frameCount: 4,
      frameDirection: new Map([
        [Direction.DOWN, 0],
        [Direction.UP, 1],
        [Direction.LEFT, 1],
        [Direction.RIGHT, 0],
      ]),
      x: 8 * 26 + 4,
      y: 8 * 4 + 4,
      offsetX: 8,
      offsetY: 8,
      direction: Direction.LEFT,
      radius: 4,
      velocity: 0.75,
    }),
    newEntity({
      spriteSheetID: SpriteSheetID.BEE,
      frameIncrement: 0.1,
      frameCount: 4,
      frameDirection: new Map([
        [Direction.DOWN, 0],
        [Direction.UP, 1],
        [Direction.LEFT, 1],
        [Direction.RIGHT, 0],
      ]),
      x: 8 * 1 + 4,
      y: 8 * 29 + 4,
      offsetX: 8,
      offsetY: 8,
      direction: Direction.RIGHT,
      radius: 4,
      velocity: 0.75,
    }),
    newEntity({
      spriteSheetID: SpriteSheetID.BEE,
      frameIncrement: 0.1,
      frameCount: 4,
      frameDirection: new Map([
        [Direction.DOWN, 0],
        [Direction.UP, 1],
        [Direction.LEFT, 1],
        [Direction.RIGHT, 0],
      ]),
      x: 8 * 26 + 4,
      y: 8 * 29 + 4,
      offsetX: 8,
      offsetY: 8,
      direction: Direction.LEFT,
      radius: 4,
      velocity: 0.75,
    }),
  ];

  state.corners = CORNERS;

  const resizeHandler = getResizeHandler(state);
  const keyDownHandler = getKeyDownHandler(state);
  const keyUpHandler = getKeyUpHandler(state);

  globalThis.addEventListener("resize", resizeHandler);
  globalThis.addEventListener("keydown", keyDownHandler);
  globalThis.addEventListener("keyup", keyUpHandler);

  resizeHandler();

  state.resizeHandler = resizeHandler;

  const gameLoop = getGameLoop(state);
  requestAnimationFrame(gameLoop);
}

main();
