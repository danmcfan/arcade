export function drawScore(
  score: number,
  ctx: CanvasRenderingContext2D,
  scale: number
) {
  ctx.save();

  const fontSize = Math.floor(10 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  const scoreText = `Score: ${score.toString().padStart(5, " ")}`;
  ctx.fillText(scoreText, (16 * 18 - 10) * scale, 0);

  ctx.restore();
}

export function drawLives(
  lives: number,
  ctx: CanvasRenderingContext2D,
  scale: number
) {
  ctx.save();

  const fontSize = Math.floor(10 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  const livesText = `Lives: ${lives.toString().padStart(1, " ")}`;
  ctx.fillText(livesText, 8 * scale, (16 * 21 + 8) * scale);

  ctx.restore();
}

export function drawWinner(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  let fontSize = Math.floor(18 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillText("WINNER", 16 * (18 / 2) * scale, (16 * (21 / 2) - 10) * scale);

  fontSize = Math.floor(12 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillText(
    "Press ESC",
    16 * (18 / 2) * scale,
    (16 * (21 / 2) + 10) * scale
  );

  ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  let fontSize = Math.floor(18 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillText(
    "GAME OVER",
    16 * (18 / 2) * scale,
    (16 * (21 / 2) - 10) * scale
  );

  fontSize = Math.floor(12 * scale);
  ctx.font = `bold ${fontSize}px Monospace`;
  ctx.fillText(
    "Press ESC",
    16 * (18 / 2) * scale,
    (16 * (21 / 2) + 10) * scale
  );

  ctx.restore();
}
