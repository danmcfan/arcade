// The thin cabinet outline every minigame plays inside (#113; the full Go
// cabinet bezel before that, shared since #15). A `FixedViewport` minigame
// sized `cabinetWidth` x `cabinetHeight` draws its outline image at 0,0,
// then its playfield inside the insets with `drawOnScreen`.

import type { Surface } from "../engine/surface.ts";

/** At most 360 tall, so it gets 2x at 720p and 3x at 1080p, like the screen alone. */
export const cabinetWidth = 240;
export const cabinetHeight = 304;

export const cabinetInsetTop = 8;
export const cabinetInsetBottom = 8;
export const cabinetInsetLeft = 8;
export const cabinetInsetRight = 8;

/** The space inside the insets: 224x288, Sweet Sam's maze and Firefly's night sky. */
export const cabinetPlayfieldWidth = cabinetWidth - cabinetInsetLeft - cabinetInsetRight;
export const cabinetPlayfieldHeight = cabinetHeight - cabinetInsetTop - cabinetInsetBottom;

/** Runs `draw` with everything it draws clipped to the cabinet's screen, so no art spills onto the outline. */
export function drawOnScreen(screen: Surface, draw: () => void): void {
  screen.clipped(cabinetInsetLeft, cabinetInsetTop, cabinetPlayfieldWidth, cabinetPlayfieldHeight, draw);
}
