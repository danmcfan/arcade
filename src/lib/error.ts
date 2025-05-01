import { State } from "./state";

export function getErrorHandler(state: State, error: Error) {
  const { ctx } = state;

  function drawError(_: number) {
    ctx.clearRect(
      -state.width / 2,
      -state.height / 2,
      state.width,
      state.height
    );
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    // Set font size based on scale
    const scale = state.scaleBase * state.scaleModifier;
    const fontSize = 2 * scale;
    ctx.font = `${fontSize}px Arial`;

    // Limit text width to prevent overrun
    const maxWidth = state.width / scale - 20; // Leave some margin

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
      ctx.fillText(
        line,
        0,
        (-fontSize * (lines.length - 1)) / 2 + i * fontSize * 1.2
      );
    });
  }

  function errorLoop(timestamp: number) {
    drawError(timestamp);
    requestAnimationFrame(errorLoop);
  }

  return errorLoop;
}
