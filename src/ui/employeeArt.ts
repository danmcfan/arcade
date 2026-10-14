// Pixel-art source for the prize desk's employee (#91): Fire Red's
// green-capped counter worker, from the owner's FRLG character sheet
// (character-ref.png in #76, not in the repo), imported with `bun run pixel
// rows` and recoloured to Sweetie 16, with the player's black outline. 16x24
// like the player, standing behind the desk with their back to us, facing the
// player. Fire Red's counter workers do not idle, so this is the one frame.
// scripts/gen-ui-art.ts writes it to src/assets/images/employee.png; the hub
// draws it (src/arcade/employee.ts).

export const employeeWidth = 16;
export const employeeHeight = 24;

/**
 * The left half seen from behind, unoutlined: the cap, the back of the head,
 * the uniform, the shoes. scripts/gen-ui-art.ts `employeeRows` mirrors and
 * outlines it.
 */
export const employeeHalf: readonly string[] = [
  "........",
  "........",
  "........",
  "........",
  "....GGGG",
  "...GGGGG",
  "...GGGGG",
  "...tGGGG",
  "...tttGG",
  "...ktttt",
  "..okkttt",
  "..okkkkk",
  "...kkppp",
  "....kkpp",
  "...Gkkkk",
  "..GGGttt",
  "..oGttGG",
  "..oktGGG",
  "...ktGGG",
  "....Gttt",
  "....tGG.",
  "....pp..",
  "........",
  "........",
];
