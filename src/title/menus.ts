// Menu labels, shared by the title scene's logic (title.ts) and its drawing
// (draw.ts) without the two importing each other.

/** The title menu with a save; without one only NEW GAME is listed. */
export const titleMenu = ["CONTINUE", "NEW GAME"] as const;
/** Asked before New game replaces a save. */
export const confirmMenu = ["NO", "YES"] as const;
export const pauseMenu = ["RESUME", "CONTROLS", "QUIT TO MENU"] as const;
