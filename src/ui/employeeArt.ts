// Pixel-art source for the prize desk's employee (#91): Fire Red's
// white-shirted counter worker, from the owner's FRLG character sheet
// (character-ref.png in #76, not in the repo), imported with `bun run pixel
// rows` and redressed after the owner's photo: brown hair, a white shirt, a
// red vest and black pants, in Sweetie 16 with the player's black outline.
// His arms hang at his sides with the hands showing, like Fire Red's
// green-capped worker. 16x24 like the player, standing behind the desk with
// his back to us, always facing the player. Fire Red's counter workers do not
// idle, so this is the one frame. scripts/gen-ui-art.ts writes it to
// src/assets/images/employee.png; the hub draws it (src/arcade/employee.ts).

export const employeeWidth = 16;
export const employeeHeight = 24;

/**
 * The left half seen from behind, unoutlined: the hair, the shirt's shoulders
 * and sleeves, the hands, the vest, the pants. scripts/gen-ui-art.ts
 * `employeeRows` mirrors and outlines it.
 */
export const employeeHalf: readonly string[] = [
  "........",
  "........",
  "........",
  "........",
  "......rp",
  "....prpp",
  "...kprrp",
  "...ppprr",
  "...ppppp",
  "..okpppp",
  "..okpppp",
  "...kpppp",
  "...kkppp",
  "....kkkk",
  "...wkkkk",
  "..wwlrrr",
  "..owlprr",
  "..okprrr",
  "...kprrr",
  "....pprr",
  "....ddd.",
  "....dd..",
  "........",
  "........",
];
