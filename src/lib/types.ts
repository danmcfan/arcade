export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export enum GameID {
  SWEET_SAM,
}

export type Corner = {
  x: number;
  y: number;
  directions: Direction[];
};

export type Entity = {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  velocity: number;
};

export type Enemy = Entity & {
  lastCorner: Corner | null;
  scaredTime: number;
  frame: number;
};
