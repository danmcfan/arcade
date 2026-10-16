// Sweet Sam's intermissions (#160): Pac-Man's three cutscenes, after levels
// 2, 5 and 9 (Pac-Man Dossier, "The Basics"). Each scene is data: who is on
// screen, how big, and where they walk when, so new art (#199) can swap a
// sprite without touching the state machine.

import type { Direction } from "../engine/input.ts";

/** Who an actor is drawn as. #199 adds the torn and patched red bee. */
export type IntermissionSprite = "bear" | "redBee";

/** One straight walk along the scene's row, from `fromX` at tick `from` to `toX` at tick `to`. */
export interface IntermissionMove {
  from: number;
  to: number;
  fromX: number;
  toX: number;
  facing: Direction;
}

export interface IntermissionActor {
  sprite: IntermissionSprite;
  /** 2 draws the actor twice as big (the big bear of Act I). */
  scale: number;
  /** Drawn in the sleepy (blue) colours. */
  frightened: boolean;
  /** The actor is on screen only during its moves; a move with `fromX === toX` stands still. */
  moves: readonly IntermissionMove[];
}

export interface IntermissionScene {
  name: string;
  /** Ticks the scene lasts before the next level starts. */
  ticks: number;
  actors: readonly IntermissionActor[];
}

/** Where one actor stands on one tick. */
export interface IntermissionPose {
  sprite: IntermissionSprite;
  scale: number;
  frightened: boolean;
  x: number;
  facing: Direction;
  /** Walk-cycle frame, 0..3. */
  frame: number;
}

/** The row the actors walk along, in maze pixels: through the middle of the screen. */
export const intermissionY = 8 * 17.5;

/** Off-screen x on each side, far enough that a 16 px sprite is fully hidden. */
const offLeft = -16;
const offRight = 240;
const crossTicks = 160;
const walkFrameTicks = 6;

function walk(from: number, to: number, fromX: number, toX: number): IntermissionMove {
  return { from, to, fromX, toX, facing: toX < fromX ? "LEFT" : "RIGHT" };
}

function stand(from: number, to: number, x: number, facing: Direction): IntermissionMove {
  return { from, to, fromX: x, toX: x, facing };
}

function actor(
  sprite: IntermissionSprite,
  moves: IntermissionMove[],
  scale = 1,
  frightened = false,
): IntermissionActor {
  return { sprite, scale, frightened, moves };
}

/** Act I: the red bee chases the bear off to the left; a big bear chases a frightened bee back. */
const actI: IntermissionScene = {
  name: "act-1",
  ticks: 460,
  actors: [
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("redBee", [walk(0, crossTicks + 20, offRight + 32, offLeft)]),
    actor("redBee", [walk(220, 220 + crossTicks, offLeft, offRight)], 1, true),
    actor("bear", [walk(240, 440, offLeft - 48, offRight + 48)], 2),
  ],
};

/** Act II: the bear crosses; the red bee follows, snags partway and stays. */
const actII: IntermissionScene = {
  name: "act-2",
  ticks: 300,
  actors: [
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("redBee", [walk(0, 90, offRight + 32, 128), stand(90, 300, 128, "LEFT")]),
  ],
};

/** Act III: the red bee chases the bear across, then comes back the other way. */
const actIII: IntermissionScene = {
  name: "act-3",
  ticks: 420,
  actors: [
    actor("bear", [walk(0, crossTicks, offRight, offLeft)]),
    actor("redBee", [walk(0, crossTicks + 20, offRight + 32, offLeft), walk(230, 230 + crossTicks, offLeft, offRight)]),
  ],
};

const scenes: ReadonlyMap<number, IntermissionScene> = new Map([
  [2, actI],
  [5, actII],
  [9, actIII],
]);

/** The scene played after clearing `level`, or null when the next level starts straight away. */
export function intermissionAfter(level: number): IntermissionScene | null {
  return scenes.get(level) ?? null;
}

/** Everyone on screen `tick` ticks into `scene`, in draw order. */
export function intermissionPoses(scene: IntermissionScene, tick: number): IntermissionPose[] {
  const poses: IntermissionPose[] = [];
  for (const a of scene.actors) {
    const m = a.moves.find((mv) => tick >= mv.from && tick <= mv.to);
    if (m === undefined) continue;
    const t = m.to === m.from ? 0 : (tick - m.from) / (m.to - m.from);
    const still = m.fromX === m.toX;
    poses.push({
      sprite: a.sprite,
      scale: a.scale,
      frightened: a.frightened,
      x: m.fromX + (m.toX - m.fromX) * t,
      facing: m.facing,
      frame: still ? 0 : Math.trunc(tick / walkFrameTicks) % 4,
    });
  }
  return poses;
}
