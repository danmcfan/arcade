// Pixel-art source for the HUD icons: a token coin and a ticket. Each icon is
// rows of Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is
// blank). scripts/gen-ui-art.ts packs them left to right, 1 px apart, into
// src/assets/images/icons.png; the runtime reads each icon's place in the
// sheet from here (src/ui/hud.ts).

export const icons = {
  token: [
    "..ooooo..",
    ".oyyyyyo.",
    "oywyyyyyo",
    "oyyyoyyyo",
    "oyyyoyyyo",
    "oyyyoyyyo",
    "oyyyyyyyo",
    ".oyyyyyo.",
    "..ooooo..",
  ],
  ticket: [
    "rrrrrrrrrrrrr",
    "roooyooooooor",
    "rooooooooooor",
    ".rooyoooooor.",
    ".rooooooooor.",
    ".rooyoooooor.",
    "rooooooooooor",
    "roooyooooooor",
    "rrrrrrrrrrrrr",
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof icons;

/** Gap between icons in the sheet. */
const iconGap = 1;

/** Each icon's rectangle in icons.png. */
export const iconRects: Readonly<Record<IconName, { x: number; w: number; h: number }>> = (() => {
  let x = 0;
  const rects = {} as Record<IconName, { x: number; w: number; h: number }>;
  for (const [name, rows] of Object.entries(icons) as [IconName, readonly string[]][]) {
    rects[name] = { x, w: rows[0]!.length, h: rows.length };
    x += rows[0]!.length + iconGap;
  }
  return rects;
})();

export const iconSheetWidth = Object.values(iconRects).reduce((w, r) => Math.max(w, r.x + r.w), 0);
export const iconSheetHeight = Math.max(...Object.values(iconRects).map((r) => r.h));
