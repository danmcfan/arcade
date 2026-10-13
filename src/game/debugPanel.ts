// Port of internal/debug/debug.go: the hub's debug side panel.

import { debugPrint } from "../engine/text.ts";
import type { PremulColor, Surface } from "../engine/surface.ts";
import type { State } from "../arcade/state.ts";

/** Go `color.RGBA{20, 20, 20, 200}`: premultiplied (fact 10, D15). */
const panelBackground: PremulColor = { r: 20, g: 20, b: 20, a: 200 };

/** `DebugPrintAt`; tests pass a recorder. */
export type DebugPrinter = (screen: Surface, text: string, x: number, y: number) => void;

export class Panel {
  private enabled = true;

  /** Y position where the panel starts. */
  private readonly y: number;
  private readonly panelWidth: number;
  private readonly print: DebugPrinter;

  constructor(y: number, panelWidth: number, print: DebugPrinter = debugPrint) {
    this.y = y;
    this.panelWidth = panelWidth;
    this.print = print;
  }

  /** Panel width (for layout calculations). */
  width(): number {
    return this.panelWidth;
  }

  /** Render the panel with hub state information to the right of the game area. */
  draw(screen: Surface, arcade: State, gameWidth: number, gameHeight: number): void {
    if (!this.enabled) {
      return;
    }

    const panelX = gameWidth;

    // Go fills an `int(width)` x `int(gameHeight)` image with the premultiplied
    // colour and draws it at (panelX, y): the same as a premultiplied fill.
    screen.fillPremul(panelX, this.y, Math.trunc(this.panelWidth), Math.trunc(gameHeight), panelBackground);

    const lines = arcade.debugInfo();

    const lineHeight = 12.0;
    const padding = 8.0;

    lines.forEach((line, i) => {
      const yPos = this.y + padding + i * lineHeight;
      this.print(screen, line, Math.trunc(panelX + padding), Math.trunc(yPos));
    });
  }

  toggle(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

/** Go `debug.NewDebugPanel(x, y, width)`; `print` defaults to `debugPrint`. `x` is unused, as in Go. */
export function newDebugPanel(_x: number, y: number, width: number, print: DebugPrinter = debugPrint): Panel {
  return new Panel(y, width, print);
}
