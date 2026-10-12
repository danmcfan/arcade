// Pixel-art source for the prize counter in the hub (ADR 0006): a red
// counter with a glass case of prizes, seen from the front, the size of its
// collision rect (`counterRect` in src/arcade/prizeCounter.ts). Rows of
// palette letters (`.` is blank); scripts/gen-ui-art.ts writes it to
// src/assets/images/counter.png.

/** Sweetie 16 colours, keyed by the letter the rows use. */
export const counterPalette: Readonly<Record<string, string>> = {
  k: "#1a1c2c",
  y: "#ffcd75",
  o: "#ef7d57",
  r: "#b13e53",
  n: "#29366f",
  l: "#94b0c2",
  B: "#41a6f6",
  w: "#f4f4f4",
  g: "#a7f070",
  G: "#38b764",
};

/** Countertop (yellow edge, orange top), then the case: a star, a ball, a bear, a heart and a flower. */
export const counterArt: readonly string[] = [
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk",
    "kooooooooooooooooooooooooooooooooooooook",
    "kooooooooooooooooooooooooooooooooooooook",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "krkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrk",
    "krkllnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnkrk",
    "krklnnnnynnnnnBBnnnoonoonnrrnrrnnngnnkrk",
    "krknnnyyyyynnBwBBnnooooonnrrrrrnngggnkrk",
    "krknnnnyyynnnBBBBnnoyoyonnnrrrnnnnGnnkrk",
    "krknnnnynynnnnBBnnnnooonnnnnrnnnnnGnnkrk",
    "krkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrk",
    "krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
];
