import { Direction } from "@/lib/direction";
import { SpriteSheetID } from "@/lib/sprite";

export type Entity = {
  spriteSheetID: SpriteSheetID | null;
  frame: number;
  frameRowOffset: number;
  frameIncrement: number;
  frameCount: number;
  frameDirection: Map<Direction, number>;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  direction: Direction | null;
  directions: Direction[];
  radius: number;
  velocity: number;
  lastCorner: Entity | null;
  scaredTime: number;
};

export function newEntity({
  spriteSheetID = null,
  frame = 0,
  frameRowOffset = 0,
  frameIncrement = 0,
  frameCount = 0,
  frameDirection = new Map(),
  x = 0,
  y = 0,
  offsetX = 0,
  offsetY = 0,
  direction = null,
  directions = [],
  radius = 0,
  velocity = 0,
  lastCorner = null,
  scaredTime = 0,
}: Partial<Entity>): Entity {
  return {
    spriteSheetID,
    frame,
    frameRowOffset,
    frameIncrement,
    frameCount,
    frameDirection,
    x,
    y,
    offsetX,
    offsetY,
    direction,
    directions,
    radius,
    velocity,
    lastCorner,
    scaredTime,
  };
}
