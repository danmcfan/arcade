import type { Player } from "@/lib/sweet/player";
import type { Corner } from "@/lib/sweet/corner";
import { createSpriteSheet, getSprite } from "@/lib/engine/sprite";

export const PLAYER_SPRITE_SHEET = createSpriteSheet(
  "/images/Player.png",
  32,
  32
);

export const PLAYER: Player = {
  x: 144,
  y: 256,
  radius: 3,
  direction: "left",
  sprite: getSprite(PLAYER_SPRITE_SHEET, 4, 0),
  frame: 0,
};

export const CORNERS: Corner[] = [
  // row 1, section 1
  {
    x: 17,
    y: 17,
    directions: ["right", "down"],
  },
  {
    x: 65,
    y: 17,
    directions: ["right", "down", "left"],
  },
  {
    x: 128,
    y: 17,
    directions: ["down", "left"],
  },
  // row 1, section 2
  {
    x: 161,
    y: 17,
    directions: ["right", "down"],
  },
  {
    x: 224,
    y: 17,
    directions: ["right", "down", "left"],
  },
  {
    x: 272,
    y: 17,
    directions: ["down", "left"],
  },
  // row 2, section 1
  {
    x: 17,
    y: 65,
    directions: ["up", "right", "down"],
  },
  {
    x: 65,
    y: 65,
    directions: ["up", "right", "down", "left"],
  },
  {
    x: 96,
    y: 65,
    directions: ["right", "down", "left"],
  },
  {
    x: 128,
    y: 65,
    directions: ["up", "right", "left"],
  },
  // row 2, section 2
  {
    x: 161,
    y: 65,
    directions: ["up", "right", "left"],
  },
  {
    x: 194,
    y: 65,
    directions: ["right", "down", "left"],
  },
  {
    x: 224,
    y: 65,
    directions: ["up", "right", "down", "left"],
  },
  {
    x: 272,
    y: 65,
    directions: ["up", "down", "left"],
  },
  // row 3, section 1
  {
    x: 17,
    y: 96,
    directions: ["up", "right"],
  },
  {
    x: 65,
    y: 96,
    directions: ["up", "down", "left"],
  },
  {
    x: 96,
    y: 96,
    directions: ["up", "right"],
  },
  {
    x: 128,
    y: 96,
    directions: ["down", "left"],
  },
  // row 3, section 2
  {
    x: 161,
    y: 96,
    directions: ["right", "down"],
  },
  {
    x: 194,
    y: 96,
    directions: ["up", "left"],
  },
  {
    x: 224,
    y: 96,
    directions: ["up", "right", "down"],
  },
  {
    x: 272,
    y: 96,
    directions: ["up", "left"],
  },
  // row 4a
  {
    x: 96,
    y: 128,
    directions: ["right", "down"],
  },
  {
    x: 128,
    y: 128,
    directions: ["up", "right", "left"],
  },
  {
    x: 161,
    y: 128,
    directions: ["up", "right", "left"],
  },
  {
    x: 194,
    y: 128,
    directions: ["down", "left"],
  },
  // row 4b
  {
    x: 65,
    y: 161,
    directions: ["up", "right", "down", "left"],
  },
  {
    x: 96,
    y: 161,
    directions: ["up", "down", "left"],
  },
  {
    x: 194,
    y: 161,
    directions: ["up", "right", "down"],
  },
  {
    x: 224,
    y: 161,
    directions: ["up", "right", "down", "left"],
  },
  // row 4c
  {
    x: 96,
    y: 194,
    directions: ["up", "right", "down"],
  },
  {
    x: 194,
    y: 194,
    directions: ["up", "down", "left"],
  },
  // row 5, section 1
  {
    x: 17,
    y: 224,
    directions: ["right", "down"],
  },
  {
    x: 65,
    y: 224,
    directions: ["up", "right", "down", "left"],
  },
  {
    x: 96,
    y: 224,
    directions: ["up", "right", "left"],
  },
  {
    x: 128,
    y: 224,
    directions: ["down", "left"],
  },
  // row 5, section 2
  {
    x: 161,
    y: 224,
    directions: ["right", "down"],
  },
  {
    x: 194,
    y: 224,
    directions: ["up", "right", "left"],
  },
  {
    x: 224,
    y: 224,
    directions: ["up", "right", "down", "left"],
  },
  {
    x: 272,
    y: 224,
    directions: ["down", "left"],
  },
  // row 6, section 1
  {
    x: 17,
    y: 256,
    directions: ["up", "right"],
  },
  {
    x: 32,
    y: 256,
    directions: ["down", "left"],
  },
  {
    x: 65,
    y: 256,
    directions: ["up", "right", "down"],
  },
  {
    x: 96,
    y: 256,
    directions: ["right", "down", "left"],
  },
  {
    x: 128,
    y: 256,
    directions: ["up", "right", "left"],
  },
  // row 6, section 2
  {
    x: 161,
    y: 256,
    directions: ["up", "right", "left"],
  },
  {
    x: 194,
    y: 256,
    directions: ["right", "down", "left"],
  },
  {
    x: 224,
    y: 256,
    directions: ["up", "down", "left"],
  },
  {
    x: 256,
    y: 256,
    directions: ["right", "down"],
  },
  {
    x: 272,
    y: 256,
    directions: ["up", "left"],
  },
  // row 7, section 1
  {
    x: 17,
    y: 288,
    directions: ["right", "down"],
  },
  {
    x: 32,
    y: 288,
    directions: ["up", "right", "left"],
  },
  {
    x: 65,
    y: 288,
    directions: ["up", "left"],
  },
  {
    x: 96,
    y: 288,
    directions: ["up", "right"],
  },
  {
    x: 128,
    y: 288,
    directions: ["down", "left"],
  },
  // row 7, section 2
  {
    x: 161,
    y: 288,
    directions: ["right", "down"],
  },
  {
    x: 194,
    y: 288,
    directions: ["up", "left"],
  },
  {
    x: 224,
    y: 288,
    directions: ["up", "right"],
  },
  {
    x: 256,
    y: 288,
    directions: ["up", "right", "left"],
  },
  {
    x: 272,
    y: 288,
    directions: ["down", "left"],
  },
  // row 8, section 1
  {
    x: 17,
    y: 320,
    directions: ["up", "right"],
  },
  {
    x: 128,
    y: 320,
    directions: ["up", "right", "left"],
  },
  // row 8, section 2
  {
    x: 161,
    y: 320,
    directions: ["up", "right", "left"],
  },
  {
    x: 272,
    y: 320,
    directions: ["up", "left"],
  },
];
