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
  ctx.fillText(scoreText, 275 * scale, 0);

  ctx.restore();
}
