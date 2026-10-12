// Port of internal/firefly/game.go.

import {
  imageBug,
  imageBullet,
  imageCabinetFirefly,
  imageExplosion,
  imageGalaxy,
  imageShip,
  soundBoom,
  soundLaser,
} from "../engine/assets.ts";
import { sub as cutImage, type Sprite } from "../engine/image.ts";
import { direction, type Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import type { FireflySnapshot } from "../game/snapshot.ts";
import type { FixedViewport } from "../game/software.ts";
import {
  cabinetHeight,
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetJoystickFrame,
  cabinetWidth,
  drawCabinet,
} from "../ui/cabinet.ts";
import { drawBezierDebug } from "./debug.ts";
import { FRAMES_PER_SECOND, newBezierPatternFunc, type BezierConfig, type PatternFunc } from "./pattern.ts";

export const debug = false;

export const tileSize = 8;
export const tileWidth = 28;
export const tileHeight = 36;

export const leftBezierConfig: BezierConfig = {
  p0: { x: tileSize * 16, y: tileSize * 1 },
  p1: { x: tileSize * -14, y: tileSize * 24 },
  p2: { x: tileSize * 14, y: tileSize * 36 },
  p3: { x: tileSize * 14, y: tileSize * 12 },
};

export const rightBezierConfig: BezierConfig = {
  p0: { x: tileSize * 12, y: tileSize * 1 },
  p1: { x: tileSize * 42, y: tileSize * 24 },
  p2: { x: tileSize * 14, y: tileSize * 36 },
  p3: { x: tileSize * 14, y: tileSize * 12 },
};

/** Go `vec` (a value type: always build a new one, never mutate a shared one). */
export interface Vec {
  x: number;
  y: number;
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Which bezier a bug follows; Go compares nothing, the snapshot needs a name. */
export type PatternName = "L" | "R";

/** Go `entity`. Fields keep their Go zero values unless a constructor sets them. */
export interface Entity {
  image: Sprite;
  position: Vec;
  previousPosition: Vec;
  direction: Vec;
  width: number;
  height: number;
  dead: boolean;
  deadFrames: number;
  pattern: PatternFunc | null;
  /** TS only: identifies `pattern` for the snapshot. */
  patternName: PatternName | null;
  duration: number;
  durationStep: number;
}

function newEntity(image: Sprite): Entity {
  return {
    image,
    position: { x: 0, y: 0 },
    previousPosition: { x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    width: 0,
    height: 0,
    dead: false,
    deadFrames: 0,
    pattern: null,
    patternName: null,
    duration: 0,
    durationStep: 0,
  };
}

function newPlayer(): Entity {
  return {
    ...newEntity(imageShip),
    position: { x: (tileSize * tileWidth) / 2, y: tileSize * tileHeight - tileSize * 3 },
    direction: { x: 2.0, y: 0 },
    width: tileSize * 2,
    height: tileSize * 2,
  };
}

function newBug(pattern: PatternFunc, patternName: PatternName, initialDuration: number, durationStep: number): Entity {
  return {
    ...newEntity(imageBug),
    width: tileSize * 2,
    height: tileSize * 2,
    pattern,
    patternName,
    duration: initialDuration,
    durationStep,
  };
}

/** Go `1.0 / (FRAMES_PER_SECOND * 3)`, a constant expression (exactly 1/180 rounded once). */
export const durationStep = 1.0 / (FRAMES_PER_SECOND * 3);

function newBugs(): Entity[] {
  // Runtime float64 arithmetic in Go (durationStep is a typed variable there),
  // evaluated left to right: ((-durationStep) * 60) * k. The first of each
  // side is -0, which is not < 0, so it starts flying on the first update.
  const leftPatternFunc = newBezierPatternFunc(leftBezierConfig);
  const rightPatternFunc = newBezierPatternFunc(rightBezierConfig);

  return [
    newBug(leftPatternFunc, "L", -durationStep * FRAMES_PER_SECOND * 0, durationStep),
    newBug(leftPatternFunc, "L", -durationStep * FRAMES_PER_SECOND * 0.2, durationStep),
    newBug(leftPatternFunc, "L", -durationStep * FRAMES_PER_SECOND * 0.4, durationStep),
    newBug(leftPatternFunc, "L", -durationStep * FRAMES_PER_SECOND * 0.6, durationStep),
    newBug(leftPatternFunc, "L", -durationStep * FRAMES_PER_SECOND * 0.8, durationStep),

    newBug(rightPatternFunc, "R", -durationStep * FRAMES_PER_SECOND * 0, durationStep),
    newBug(rightPatternFunc, "R", -durationStep * FRAMES_PER_SECOND * 0.2, durationStep),
    newBug(rightPatternFunc, "R", -durationStep * FRAMES_PER_SECOND * 0.4, durationStep),
    newBug(rightPatternFunc, "R", -durationStep * FRAMES_PER_SECOND * 0.6, durationStep),
    newBug(rightPatternFunc, "R", -durationStep * FRAMES_PER_SECOND * 0.8, durationStep),
  ];
}

/**
 * Go `FireFlySoftware`, played inside its cabinet (#15). Fields are public so
 * tests can stage states, as Go's in-package tests could.
 */
export class FireflySoftware implements FixedViewport {
  readonly name = "firefly" as const;

  /** The bezel's joystick frame for the last input (no gameplay effect). */
  cabinetJoystickFrame = 0;

  player: Entity = newPlayer();
  bullets: Entity[] = [];
  bugs: Entity[] = newBugs();
  fireDelay = 0;

  update(i: Input): void {
    this.cabinetJoystickFrame = cabinetJoystickFrame(i);

    if (this.bugs.length === 0) {
      this.bugs = newBugs();
    }

    if (i.space) {
      if (this.fireDelay <= 0) {
        this.bullets.push({
          ...newEntity(imageBullet),
          position: add(this.player.position, { x: -tileSize / 2, y: -tileSize }),
          direction: { x: 0, y: -5.0 },
        });
        this.fireDelay = 20;

        soundLaser.rewind();
        soundLaser.play();
      }
    }

    if (this.fireDelay > 0) {
      this.fireDelay--;
    }

    // Uses the Up, Down, Left, Right priority: holding Up or Down masks Left/Right.
    let newPosition = this.player.position;
    switch (direction(i)) {
      case "LEFT":
        newPosition = sub(newPosition, this.player.direction);
        break;
      case "RIGHT":
        newPosition = add(newPosition, this.player.direction);
        break;
    }
    newPosition = { ...newPosition };

    if (newPosition.x < this.player.width / 2) {
      newPosition.x = this.player.width / 2;
    }
    if (newPosition.x > tileSize * tileWidth - this.player.width / 2 + 1) {
      newPosition.x = tileSize * tileWidth - this.player.width / 2 + 1;
    }

    this.player.position = newPosition;

    for (const bullet of this.bullets) {
      bullet.position = add(bullet.position, bullet.direction);
      // Bullets are 0×0, so this is y <= 0.
      if (bullet.position.y <= bullet.height / 2) {
        bullet.dead = true;
      }
    }

    // Dead bullets (just flown off the top) still collide this tick, and bugs
    // that have not spawned yet (sitting at 0,0) are fair game: only
    // DeadFrames is checked.
    for (const bullet of this.bullets) {
      for (const bug of this.bugs) {
        if (bug.deadFrames > 0) {
          continue;
        }

        if (collide(bullet.position, bug.position)) {
          bullet.dead = true;
          bug.deadFrames = 75;

          soundBoom.rewind();
          soundBoom.play();

          break; // only one bug per bullet
        }
      }
    }

    this.bullets = this.bullets.filter((b) => !b.dead);

    for (const bug of this.bugs) {
      if (bug.deadFrames > 0) {
        bug.deadFrames--;
        if (bug.deadFrames === 0) {
          bug.dead = true;
        }
        continue;
      }

      if (bug.duration < 0) {
        bug.duration += bug.durationStep;
        continue;
      }

      bug.previousPosition = bug.position;
      if (bug.duration > 1) {
        bug.position = sub(bug.position, { x: 0, y: 2.5 });
      } else {
        // Every bug is built with a pattern; only the player has none.
        if (bug.pattern === null) throw new Error("bug without pattern");
        bug.position = bug.pattern(bug.duration);
        bug.duration += bug.durationStep;
      }

      bug.direction = sub(bug.position, bug.previousPosition);

      if (bug.position.y < 0) {
        bug.dead = true;
      }
    }

    // Removed at the end of the tick: one snapshot can show `bugs: []` before
    // the next update respawns the wave.
    this.bugs = this.bugs.filter((b) => !b.dead);
  }

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  /** A `FixedViewport`: `buffer` is 0; the 224x288 playfield fills the cabinet's screen. */
  draw(screen: Surface, _buffer: number): void {
    drawCabinet(screen, this.cabinetJoystickFrame, imageCabinetFirefly);

    const origin: Vec = { x: cabinetInsetLeft, y: cabinetInsetTop };
    drawImage(screen, this.background(), origin);

    if (debug) {
      drawBezierDebug(screen, leftBezierConfig, origin, 100);
      drawBezierDebug(screen, rightBezierConfig, origin, 100);
    }

    let position = add(this.player.position, origin);
    position = sub(position, { x: this.player.width / 2, y: this.player.height / 2 });
    drawImage(screen, this.player.image, position);

    for (const bullet of this.bullets) {
      let p = add(bullet.position, origin);
      p = sub(p, { x: bullet.width / 2, y: bullet.height / 2 });
      drawImage(screen, bullet.image, p);
    }

    for (const bug of this.bugs) {
      // Culled outside (0, 224) × (0, 288), bounds exclusive.
      if (
        bug.position.x <= 0 ||
        bug.position.x >= tileSize * tileWidth ||
        bug.position.y <= 0 ||
        bug.position.y >= tileSize * tileHeight
      ) {
        continue;
      }

      let p = add(bug.position, origin);

      if (bug.deadFrames > 0) {
        p = sub(p, { x: 16, y: 16 });

        // deadFrames 75 is decremented on the tick it is set, so column 0 is
        // never shown; for deadFrames 1..14 column 5 is off the 5-column
        // sheet and the sub-image is empty (nothing drawn), as in Go.
        const col = 5 - Math.trunc(bug.deadFrames / 15);
        const img = cutImage(imageExplosion, Math.trunc(col * 32), 0, Math.trunc((col + 1) * 32), 32);
        drawImage(screen, img, p);
        continue;
      }

      p = sub(p, { x: bug.width / 2, y: bug.height / 2 });

      const [row, col] = frameAngle(angle(bug.direction));
      const img = cutImage(
        bug.image,
        Math.trunc(col * bug.width),
        Math.trunc(row * bug.height),
        Math.trunc((col + 1) * bug.width),
        Math.trunc((row + 1) * bug.height),
      );
      drawImage(screen, img, p);
    }
  }

  gameOver(): boolean {
    return false;
  }

  score(): number {
    return 0;
  }

  background(): Sprite {
    return imageGalaxy;
  }

  snapshot(): FireflySnapshot {
    return {
      player: { x: this.player.position.x, y: this.player.position.y },
      fireDelay: this.fireDelay,
      bullets: this.bullets.map((b) => ({ x: b.position.x, y: b.position.y })),
      bugs: this.bugs.map((b) => {
        // Every bug is built with a pattern name.
        if (b.patternName === null) throw new Error("bug without pattern");
        return {
          pattern: b.patternName,
          x: b.position.x,
          y: b.position.y,
          dx: b.direction.x,
          dy: b.direction.y,
          duration: b.duration,
          deadFrames: b.deadFrames,
        };
      }),
      joystick: this.cabinetJoystickFrame,
    };
  }
}

/** Go `NewFireFlySoftware()`. */
export function newFireflySoftware(): FireflySoftware {
  return new FireflySoftware();
}

/** Both axes strictly closer than one tile. */
export function collide(a: Vec, b: Vec): boolean {
  return Math.abs(a.x - b.x) < tileSize && Math.abs(a.y - b.y) < tileSize;
}

/**
 * Go untyped constant `180 / math.Pi`, folded exactly at compile time and
 * rounded once (§6). Equals JS `180 / Math.PI` today; unit-tested.
 */
export const radToDeg = 57.29577951308232;

/** Sprite-sheet row (per 90°) and column (per 15°) for an angle in degrees. */
export function frameAngle(angle: number): [row: number, col: number] {
  const row = Math.trunc(angle / 90);
  const col = Math.trunc((angle % 90) / 15);
  return [row, col];
}

/** Heading in degrees clockwise from up, in [0, 360). Draw-only (fact 3). */
export function angle(direction: Vec): number {
  if (direction.x === 0 && direction.y === 0) {
    return 0;
  }

  let a = Math.atan2(direction.y, direction.x) * radToDeg;
  a += 90;

  if (a < 0) {
    a += 360;
  }

  return a;
}

function drawImage(screen: Surface, img: Sprite, position: Vec): void {
  screen.draw(img, position.x, position.y);
}
