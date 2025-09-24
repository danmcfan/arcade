import { State } from "@/lib/state";
import { getSpriteSheet, SpriteSheetID } from "@/lib/sprite";
import { GameType } from "@/lib/game";
import { Direction } from "@/lib/direction";
import { DEBUG } from "@/lib/constant";

export function render(state: State) {
  state.ctx.save();
  state.ctx.scale(state.scale, state.scale);

  state.ctx.clearRect(0, 0, state.levelWidth, state.levelHeight);

  const spriteLevel = getSpriteSheet(
    state.spriteSheets,
    state.levelSpriteSheetID
  );
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
    state.levelWidth,
    state.levelHeight
  );

  switch (state.activeGame) {
    case GameType.SWEET_SAM:
      renderSweetSam(state);
      break;
    default:
      renderArcade(state);
      break;
  }

  state.ctx.restore();
}

function renderArcade(state: State) {
  if (state.title) {
    const spriteTitle = getSpriteSheet(
      state.spriteSheets,
      SpriteSheetID.SWEET_SAM_TITLE
    );
    if (!spriteTitle) {
      return;
    }

    state.ctx.drawImage(
      spriteTitle.image,
      0,
      0,
      spriteTitle.width,
      spriteTitle.height,
      0,
      0,
      state.levelWidth,
      state.levelHeight
    );
  }

  const entity = state.gamer;

  let spriteSheet = null;
  if (entity.spriteSheetID) {
    spriteSheet = getSpriteSheet(state.spriteSheets, entity.spriteSheetID);
  }

  if (spriteSheet) {
    let spriteRow = 0;
    if (entity.direction) {
      spriteRow = entity.frameDirection.get(entity.direction) || 0;
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
    state.ctx.fillStyle = "red";
    state.ctx.strokeStyle = "red";
    state.ctx.lineWidth = 0.5;
    state.ctx.beginPath();
    state.ctx.arc(
      Math.floor(entity.x),
      Math.floor(entity.y),
      entity.radius || 1.0,
      0,
      Math.PI * 2
    );
    state.ctx.fill();
    state.ctx.stroke();
  }
}

function renderSweetSam(state: State) {
  for (const entity of [
    state.bear,
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
      if (entity.direction) {
        spriteRow = entity.frameDirection.get(entity.direction) || 0;
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

      for (const direction of entity.directions) {
        state.ctx.beginPath();
        state.ctx.moveTo(entity.x, entity.y);

        if (direction === Direction.UP) {
          state.ctx.lineTo(entity.x, entity.y - 4);
        } else if (direction === Direction.DOWN) {
          state.ctx.lineTo(entity.x, entity.y + 4);
        } else if (direction === Direction.LEFT) {
          state.ctx.lineTo(entity.x - 4, entity.y);
        } else if (direction === Direction.RIGHT) {
          state.ctx.lineTo(entity.x + 4, entity.y);
        }

        state.ctx.fill();
        state.ctx.stroke();
      }
    }
  }
}
