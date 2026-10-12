// Port of internal/arcade/update.go, plus the token a cabinet start costs and
// the prize counter (solid, opened with Space while facing it).

import { direction, moving, type Direction, type Input } from "../engine/input.ts";
import { soundMelody } from "../engine/assets.ts";
import { checkCollision, type Rect } from "./collision.ts";
import type { Entity } from "./entity.ts";
import { findMachine, type Machine } from "./machine.ts";
import { blocked, type RunKind, type State } from "./state.ts";

export function update(s: State, i: Input): void {
  applyInput(s, i);
  updatePlayer(s);

  const target = useTarget(s);
  const machine = target !== null && target !== "counter" ? target : null;

  if (machine !== null) {
    if (!s.melodyPlaying) {
      s.imageTitle = machine.title;
      s.melodyPlaying = true;
      soundMelody.play();
    }
  } else {
    if (s.melodyPlaying) {
      s.imageTitle = null;
      s.melodyPlaying = false;
      soundMelody.pause();
      soundMelody.rewind();
    }
  }

  if (machine !== null && i.space) {
    // Go leaves imageTitle set here; only melodyPlaying is cleared (D11).
    s.melodyPlaying = false;
    soundMelody.pause();
    soundMelody.rewind();

    s.loadedRun = startRun(s);
    s.loadedSoftware = machine.newSoftware(s.highScore);
  }

  if (target === "counter" && i.space) {
    s.counterOpened = true;
  }
}

/**
 * What Space would use where the player stands: the cabinet they touch while
 * facing up, the prize counter they face and touch, or nothing. The hub's
 * Space and its use prompt both ask this, so they always agree. The counter
 * stands far below the cabinets, so the player never touches both.
 */
export function useTarget(s: State): Machine | "counter" | null {
  const p = s.player;
  const rect: Rect = { x: p.x - p.width / 2, y: p.y - p.height / 2, w: p.width, h: p.height };
  const machine = findMachine(rect, s.machines);
  if (machine !== null && p.direction === "UP") return machine;
  if (facing(p, s.counter)) return "counter";
  return null;
}

/** The player touches `r` on the side they face: their rect, 1 px further on, overlaps it. */
export function facing(p: Entity, r: Rect): boolean {
  const [x, y] = newPosition(p.x, p.y, p.direction, 1);
  return checkCollision({ x: x - p.width / 2, y: y - p.height / 2, w: p.width, h: p.height }, r);
}

/** A cabinet start: spend a token, or play free when there are none. */
export function startRun(s: State): RunKind {
  if (s.tokens > 0) {
    s.tokens--;
    return "paid";
  }
  return "free";
}

function applyInput(s: State, i: Input): void {
  if (moving(i)) {
    // `direction()` is never "" while moving.
    s.player.direction = direction(i) as Direction;
    s.player.velocity = 1;
    return;
  }

  s.player.velocity = 0;
}

function updatePlayer(s: State): void {
  const [newX, newY] = newPosition(s.player.x, s.player.y, s.player.direction, s.player.velocity);

  const newRect: Rect = {
    x: newX - s.player.width / 2,
    y: newY - s.player.height / 2,
    w: s.player.width,
    h: s.player.height,
  };
  const collides = blocked(s, newRect);

  if (!collides) {
    s.player.x = newX;
    s.player.y = newY;
  }

  s.player.frame = newFrame(s.player.frame, s.player.velocity, s.player.frameIncrement, s.player.frameTotal);
}

export function newPosition(x: number, y: number, dir: Direction, velocity: number): [number, number] {
  let newX = x;
  let newY = y;

  switch (dir) {
    case "UP":
      newY -= velocity;
      break;
    case "DOWN":
      newY += velocity;
      break;
    case "LEFT":
      newX -= velocity;
      break;
    case "RIGHT":
      newX += velocity;
      break;
  }

  return [newX, newY];
}

export function newFrame(currentFrame: number, velocity: number, frameIncrement: number, frameTotal: number): number {
  if (velocity > 0) {
    const frame = currentFrame + frameIncrement;
    return frame % frameTotal; // math.Mod
  }
  return 0;
}
