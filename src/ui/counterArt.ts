// Pixel-art source for the prize counter in the hub (ADR 0006): a red
// counter with a glass case of prizes, seen from the front, the size of its
// collision rect (`counterRect` in src/arcade/prizeCounter.ts). Rows of
// Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank);
// scripts/gen-ui-art.ts writes it to src/assets/images/counter.png.

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
