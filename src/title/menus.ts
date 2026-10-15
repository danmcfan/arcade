// The title scene's menu items, built from the actions Title supplies.
// (The Game's menus are in src/game/menus.ts; the drawing is in src/ui/menu.ts.)

import type { MenuItem } from "../game/menu.ts";

/** What the Title does for the title menu's items. */
export interface TitleActions {
  newGame: () => void;
  /** Continue is only listed when there is a save. */
  continueGame: (() => void) | null;
}

/** The title menu with a save; without one only NEW GAME is listed. */
export function titleItems(a: TitleActions): MenuItem[] {
  const newGame: MenuItem = { label: "NEW GAME", enabled: true, choose: a.newGame };
  if (a.continueGame === null) return [newGame];
  return [{ label: "CONTINUE", enabled: true, choose: a.continueGame }, newGame];
}

/** What the Title does for the confirm menu's items. */
export interface ConfirmActions {
  no: () => void;
  yes: () => void;
}

/** Asked before New game replaces a save; No is first. */
export function confirmItems(a: ConfirmActions): MenuItem[] {
  return [
    { label: "NO", enabled: true, choose: a.no },
    { label: "YES", enabled: true, choose: a.yes },
  ];
}

/** What the Title does for the hub pause menu's items. */
export interface HubPauseActions {
  resume: () => void;
  controls: () => void;
  quit: () => void;
}

export function hubPauseItems(a: HubPauseActions): MenuItem[] {
  return [
    { label: "RESUME", enabled: true, choose: a.resume },
    { label: "CONTROLS", enabled: true, choose: a.controls },
    { label: "QUIT TO MENU", enabled: true, choose: a.quit },
  ];
}
