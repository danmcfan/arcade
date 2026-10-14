// The game screens `bun run pixel preview` draws each option into. A scene
// renders from the art modules as they are at call time, so preview swaps an
// option into its export and calls the scene again. A scene is one image per
// game tick (60 a second), so its animations play in the preview as in the
// game. Add a scene here when prototyped art belongs to a screen none of these
// draw.

import type { PNG } from "pngjs";
import type { Direction } from "../src/engine/input.ts";
import { newScreen, screenFrame, updateScreen } from "../src/arcade/screen.ts";
import { powerCabinetX, powerFrameHeight, powerFrameWidth, powerSheetRows } from "../src/ui/hubArt.ts";
import { hubCabinets, hubRoomRows } from "./gen-ui-art.ts";
import { paint, toPng } from "./pixel-art.ts";
import { playerFrames, playerFramesFor } from "../src/ui/playerArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

/** One game screen: which art sources it draws, and how to render it. */
export interface Scene {
  name: string;
  /** Repo-relative art source files whose exports this screen shows. */
  sources: readonly string[];
  /** The screen on each tick of one loop. */
  render: () => PNG[];
}

/** Ticks per walk frame: the player's `frameIncrement` of 0.1 (src/arcade/entity.ts). */
const ticksPerStep = 10;
/** The facings the player walks in place through, one walk cycle each. */
const walkOrder: readonly Direction[] = ["DOWN", "LEFT", "UP", "RIGHT"];

/** The player walking in place in front of the middle cabinet, drawn from `playerFramesFor` on `tick`. */
function withPlayer(room: PNG, tick: number): PNG {
  const step = Math.trunc(tick / ticksPerStep);
  const dir = walkOrder[Math.trunc(step / playerFrames) % walkOrder.length] ?? "DOWN";
  paint(room, playerFramesFor(dir)[step % playerFrames] ?? [], sweetie, 72, 66);
  return room;
}

/** Ticks the hub spends in each part of its loop: dark, switched on, then dark again after switching off. */
const hubLoop = { off: 40, on: 80, after: 40 } as const;

/**
 * The hub room, the player walking in place in front of the middle cabinet
 * through each facing as its screen
 * switches on and off on the game's own timing (src/arcade/screen.ts), drawn
 * from screens.png's frames (`powerSheetRows`).
 */
function hubFrames(): PNG[] {
  const cabinets = hubCabinets();
  const room = hubRoomRows();
  const sheet = powerSheetRows(cabinets);
  const row = Math.trunc(cabinets.length / 2);
  const cabinet = cabinets[row];
  if (cabinet === undefined) throw new Error("the hub has no cabinets");
  const screen = newScreen();
  const frames: PNG[] = [];
  for (let tick = 0; tick < hubLoop.off + hubLoop.on + hubLoop.after; tick++) {
    updateScreen(screen, tick >= hubLoop.off && tick < hubLoop.off + hubLoop.on);
    const png = toPng(room);
    const column = screenFrame(screen);
    if (column !== null) {
      const cell = sheet
        .slice(row * powerFrameHeight, (row + 1) * powerFrameHeight)
        .map((r) => r.slice(column * powerFrameWidth, (column + 1) * powerFrameWidth));
      paint(png, cell, sweetie, cabinet.rect.x - powerCabinetX, cabinet.rect.y);
    }
    frames.push(withPlayer(png, tick));
  }
  return frames;
}

export const scenes: readonly Scene[] = [
  {
    name: "hub",
    sources: ["src/ui/hubArt.ts", "src/ui/deskArt.ts", "src/ui/tickerArt.ts", "src/ui/playerArt.ts"],
    render: hubFrames,
  },
];

/** The scene that shows `file`'s art; throws naming this file when none does. */
export function sceneFor(file: string): Scene {
  const scene = scenes.find((s) => s.sources.includes(file));
  if (scene === undefined) throw new Error(`no scene shows ${file}; add one to scripts/pixel-scenes.ts`);
  return scene;
}
