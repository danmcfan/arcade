import { State } from "./state";
import { clearScreen, scaleScreen, centerScreen } from "./draw";

export function getErrorHandler(state: State, error: Error) {
  const { ctx } = state;

  state.gameWidth = 0;
  state.gameHeight = 0;

  function drawError(_: number) {
    ctx.save();

    clearScreen(state);
    scaleScreen(state);
    centerScreen(state);

    ctx.font = "bold 12px Monospace";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";

    const scale = state.scaleBase * state.scaleModifier;
    const maxWidth = state.width / scale - 60;

    // Split message into multiple lines if needed
    const errorText = `${error.name}: ${error.message}`;
    const words = errorText.split(" ");
    let line = "";
    const lines = [];

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      lines.push(line);
    }

    // Draw each line of text
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (-12 * (lines.length - 1)) / 2 + i * 12 * 1.5);
    });

    ctx.restore();
  }

  function errorLoop(timestamp: number) {
    drawError(timestamp);
    requestAnimationFrame(errorLoop);
  }

  return errorLoop;
}
