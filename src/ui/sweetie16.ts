// Sweetie 16 (by GrafxKid), the palette every piece of art in the game is drawn
// in (ADR 0006). Art sources key these colours by a letter of their own; this
// list lets a test check that generated art stays inside the palette.

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
