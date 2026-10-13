// Port of internal/arcade/draw.go, plus the prize counter, the decorations
// of the prizes the player owns and the use prompt.

import { imageArcade, imageCounter } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawKey, keyHeight, keyWidth } from "../ui/text.ts";
import { drawDebugOverlay } from "./debug.ts";
import { titleImages } from "./machine.ts";
import { prize } from "./prizes.ts";
import { tileSize, type State } from "./state.ts";
import { useTarget } from "./update.ts";

export interface HubDrawOptions {
  /** The Game's tick: times the use prompt's bob. */
  tick: number;
  /** A menu covers the hub, so Space does not use anything: no use prompt. */
  covered: boolean;
}

export function draw(screen: Surface, s: State, buffer: number, debugMode: boolean, opts: HubDrawOptions): void {
  drawImage(screen, imageArcade, buffer, buffer);
  // The player can't overlap the counter, so drawing it first is enough.
  drawImage(screen, imageCounter, s.counter.x + buffer, s.counter.y + buffer);
  // Decorations are not solid: the player walks in front of them.
  for (const id of s.prizes) {
    const p = prize(id);
    drawImage(screen, p.sprite, p.x + buffer, p.y + buffer);
  }

  const player = s.player;
  const row = player.frameDirection[player.direction];
  const playerImageFrame = cutImage(
    player.image,
    Math.trunc(player.frame) * player.width,
    row * player.height,
    player.width,
    player.height,
  );
  drawImage(screen, playerImageFrame, player.x + buffer - player.width / 2, player.y + buffer - player.height / 2);

  const prompt = opts.covered ? null : usePrompt(s, opts.tick);
  if (prompt !== null) {
    drawKey(screen, usePromptLabel, prompt.x + buffer, prompt.y + buffer);
  }

  if (s.melodyPlaying && s.imageTitle !== null) {
    drawImage(screen, titleImages[s.imageTitle], buffer, buffer);
  }

  if (debugMode) {
    drawDebugOverlay(screen, s, buffer);
  }
}

/** The key cap the use prompt shows. */
export const usePromptLabel = "SPACE";
/** Ticks the use prompt spends at each height of its bob. */
export const usePromptBobTicks = 20;
/** Gap between the prompt and the top of the thing it floats over. */
const promptGap = 2;
/** The floor's left and right edges (inside the side walls, `newWalls`). */
const floorLeft = 3 * tileSize;
const floorRight = 17 * tileSize;

/**
 * Where the use prompt's key cap goes (top-left, hub-image coordinates), or
 * null when Space would use nothing (`useTarget`). It floats just above the
 * cabinet or the prize counter, so it never hides what it points at. A player
 * standing on top of the counter, facing down, covers the space above it, so
 * there it floats above the player's head instead, centred on them and kept
 * over the floor. It bobs up 1 px every other `usePromptBobTicks` ticks.
 */
export function usePrompt(s: State, tick: number): { x: number; y: number } | null {
  const target = useTarget(s);
  if (target === null) return null;
  const bob = Math.trunc(tick / usePromptBobTicks) % 2;
  const w = keyWidth(usePromptLabel);
  const p = s.player;
  if (target === "counter" && p.direction === "DOWN") {
    const x = Math.min(Math.max(Math.trunc(p.x - w / 2), floorLeft), floorRight - w);
    return { x, y: p.y - p.height / 2 - keyHeight - promptGap - bob };
  }
  const r = target === "counter" ? s.counter : target.rect;
  return { x: r.x + Math.trunc((r.w - w) / 2), y: r.y - keyHeight - promptGap - bob };
}

/** Go `img.SubImage(image.Rect(int(x), int(y), int(x+w), int(y+h)))`. */
export function cutImage(img: Sprite, x: number, y: number, w: number, h: number): Sprite {
  return sub(img, Math.trunc(x), Math.trunc(y), Math.trunc(x + w), Math.trunc(y + h));
}

function drawImage(screen: Surface, img: Sprite, x: number, y: number): void {
  screen.draw(img, x, y);
}
