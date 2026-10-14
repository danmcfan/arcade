// Pixel-art source for the prize desk's employee (#91): the arcade worker in a
// green cap and uniform from character-ref.png (Fire Red's counter worker),
// imported with `bun run pixel rows` and recoloured to Sweetie 16, with the
// player's black outline. 16x24 like the player, standing behind the desk
// with their back to us, facing the player. Fire Red's counter workers do not
// idle, so this is the one frame. scripts/gen-ui-art.ts writes it to
// src/assets/images/employee.png; the hub draws it (src/arcade/employee.ts).

export const employeeWidth = 16;
export const employeeHeight = 24;

/** Seen from behind: the cap, the back of the head, the uniform, the shoes. */
export const employee: readonly string[] = [
  "................",
  "................",
  "................",
  "....kkkkkkkk....",
  "...kGGGGGGGGk...",
  "..kGGGGGGGGGGk..",
  "..kGGGGGGGGGGk..",
  "..ktGGGGGGGGtk..",
  "..ktttGGGGtttk..",
  "..kkttttttttkk..",
  ".kokkttttttkkok.",
  ".kokkkkkkkkkkok.",
  "..kkkppppppkkk..",
  "...kkkppppkkk...",
  "..kGkkkkkkkkGk..",
  ".kGGGttttttGGGk.",
  ".koGttGGGGttGok.",
  ".koktGGGGGGtkok.",
  "..kktGGGGGGtkk..",
  "...kGttttttGk...",
  "...ktGGkkGGtk...",
  "...kppk..kppk...",
  "....kk....kk....",
  "................",
];
