// Port of internal/hive/update.go.

import * as rng from "../engine/rng.ts";
import { direction, type Direction, type Input } from "../engine/input.ts";
import { framesPerSecond } from "./constants.ts";
import { cabinetJoystickFrame } from "../ui/cabinet.ts";
import { tickBonusEatPopups } from "./bonusEat.ts";
import { syncAndTickHighScoreRollingDials, syncAndTickScoreRollingDials } from "./digitReel.ts";
import {
  dirAxis,
  dirOpposite,
  distance,
  Entity,
  newEnemies,
  newPlayer,
  pointToTile,
  tileEq,
  tileSize,
  tunnelRowY,
  velocityEnemyTunnel,
  type Tile,
} from "./entity.ts";
import type { HiveSoftware } from "./software.ts";

export const distanceThreshold = 0.5;
export const startTicks = framesPerSecond * 2;
export const deathRoundDelayTicks = framesPerSecond * 2;

/** Go `type mode int`; the snapshot carries the raw int. */
export type Mode = 0 | 1;
export const modeScatter: Mode = 0;
export const modeChase: Mode = 1;

export interface ModeConfig {
  readonly mode: Mode;
  readonly ticks: number;
}

export const modeSequence: readonly ModeConfig[] = [
  { mode: modeScatter, ticks: framesPerSecond * 7 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 7 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 5 },
  { mode: modeChase, ticks: framesPerSecond * 20 },
  { mode: modeScatter, ticks: framesPerSecond * 5 },
  { mode: modeChase, ticks: -1 },
];

/**
 * Go `HiveSoftware.Update`. The order is part of the spec: joystick,
 * pelletAnimTick, camera (rand), particles, state machine, popups, dials.
 */
export function update(s: HiveSoftware, i: Input): void {
  s.cabinetJoystickFrame = cabinetJoystickFrame(i);
  s.pelletAnimTick++;
  s.camera.update();
  s.particles.update();
  s.stateMachine.update(i);
  tickBonusEatPopups(s);
  syncAndTickScoreRollingDials(s);
  syncAndTickHighScoreRollingDials(s);
}

export function winner(s: HiveSoftware): boolean {
  for (const item of s.items) {
    if (item !== null) {
      return false;
    }
  }
  return true;
}

export function applyInput(s: HiveSoftware, i: Input): void {
  const newDirection = direction(i);
  const corner = findCorner(s.player, s.corners);
  if (corner === null) {
    let validDirections: Direction[] = [];
    switch (dirAxis(s.player.direction)) {
      case "VERTICAL":
        validDirections = ["UP", "DOWN"];
        break;
      case "HORIZONTAL":
        validDirections = ["LEFT", "RIGHT"];
        break;
    }

    if (newDirection === "" || !validDirections.includes(newDirection)) {
      return;
    }

    s.player.direction = newDirection;
    return;
  }

  if (newDirection === "" || !corner.directions.includes(newDirection)) {
    return;
  }

  if (dirAxis(s.player.direction) !== dirAxis(newDirection)) {
    s.player.x = corner.x;
    s.player.y = corner.y;
  }

  s.player.direction = newDirection;
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
      if (e.flashFrames !== 0) {
        e.flashFrames--;
      } else {
        e.flash = !e.flash;
        e.flashFrames = 5;
      }
    }
  } else {
    e.flashFrames = 0;
    e.flash = false;
  }
}

export function updatePosition(e: Entity, cs: readonly Entity[]): void {
  if (e.dotMinimum > 0) {
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
    // Index is in range: intn(n) < n.
    e.direction = validDirections[rng.intn(validDirections.length)] as Direction;
    e.x = corner.x;
    e.y = corner.y;
    return;
  }

  // Go stores these in a map, but only membership matters: the tie-break is
  // the fixed priority Up, Left, Down, Right.
  const distances = new Map<Direction, number>();

  let minDistance = Number.MAX_VALUE;
  for (const dir of validDirections) {
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
 * Go `HiveSoftware.restartRound`. Leaves camera, particles, items and
 * `modeCurrent` alone (D11).
 */
export function restartRound(s: HiveSoftware): void {
  s.player = newPlayer();
  s.enemies = newEnemies();

  s.modeIndex = 0;
  s.modeTicks = 0;

  s.scaredEatAwardNext = 0;
  s.bonusEatPopups = [];
}

/** Leaves `reverseDirection`, `velocity` and `frame` alone (D11). */
export function resetEnemy(e: Entity): void {
  e.x = tileSize * 14;
  e.y = tileSize * 17.5;
  // intn(2) is 0 or 1, so the lookup is defined.
  e.direction = (["LEFT", "RIGHT"] as const)[rng.intn(2)] as Direction;
  e.blueFrames = 0;
  e.flashFrames = 0;
  e.flash = false;
  e.home = true;
  e.dotMinimum = 0;
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

export function findTarget(e: Entity, enemies: readonly Entity[], player: Entity, mode: Mode): Tile {
  if (mode === modeScatter) {
    return { ...e.target };
  }

  const tilePlayer = pointToTile(player.x, player.y);

  switch (e.kind) {
    case "red":
      return tilePlayer;
    case "pink":
      switch (player.direction) {
        case "UP":
          tilePlayer.y -= 4;
          break;
        case "DOWN":
          tilePlayer.y += 4;
          break;
        case "LEFT":
          tilePlayer.x -= 4;
          break;
        case "RIGHT":
          tilePlayer.x += 4;
          break;
      }
      return tilePlayer;
    case "teal": {
      const enemyRed = getEnemy(enemies, "red");
      if (enemyRed === null) {
        // Go dereferences a nil pointer here; unreachable (red always exists).
        throw new Error("runtime error: invalid memory address or nil pointer dereference");
      }
      const tileRed = pointToTile(enemyRed.x, enemyRed.y);

      switch (player.direction) {
        case "UP":
          tilePlayer.y -= 2;
          break;
        case "DOWN":
          tilePlayer.y += 2;
          break;
        case "LEFT":
          tilePlayer.x -= 2;
          break;
        case "RIGHT":
          tilePlayer.x += 2;
          break;
      }

      const dx = tilePlayer.x - tileRed.x;
      const dy = tilePlayer.y - tileRed.y;

      tilePlayer.x += dx;
      tilePlayer.y += dy;

      return tilePlayer;
    }
    case "orange": {
      const d = distance(pointToTile(e.x, e.y), tilePlayer);
      if (d < 8) {
        return { ...e.target };
      }
      return tilePlayer;
    }
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
