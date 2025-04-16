import type { Player } from "@/lib/sweet/player";
import { FISH_SPRITE } from "@/lib/sweet/constants";
import { overlaps } from "@/lib/sweet/util";
export type Power = {
  x: number;
  y: number;
};

export function updatePowers(powers: Power[], player: Player): number {
  let score = 0;
  for (const power of powers) {
    if (overlaps(player, power.x, power.y)) {
      powers.splice(powers.indexOf(power), 1);
      score += 50;
    }
  }

  return score;
}

export function drawPower(
  power: Power,
  floatOffset: number,
  ctx: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
) {
  if (debug) {
    drawPowerDebug(power, ctx, scale);
  } else {
    ctx.save();

    const sizeModifier = 0.75;
    const dx = power.x - (FISH_SPRITE.width * sizeModifier) / 2;
    const dy =
      power.y - 1 + floatOffset - (FISH_SPRITE.height * sizeModifier) / 2;

    ctx.drawImage(
      FISH_SPRITE.image,
      FISH_SPRITE.x,
      FISH_SPRITE.y,
      FISH_SPRITE.width,
      FISH_SPRITE.height,
      Math.floor(dx * scale),
      Math.floor(dy * scale),
      Math.floor(FISH_SPRITE.width * scale * sizeModifier),
      Math.floor(FISH_SPRITE.height * scale * sizeModifier)
    );

    ctx.restore();
  }
}

export function drawPowerDebug(
  power: Power,
  ctx: CanvasRenderingContext2D,
  scale: number
) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    Math.floor(power.x * scale),
    Math.floor(power.y * scale),
    Math.floor(4 * scale),
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "red";
  ctx.fill();

  ctx.restore();
}
