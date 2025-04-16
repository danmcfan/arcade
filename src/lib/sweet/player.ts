import type { Direction } from "@/lib/sweet/direction";
import type { Sprite } from "@/lib/engine/sprite";
import type { Corner } from "@/lib/sweet/corner";
import type { Input } from "@/lib/engine/input";
import { PLAYER_SPRITE_SHEET } from "@/lib/sweet/constants";
import { hasControl } from "@/lib/engine/input";
import { getSprite } from "@/lib/engine/sprite";

export type Player = {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  sprite: Sprite;
  frame: number;
};

export function updatePlayer(
  player: Player,
  timeDelta: number,
  input: Input,
  corners: Corner[]
) {
  const timeFactor = timeDelta / (1000 / 120);
  const speed = 0.5 * timeFactor;

  player.frame += timeFactor / 10;
  player.frame %= 6;

  let row = 0;
  switch (player.direction) {
    case "up":
      row = 5;
      break;
    case "right":
    case "left":
      row = 4;
      break;
    case "down":
      row = 3;
      break;
  }

  player.sprite = getSprite(PLAYER_SPRITE_SHEET, row, Math.floor(player.frame));

  const verticalDirections = ["up", "down"];
  if (verticalDirections.includes(player.direction)) {
    for (const direction of verticalDirections) {
      if (hasControl(input, direction)) {
        player.direction = direction as Direction;
      }
    }
  }

  const horizontalDirections = ["left", "right"];
  if (horizontalDirections.includes(player.direction)) {
    for (const direction of horizontalDirections) {
      if (hasControl(input, direction)) {
        player.direction = direction as Direction;
      }
    }
  }

  switch (player.direction) {
    case "up":
      player.y -= speed;
      break;
    case "down":
      player.y += speed;
      break;
    case "right":
      player.x += speed;
      break;
    case "left":
      player.x -= speed;
      break;
  }

  if (player.x < 8) {
    player.x = 280;
  }

  if (player.x > 280) {
    player.x = 8;
  }

  const corner = getNearestCorner(player, corners);
  if (corner) {
    for (const direction of corner.directions) {
      if (hasControl(input, direction)) {
        if (player.direction == direction) {
          return;
        }

        if (direction == "left" || direction == "right") {
          player.y = corner.y;
        }

        if (direction == "up" || direction == "down") {
          player.x = corner.x;
        }

        player.direction = direction as Direction;
      }
    }

    if (corner.directions.includes(player.direction)) {
      return;
    }

    if (player.direction == "left" && player.x < corner.x) {
      player.x = corner.x;
    }

    if (player.direction == "right" && player.x > corner.x) {
      player.x = corner.x;
    }

    if (player.direction == "up" && player.y < corner.y) {
      player.y = corner.y;
    }

    if (player.direction == "down" && player.y > corner.y) {
      player.y = corner.y;
    }
  }
}

export function drawPlayer(
  player: Player,
  ctx: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
) {
  if (debug) {
    drawPlayerDebug(player, ctx, scale);
  }

  ctx.save();

  let dx = player.x - 16;
  let dy = player.y - 20;

  if (player.direction == "left") {
    dx = -player.x - 16;
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    player.sprite.image,
    player.sprite.x,
    player.sprite.y,
    player.sprite.width,
    player.sprite.height,
    Math.floor(dx * scale),
    Math.floor(dy * scale),
    Math.floor(player.sprite.width * scale),
    Math.floor(player.sprite.height * scale)
  );

  ctx.restore();
}

function drawPlayerDebug(
  player: Player,
  ctx: CanvasRenderingContext2D,
  scale: number
) {
  ctx.beginPath();
  ctx.arc(
    Math.floor(player.x * scale),
    Math.floor(player.y * scale),
    Math.floor(player.radius * scale),
    0,
    Math.PI * 2
  );
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw cross hash to show center of the circle
  const centerX = Math.floor(player.x * scale);
  const centerY = Math.floor(player.y * scale);
  const hashSize = Math.floor(player.radius * scale * 0.5); // Half the radius for hash size

  ctx.beginPath();
  // Horizontal line
  ctx.moveTo(centerX - hashSize, centerY);
  ctx.lineTo(centerX + hashSize, centerY);
  // Vertical line
  ctx.moveTo(centerX, centerY - hashSize);
  ctx.lineTo(centerX, centerY + hashSize);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function getNearestCorner(player: Player, corners: Corner[]): Corner | null {
  const corner = corners.find((corner) => {
    const dx = corner.x - player.x;
    const dy = corner.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player.radius;
  });

  if (!corner) {
    return null;
  }

  return corner;
}
