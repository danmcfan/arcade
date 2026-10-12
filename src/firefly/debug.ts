// Port of internal/firefly/debug.go. Only reachable with `debug = true` in
// game.ts (false, as in Go).

import type { Surface } from "../engine/surface.ts";
import { newBezierPatternFunc, type BezierConfig } from "./pattern.ts";

const colorCurve = "rgb(0, 255, 255)"; // Cyan for curve
const colorControlPoint = "rgb(255, 0, 255)"; // Magenta for control points
// Go `color.RGBA{255, 255, 0, 128}` is premultiplied (and not a valid
// premultiplied colour); `Surface.line` takes CSS, so this is an approximation.
// Dead code while `debug` is false; see docs/port-notes.md.
const colorControlLine = "rgba(255, 255, 0, 0.5)"; // Yellow for control lines

/** Draws a bezier curve with its control points. */
export function drawBezierDebug(screen: Surface, bezierConfig: BezierConfig, buffer: number, steps: number): void {
  const patternFunc = newBezierPatternFunc(bezierConfig);
  const { p0, p1, p2, p3 } = bezierConfig;

  // Draw control point lines
  drawLine(screen, p0.x + buffer, p0.y + buffer, p1.x + buffer, p1.y + buffer, colorControlLine);
  drawLine(screen, p1.x + buffer, p1.y + buffer, p2.x + buffer, p2.y + buffer, colorControlLine);
  drawLine(screen, p2.x + buffer, p2.y + buffer, p3.x + buffer, p3.y + buffer, colorControlLine);

  // Draw the bezier curve by sampling points
  let prevPoint = patternFunc(0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const currentPoint = patternFunc(t);

    drawLine(screen, prevPoint.x + buffer, prevPoint.y + buffer, currentPoint.x + buffer, currentPoint.y + buffer, colorCurve);

    prevPoint = currentPoint;
  }

  // Draw control points as circles
  drawCircle(screen, p0.x + buffer, p0.y + buffer, 3, colorControlPoint);
  drawCircle(screen, p1.x + buffer, p1.y + buffer, 3, colorControlPoint);
  drawCircle(screen, p2.x + buffer, p2.y + buffer, 3, colorControlPoint);
  drawCircle(screen, p3.x + buffer, p3.y + buffer, 3, colorControlPoint);
}

function drawLine(screen: Surface, x1: number, y1: number, x2: number, y2: number, clr: string): void {
  screen.line(x1, y1, x2, y2, clr);
}

function drawCircle(screen: Surface, x: number, y: number, radius: number, clr: string): void {
  screen.fillCircle(x, y, radius, clr);
}
