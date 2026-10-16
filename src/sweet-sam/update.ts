// Port of the Go Sweet Sam minigame's update.go (docs/port-notes.md gives its old Go name).

import { afterDeath, newRelease, waitingInHome } from "./release.ts";
import * as rng from "../engine/rng.ts";
import { direction, type Direction, type Input } from "../engine/input.ts";
import { framesPerSecond } from "./constants.ts";
import { levelValues, modeScatter, type Mode } from "./levels.ts";
import { tickBonusEatPopups, tickFlowerPopup } from "./bonusEat.ts";
import { syncAndTickHighScoreRollingDials, syncAndTickScoreRollingDials } from "./digitReel.ts";
import {
  dirAxis,
  dirOpposite,
  distance,
  Entity,
  newEnemies,
  newPlayer,
  noUpTiles,
  pointToTile,
  tileEq,
  tileSize,
  tunnelRowY,
  velocityEnemyTunnel,
  type Tile,
} from "./entity.ts";
import type { SweetSamSoftware } from "./software.ts";

export const distanceThreshold = 0.5;
export const startTicks = framesPerSecond * 2;
export const deathRoundDelayTicks = framesPerSecond * 2;

/** Ticks each of the bear's death frames shows; the last (the puddle) holds until the wait ends. */
export const deathFrameTicks = 24;
/** The bear's death frames: dazed, sinking, flat, puddle (bear.png's last row). */
export const deathFrameCount = 4;

/** The death frame `elapsed` ticks into the death wait. */
export function deathFrameAt(elapsed: number): number {
  return Math.min(deathFrameCount - 1, Math.trunc(elapsed / deathFrameTicks));
}

/**
 * Go `Update`. The order is part of the spec (Go's joystick step drew only
 * the cabinet's joystick, gone since #113): pelletAnimTick, camera (rand), particles, state machine, popups, dials.
 */
export function update(s: SweetSamSoftware, i: Input): void {
  s.pelletAnimTick++;
  s.camera.update();
  s.particles.update();
  s.stateMachine.update(i);
  tickBonusEatPopups(s);
  tickFlowerPopup(s);
  syncAndTickScoreRollingDials(s);
  syncAndTickHighScoreRollingDials(s);
}

export function winner(s: SweetSamSoftware): boolean {
  for (const item of s.items) {
    if (item !== null) {
      return false;
    }
  }
  return true;
}

export function applyInput(s: SweetSamSoftware, i: Input): void {
  steer(s.player, s.corners, direction(i));
}

/** Pac-Man pre-turns from 4 px before a junction's centre to 3 px after it (Dossier, "Cornering"). */
export const corneringBefore = 4;
export const corneringAfter = 3;

/**
 * The bear's input for one tick. A reversal applies at once; a perpendicular
 * turn waits, even after the key is released, until the bear is inside a
 * junction's cornering window, and is forgotten when it leaves that window.
 */
export function steer(e: Entity, cs: readonly Entity[], held: Direction | ""): void {
  if (held !== "") {
    e.turn = held;
  }
  const want = e.turn;
  if (want === "" || want === e.direction) {
    e.turn = "";
    return;
  }

  if (e.direction === "" || dirAxis(e.direction) === dirAxis(want)) {
    const corner = findCorner(e, cs);
    if (corner === null || corner.directions.includes(want)) {
      e.direction = want;
    }
    e.turn = "";
    return;
  }

  const corner = cornerWindow(e, cs);
  if (corner === null) {
    if (e.inWindow) {
      e.turn = "";
    }
    e.inWindow = false;
    return;
  }
  e.inWindow = true;
  if (!corner.directions.includes(want)) {
    return;
  }

  e.direction = want;
  e.turn = "";
  e.inWindow = false;
  e.cornering = corner;
}

/** The junction on the bear's line whose cornering window it is in, if any. */
function cornerWindow(e: Entity, cs: readonly Entity[]): Entity | null {
  const [dx, dy] = dirSteps[e.direction];
  for (const c of cs) {
    const ahead = (c.x - e.x) * dx + (c.y - e.y) * dy;
    const across = (c.x - e.x) * dy + (c.y - e.y) * dx;
    if (Math.abs(across) <= distanceThreshold && ahead <= corneringBefore && ahead >= -corneringAfter) {
      return c;
    }
  }
  return null;
}

const dirSteps: Record<Direction | "", [number, number]> = {
  UP: [0, -1],
  DOWN: [0, 1],
  LEFT: [-1, 0],
  RIGHT: [1, 0],
  "": [0, 0],
};

/** Moves `e` toward the centre line of the junction it is cornering round. */
function closeCorner(e: Entity): void {
  const c = e.cornering;
  if (c === null) {
    return;
  }
  if (dirAxis(e.direction) === "VERTICAL") {
    e.x += Math.max(-e.velocity, Math.min(e.velocity, c.x - e.x));
    if (e.x === c.x) e.cornering = null;
  } else {
    e.y += Math.max(-e.velocity, Math.min(e.velocity, c.y - e.y));
    if (e.y === c.y) e.cornering = null;
  }
}

export function updateFrame(e: Entity): void {
  if (e.velocity > 0) {
    e.frame += e.frameIncrement;
    e.frame = e.frame % e.frameTotal; // math.Mod
  } else {
    e.frame = 0;
  }
}

export function updateBlue(e: Entity): void {
  if (e.blueFrames > 0) {
    e.blueFrames--;
    if (e.blueFrames <= framesPerSecond * 2) {
      if (e.flashFrames === 0) {
        e.flash = !e.flash;
        e.flashFrames = 5;
      } else {
        e.flashFrames--;
      }
    }
  } else {
    e.flashFrames = 0;
    e.flash = false;
  }
}

export function updatePosition(e: Entity, cs: readonly Entity[]): void {
  if (waitingInHome(e)) {
    return;
  }

  if (e.home) {
    if (e.x < tileSize * 14) {
      e.x += velocityEnemyTunnel;
      return;
    }

    if (e.x > tileSize * 14) {
      e.x -= velocityEnemyTunnel;
      return;
    }

    if (e.y > tileSize * 14.5) {
      e.y -= velocityEnemyTunnel;
      return;
    }

    e.home = false;
  }

  let validDirections: readonly (Direction | "")[] = [e.direction];

  const corner = findCorner(e, cs);
  if (corner !== null) {
    validDirections = corner.directions;
  }

  closeCorner(e);

  if (validDirections.includes(e.direction)) {
    switch (e.direction) {
      case "UP":
        e.y -= e.velocity;
        break;
      case "DOWN":
        e.y += e.velocity;
        break;
      case "LEFT":
        e.x -= e.velocity;
        break;
      case "RIGHT":
        e.x += e.velocity;
        break;
      case "":
        break;
    }
  }

  if (e.y === tunnelRowY) {
    if (e.x <= 0) {
      e.x = 8 * 28;
    } else if (e.x >= 8 * 28) {
      e.x = 0;
    }
  }
}

export function updateDirection(e: Entity, cs: readonly Entity[], target: Tile): void {
  const tileCurrent = pointToTile(e.x, e.y);
  // Go compares tile structs by value (update.go:176).
  if (e.reverseDirection && !tileEq(tileCurrent, e.reverseTile)) {
    e.reverseDirection = false;
    e.direction = dirOpposite(e.direction);
    return;
  }

  const corner = findCorner(e, cs);
  if (corner === null) {
    return;
  }

  const tileCorner = pointToTile(corner.x, corner.y);

  const back = dirOpposite(e.direction);
  const validDirections = corner.directions.filter((d) => d !== back);

  if (validDirections.length === 0) {
    throw new Error(`no valid directions for enemy at (${e.x}, ${e.y})`);
  }

  if (e.blueFrames > 0) {
    const picked = validDirections[rng.intn(validDirections.length)];
    if (picked === undefined) {
      throw new Error("sweetSam: rng.intn returned an index out of range");
    }
    e.direction = picked;
    e.x = corner.x;
    e.y = corner.y;
    return;
  }

  // None of these junctions opens downward, so no bee arrives heading up.
  const choices =
    !e.eyes && noUpTiles.some((t) => tileEq(t, tileCorner))
      ? validDirections.filter((d) => d !== "UP")
      : validDirections;

  // Go stores these in a map, but only membership matters: the tie-break is
  // the fixed priority Up, Left, Down, Right.
  const distances = new Map<Direction, number>();

  let minDistance = Number.MAX_VALUE;
  for (const dir of choices) {
    const tileNext = { ...tileCorner };
    switch (dir) {
      case "UP":
        tileNext.y--;
        break;
      case "DOWN":
        tileNext.y++;
        break;
      case "LEFT":
        tileNext.x--;
        break;
      case "RIGHT":
        tileNext.x++;
        break;
    }

    const d = distance(tileNext, target);
    if (d < minDistance) {
      minDistance = d;
    }
    distances.set(dir, d);
  }

  const minDirections: Direction[] = [];
  for (const [dir, d] of distances) {
    if (d === minDistance) {
      minDirections.push(dir);
    }
  }

  if (minDirections.includes("UP")) {
    e.direction = "UP";
  } else if (minDirections.includes("LEFT")) {
    e.direction = "LEFT";
  } else if (minDirections.includes("DOWN")) {
    e.direction = "DOWN";
  } else if (minDirections.includes("RIGHT")) {
    e.direction = "RIGHT";
  }

  e.x = corner.x;
  e.y = corner.y;
}

/**
 * Go `restartRound` for a new level: the bees start on the level's personal
 * counters. Leaves camera, particles, items and `modeCurrent` alone (D11).
 */
export function restartRound(s: SweetSamSoftware): void {
  s.release = newRelease();
  s.enemies = newEnemies(levelValues(s.level).dotMinimums);
  resetRound(s);
}

/**
 * Go `restartRound` after a lost life: the bees keep their personal counters
 * and wait on the global one (release.ts).
 */
export function restartAfterDeath(s: SweetSamSoftware): void {
  s.enemies = afterDeath(s.release, s.enemies);
  resetRound(s);
}

function resetRound(s: SweetSamSoftware): void {
  s.player = newPlayer();
  s.modeIndex = 0;
  s.modeTicks = 0;

  s.scaredEatAwardNext = 0;
  s.bonusEatPopups = [];
  s.flowerTicks = 0;
}

/** Leaves `reverseDirection`, `velocity` and `frame` alone (D11). */
export function resetEnemy(e: Entity): void {
  e.x = tileSize * 14;
  e.y = tileSize * 17.5;
  const dir = (["LEFT", "RIGHT"] as const)[rng.intn(2)];
  if (dir === undefined) {
    throw new Error("sweetSam: rng.intn(2) returned an index out of range");
  }
  e.direction = dir;
  e.blueFrames = 0;
  e.flashFrames = 0;
  e.flash = false;
  e.home = true;
  e.dotMinimum = 0;
  e.held = false;
  e.eyes = false;
}

/** An eaten bee: its eyes stay where it was eaten, awake, and fly home from there. */
export function becomeEyes(e: Entity): void {
  e.eyes = true;
  e.blueFrames = 0;
  e.flashFrames = 0;
  e.flash = false;
  e.reverseDirection = false;
}

/** Where the eyes enter the home: the spot above its door, where bees leave it. */
const doorX = tileSize * 14;
const doorY = tileSize * 14.5;
/** Where the eyes revive: the middle of the home. */
const homeY = tileSize * 17.5;
const doorTile = pointToTile(doorX, doorY);

/** 1 px steps, so the eyes never skip past a junction. */
const eyesPixelsPerStep = 1;
/** Steps per tick: 2 px per tick. */
export const eyesStepsPerTick = 2;

/**
 * The eyes' move for one tick: toward the tile above the home door, choosing
 * at each junction like a bee, then down through the door; in the home the
 * bee revives (Dossier, "Frightened" and "Ghost House").
 */
export function moveEyes(e: Entity, cs: readonly Entity[]): void {
  e.velocity = eyesPixelsPerStep;
  for (let k = 0; k < eyesStepsPerTick; k++) {
    if (e.x === doorX && e.y >= doorY && e.y < homeY) {
      e.direction = "DOWN";
      e.y += eyesPixelsPerStep;
      if (e.y >= homeY) {
        resetEnemy(e);
        return;
      }
      continue;
    }
    if (e.y === doorY && Math.abs(e.x - doorX) <= distanceThreshold) {
      e.x += Math.sign(doorX - e.x) * eyesPixelsPerStep;
      continue;
    }
    updateDirection(e, cs, doorTile);
    updatePosition(e, cs);
  }
}

export function findCorner(e: Entity, cs: readonly Entity[]): Entity | null {
  for (const c of cs) {
    if (collideWithDistance(c, e, distanceThreshold)) {
      return c;
    }
  }
  return null;
}

export function collideWithDistance(a: Entity, b: Entity, dist: number): boolean {
  return Math.abs(a.x - b.x) <= dist && Math.abs(a.y - b.y) <= dist;
}

/** `n` tiles ahead of `tile` along `dir`; facing up also shifts left, as Pac-Man's overflow bug does. */
export function tilesAhead(tile: Tile, dir: Direction | "", n: number): Tile {
  switch (dir) {
    case "UP":
      return { x: tile.x - n, y: tile.y - n };
    case "DOWN":
      return { x: tile.x, y: tile.y + n };
    case "LEFT":
      return { x: tile.x - n, y: tile.y };
    case "RIGHT":
      return { x: tile.x + n, y: tile.y };
    case "":
      break;
  }
  return { ...tile };
}

/** In Cruise Elroy (`elroy`), red chases the player during scatter too. */
export function findTarget(e: Entity, enemies: readonly Entity[], player: Entity, mode: Mode, elroy = false): Tile {
  if (mode === modeScatter && !(elroy && e.kind === "red")) {
    return { ...e.target };
  }

  const tilePlayer = pointToTile(player.x, player.y);

  switch (e.kind) {
    case "red":
      return tilePlayer;
    case "pink":
      return tilesAhead(tilePlayer, player.direction, 4);
    case "teal": {
      const enemyRed = getEnemy(enemies, "red");
      if (enemyRed === null) {
        // Go dereferences a nil pointer here; unreachable (red always exists).
        throw new Error("runtime error: invalid memory address or nil pointer dereference");
      }
      const tileRed = pointToTile(enemyRed.x, enemyRed.y);

      const pivot = tilesAhead(tilePlayer, player.direction, 2);

      return { x: pivot.x * 2 - tileRed.x, y: pivot.y * 2 - tileRed.y };
    }
    case "orange": {
      const d = distance(pointToTile(e.x, e.y), tilePlayer);
      if (d < 8) {
        return { ...e.target };
      }
      return tilePlayer;
    }
    case null:
      break;
  }

  throw new Error(`unknown color: ${String(e.kind)}`);
}

export function getEnemy(es: readonly Entity[], kind: Entity["kind"]): Entity | null {
  for (const enemy of es) {
    if (enemy.kind === kind) {
      return enemy;
    }
  }
  return null;
}
