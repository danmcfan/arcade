// The game screens `bun run pixel preview` draws each option into. A scene
// renders from the art modules as they are at call time, so preview swaps an
// option into its export and calls the scene again. Add a scene here when
// prototyped art belongs to a screen none of these draw.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { repoRoot } from "../test/parity/fixtures.ts";
import { hubRoomRows } from "./gen-ui-art.ts";
import { blank, toPng } from "./pixel-art.ts";

/** One game screen: which art sources it draws, and how to render it. */
export interface Scene {
  name: string;
  /** Repo-relative art source files whose exports this screen shows. */
  sources: readonly string[];
  render: () => PNG;
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

export const scenes: readonly Scene[] = [
  {
    name: "hub",
    sources: ["src/ui/hubArt.ts", "src/ui/deskArt.ts", "src/ui/tickerArt.ts"],
    render: () => withPlayer(toPng(hubRoomRows())),
  },
];

/** The scene that shows `file`'s art; throws naming this file when none does. */
export function sceneFor(file: string): Scene {
  const scene = scenes.find((s) => s.sources.includes(file));
  if (scene === undefined) throw new Error(`no scene shows ${file}; add one to scripts/pixel-scenes.ts`);
  return scene;
}
