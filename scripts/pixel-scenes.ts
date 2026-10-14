// The game screens `bun run pixel preview` draws each option into. A scene
// renders from the art modules as they are at call time, so preview swaps an
// option into its export and calls the scene again. A scene is one image per
// game tick (60 a second), so its animations play in the preview as in the
// game. Add a scene here when prototyped art belongs to a screen none of these
// draw.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { repoRoot } from "../test/parity/fixtures.ts";
import { newScreen, screenFrame, updateScreen } from "../src/arcade/screen.ts";
import { powerCabinetX, powerFrameHeight, powerFrameWidth, powerSheetRows } from "../src/ui/hubArt.ts";
import { hubCabinets, hubRoomRows } from "./gen-ui-art.ts";
import { blank, paint, toPng } from "./pixel-art.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

/** One game screen: which art sources it draws, and how to render it. */
export interface Scene {
  name: string;
  /** Repo-relative art source files whose exports this screen shows. */
  sources: readonly string[];
  /** The screen on each tick of one loop. */
  render: () => PNG[];
}

/** The first frame of the player sheet, standing in front of the middle cabinet. */
function withPlayer(room: PNG): PNG {
  const sheet = PNG.sync.read(readFileSync(join(repoRoot, "src/assets/images/player.png")));
  const player = blank(16, 24);
  PNG.bitblt(sheet, player, 0, 0, 16, 24, 0, 0);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 16; x++) {
      const s = (y * 16 + x) * 4;
      if (player.data[s + 3] === 0) continue;
      player.data.copy(room.data, ((66 + y) * room.width + 72 + x) * 4, s, s + 4);
    }
  }
  return room;
}

/** Ticks the hub spends in each part of its loop: dark, switched on, then dark again after switching off. */
const hubLoop = { off: 40, on: 80, after: 40 } as const;

/**
 * The hub room, the player in front of the middle cabinet as its screen
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
    frames.push(withPlayer(png));
  }
  return frames;
}

export const scenes: readonly Scene[] = [
  {
    name: "hub",
    sources: ["src/ui/hubArt.ts", "src/ui/deskArt.ts", "src/ui/tickerArt.ts"],
    render: hubFrames,
  },
];

/** The scene that shows `file`'s art; throws naming this file when none does. */
export function sceneFor(file: string): Scene {
  const scene = scenes.find((s) => s.sources.includes(file));
  if (scene === undefined) throw new Error(`no scene shows ${file}; add one to scripts/pixel-scenes.ts`);
  return scene;
}
