import type { Player } from "@/lib/sweet/player";
import { STRAWBERRY_SPRITE } from "@/lib/sweet/constants";
import { overlaps } from "@/lib/sweet/util";
export type Point = {
  x: number;
  y: number;
};

export function updatePoints(points: Point[], player: Player): number {
  let score = 0;
  for (const point of points) {
    if (overlaps(player, point.x, point.y)) {
      points.splice(points.indexOf(point), 1);
      score += 10;
    }
  }

  return score;
}

export function drawPoint(
  point: Point,
  floatOffset: number,
  ctx: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
) {
  if (debug) {
    drawPointDebug(point, ctx, scale);
  } else {
    ctx.save();

    const sizeModifier = 0.5;
    const dx = point.x - (STRAWBERRY_SPRITE.width * sizeModifier) / 2;
    const dy =
      point.y - 1 + floatOffset - (STRAWBERRY_SPRITE.height * sizeModifier) / 2;

    ctx.drawImage(
      STRAWBERRY_SPRITE.image,
      STRAWBERRY_SPRITE.x,
      STRAWBERRY_SPRITE.y,
      STRAWBERRY_SPRITE.width,
      STRAWBERRY_SPRITE.height,
      Math.floor(dx * scale),
      Math.floor(dy * scale),
      Math.floor(STRAWBERRY_SPRITE.width * scale * sizeModifier),
      Math.floor(STRAWBERRY_SPRITE.height * scale * sizeModifier)
    );

    ctx.restore();
  }
}

function drawPointDebug(
  point: Point,
  ctx: CanvasRenderingContext2D,
  scale: number
) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    Math.floor(point.x * scale),
    Math.floor(point.y * scale),
    Math.floor(2 * scale),
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "red";
  ctx.fill();

  ctx.restore();
}
