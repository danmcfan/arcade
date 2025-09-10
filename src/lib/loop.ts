import { Direction } from "@/lib/direction";
import { SpriteSheetID, areSpritesLoaded, getSpriteSheet } from "@/lib/sprite";
import { State } from "@/lib/state";

const MS_PER_FRAME = 1000 / 60;

const LEVEL_WIDTH = 304;
const LEVEL_HEIGHT = 368;

const DEBUG = false;

export function getGameLoop(state: State) {
  function animate(current: number) {
    if (!areSpritesLoaded(state.spriteSheets)) {
      return;
    }

    let elapsed = current - state.previous;
    state.previous = current;

    elapsed = Math.min(elapsed, MS_PER_FRAME * 10);
    state.lag += elapsed;

    // process input
    if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) {
      state.player.direction = Direction.RIGHT;
    } else if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) {
      state.player.direction = Direction.LEFT;
    }

    // update
    while (state.lag >= MS_PER_FRAME) {
      for (const entity of [
        state.player,
        ...state.bees,
        ...state.points,
        ...state.powers,
      ]) {
        entity.frame += entity.frameIncrement;
        entity.frame %= entity.frameCount;

        if (entity.direction === Direction.RIGHT) {
          entity.x += entity.velocity;
        } else if (entity.direction === Direction.LEFT) {
          entity.x -= entity.velocity;
        }
        entity.x = Math.max(72, Math.min(231, entity.x));
      }

      state.lag -= MS_PER_FRAME;
    }

    // render
    state.ctx.save();
    state.ctx.scale(state.scale, state.scale);

    state.ctx.clearRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    const spriteLevel = getSpriteSheet(state.spriteSheets, SpriteSheetID.HIVE);
    if (!spriteLevel) {
      return;
    }

    state.ctx.drawImage(
      spriteLevel.image,
      0,
      0,
      spriteLevel.width,
      spriteLevel.height,
      0,
      0,
      LEVEL_WIDTH,
      LEVEL_HEIGHT
    );

    for (const entity of [
      state.player,
      ...state.bees,
      ...state.points,
      ...state.powers,
      ...state.corners,
    ]) {
      let spriteSheet = null;
      if (entity.spriteSheetID) {
        spriteSheet = getSpriteSheet(state.spriteSheets, entity.spriteSheetID);
      }

      if (spriteSheet) {
        let spriteRow = 0;
        if (entity.direction === Direction.RIGHT) {
          spriteRow = 0;
        } else if (entity.direction === Direction.LEFT) {
          spriteRow = 1;
        }

        state.ctx.drawImage(
          spriteSheet.image,
          spriteSheet.width * Math.floor(entity.frame),
          spriteSheet.height * (spriteRow + entity.frameRowOffset),
          spriteSheet.width,
          spriteSheet.height,
          Math.floor(entity.x - entity.offsetX),
          Math.floor(entity.y - entity.offsetY),
          spriteSheet.width,
          spriteSheet.height
        );
      }

      if (DEBUG) {
        state.ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        state.ctx.strokeStyle = "rgba(255, 0, 0, 0.75)";
        state.ctx.lineWidth = 1;
        state.ctx.beginPath();
        state.ctx.arc(
          Math.floor(entity.x),
          Math.floor(entity.y),
          entity.radius,
          0,
          Math.PI * 2
        );
        state.ctx.fill();
        state.ctx.stroke();
      }
    }

    state.ctx.restore();
  }

  function gameLoop(timestamp: number) {
    animate(timestamp);
    requestAnimationFrame(gameLoop);
  }

  return gameLoop;
}
