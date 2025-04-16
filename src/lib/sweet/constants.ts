import type { Player } from "@/lib/sweet/player";
import type { Corner } from "@/lib/sweet/corner";

export const PLAYER: Player = {
  x: 144,
  y: 256,
  radius: 3,
  direction: "left",
};

export const CORNERS: Corner[] = [
  // row 1
  {
    x: 18,
    y: 16,
    directions: ["right", "down"],
  },
  {
    x: 65,
    y: 16,
    directions: ["right", "down", "left"],
  },
  {
    x: 128,
    y: 16,
    directions: ["down", "left"],
  },
  // row 2
  {
    x: 18,
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
  // row 3
  {
    x: 18,
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
  // row 4
  {
    x: 65,
    y: 160,
    directions: ["up", "right", "down", "left"],
  },
  // row 5
  {
    x: 18,
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
  // row 6
  {
    x: 18,
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
  // row 7
  {
    x: 18,
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
  // row 8
  {
    x: 18,
    y: 320,
    directions: ["up", "right"],
  },
];
