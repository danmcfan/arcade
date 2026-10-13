// Sweetie 16 (by GrafxKid), the palette every piece of art in the game is drawn
// in (ADR 0006). Art sources draw in rows of `sweetie`'s letters (`.` is
// blank); this list lets a test check that generated art stays inside the
// palette.

export const sweetie16 = [
  "#1a1c2c",
  "#5d275d",
  "#b13e53",
  "#ef7d57",
  "#ffcd75",
  "#a7f070",
  "#38b764",
  "#257179",
  "#29366f",
  "#3b5dc9",
  "#41a6f6",
  "#73eff7",
  "#f4f4f4",
  "#94b0c2",
  "#566c86",
  "#333c57",
] as const;

export type Sweetie16 = (typeof sweetie16)[number];

/** The one letter every art source uses for each Sweetie 16 colour. */
export const sweetie = {
  k: "#1a1c2c", // black
  p: "#5d275d", // purple
  r: "#b13e53", // red
  o: "#ef7d57", // orange
  y: "#ffcd75", // yellow
  g: "#a7f070", // lime
  G: "#38b764", // green
  t: "#257179", // teal
  n: "#29366f", // navy
  b: "#3b5dc9", // blue
  B: "#41a6f6", // sky blue
  c: "#73eff7", // cyan
  w: "#f4f4f4", // white
  l: "#94b0c2", // light grey
  m: "#566c86", // mid grey
  d: "#333c57", // dark grey
} as const satisfies Record<string, Sweetie16>;

export type SweetieLetter = keyof typeof sweetie;
