// Pixel-art source for the hub's change machine (#198), drawn by the owner in
// Aseprite and imported with `bun run pixel rows`: a machine standing square
// against the right wall, its front turned toward the room, coins on its
// side. 16x32: its bottom 16 rows stand on the solid 16x16 spot, the rest
// rises above it. scripts/gen-ui-art.ts writes it to
// src/assets/images/change-machine.png; src/arcade/changeMachine.ts draws it.

export const changeMachineWidth = 16;
export const changeMachineHeight = 32;

export const changeMachine: readonly string[] = [
  "................",
  "................",
  ".......kkkkkkkkk",
  "......krooooooor",
  "......koooooooor",
  ".....korooooooor",
  ".....korooooooor",
  "....korkooooooor",
  "....korkooooooor",
  "...korkkooooooor",
  "..kkorkkooooooor",
  ".kooorkkooooooor",
  "doyyorkkooooooor",
  "dyryorkorrrrrrrr",
  "dryyorkorrrrrrrr",
  "dyryororrrrrrrrr",
  "dryyororrrrrrrrr",
  "dyryoorrrrrrrrrr",
  "dyyoorrrrrrrrrrr",
  "dyorrrrrrrrrrrrr",
  "dorrrrrrrrrrrrrr",
  "drrrrrrrrrrrrrrr",
  "drrrrrrrrrrrrrrr",
  "dyyrryyrryyrryyr",
  "dyyrryyrryyrryyr",
  "drrrrrrrrrrrrrrr",
  "drroorroorroorro",
  "dooooooooooooooo",
  "dooooooooooooooo",
  "dooooooooooooooo",
  "dddddddddddddddd",
  "kkkkkkkkkkkkkkkk",
];
