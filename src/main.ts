import { defaultCorners } from "@/lib/corner";
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
    [SpriteSheetID.BEAR, { width: 32, height: 32 }],
    [SpriteSheetID.BEE, { width: 16, height: 16 }],
    [SpriteSheetID.HIVE, { width: 304, height: 368 }],
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
    x: 152,
    y: 264,
    offsetX: 16,
    offsetY: 28,
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
      x: 16 * 17 + 8,
      y: 16 * 2 + 8,
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
      x: 16 * 1 + 8,
      y: 16 * 2 + 8,
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
      x: 16 * 1 + 8,
      y: 16 * 20 + 8,
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
      x: 16 * 17 + 8,
      y: 16 * 20 + 8,
      offsetX: 8,
      offsetY: 8,
      direction: Direction.RIGHT,
      radius: 4,
      velocity: 0.75,
    }),
  ];

  state.corners = defaultCorners();

  const resizeHandler = getResizeHandler(state);
  const keyDownHandler = getKeyDownHandler(state);
  const keyUpHandler = getKeyUpHandler(state);

  globalThis.addEventListener("resize", resizeHandler);
  globalThis.addEventListener("keydown", keyDownHandler);
  globalThis.addEventListener("keyup", keyUpHandler);

  resizeHandler();

  const gameLoop = getGameLoop(state);
  requestAnimationFrame(gameLoop);
}

main();
