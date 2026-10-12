// Labels for the menus the Game draws over a minigame: the minigame pause
// menu and its controls panel. (The title scene's menus are in
// src/title/menus.ts.)

import type { SoftwareName } from "../game/software.ts";
import type { ControlRow } from "./menu.ts";

export const minigamePauseMenu = ["RESUME", "CONTROLS", "QUIT GAME"] as const;
/** Index of QUIT GAME in `minigamePauseMenu`. */
export const quitGameIndex = 2;
/** Drawn beside QUIT GAME: quitting pays nothing for the run. */
export const quitGameNote = "NO TICKETS";

const standardControls: readonly ControlRow[] = [
  { keys: [["↑", "←", "↓", "→"], ["WASD"]], label: "MOVE" },
  { keys: [["SPACE"]], label: "ACTION" },
  { keys: [["ESC"]], label: "PAUSE" },
];

/** Each minigame's controls panel. For now every minigame has the same three rows. */
export const minigameControls: Readonly<Record<SoftwareName, readonly ControlRow[]>> = {
  hive: standardControls,
  firefly: standardControls,
  gearhead: standardControls,
};
