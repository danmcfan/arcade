import type { Direction } from "@/lib/sweet/direction";

export type Corner = {
  x: number;
  y: number;
  directions: Direction[];
};

export function drawCorner(
  corner: Corner,
  ctx: CanvasRenderingContext2D,
  scale: number,
  radius: number = 2
) {
  ctx.save();

  for (const direction of corner.directions) {
    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = radius * 0.5;

    ctx.moveTo(Math.floor(corner.x * scale), Math.floor(corner.y * scale));

    let endX = corner.x;
    let endY = corner.y;

    const length = radius * 1.5;
    switch (direction) {
      case "up":
        endY -= length;
        break;
      case "down":
        endY += length;
        break;
      case "left":
        endX -= length;
        break;
      case "right":
        endX += length;
        break;
    }

    ctx.lineTo(Math.floor(endX * scale), Math.floor(endY * scale));
    ctx.stroke();
  }

  ctx.restore();
}
