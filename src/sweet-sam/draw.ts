// Port of the Go Sweet Sam minigame's draw.go (docs/port-notes.md gives its old
// Go name). Draw paths only: nothing here mutates game state (fact 2), and all
// DOM work (offscreen surfaces) happens lazily here (D12).

import { sub, type Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import {
  imageBear,
  imageBearSmoked,
  imageCabinet,
  imageBeeEyes,
  imageIntermission,
  imageFlower,
  imageReady,
  imageSweetSamMaze,
  imageSweetSamMazeFlash,
} from "../engine/assets.ts";
import { goRound } from "../engine/gomath.ts";
import { cabinetInsetLeft, cabinetInsetTop, drawOnScreen } from "../ui/cabinet.ts";
import { drawBonusEatIndicators } from "./bonusEat.ts";
import { drawTextCentered, textHeight } from "../ui/text.ts";
import { flowerKind, flowerX, flowerY } from "./flower.ts";
import { stateIDLevelClear } from "./state.ts";
import { intermissionY, type IntermissionPose } from "./intermission.ts";
import {
  bearDeathRow,
  beeEyesOrder,
  frameSize,
  itemCellHeight,
  itemCellWidth,
  mazeHeight,
  mazeWidth,
  propCellHeight,
  propCellWidth,
  tearCellWidth,
} from "./art.ts";
import {
  beeRows,
  bearRows,
  beeSheet,
  frightenedRowOffset,
  pelletAnimFrameCount,
  pelletAnimHoldTicks,
  pointToTile,
  tileSize,
  type Entity,
  type Tile,
} from "./entity.ts";
import { findTarget, startTicks } from "./update.ts";
import type { LevelView } from "./level.ts";
import type { CameraSystem } from "./camera.ts";
import type { ParticleSystem } from "./particle.ts";
import type { ScoreDials } from "../ui/dials.ts";

/** What a frame shows: the Level, read through its queries, and the software's camera, particles and dials. */
export interface SweetSamScene {
  readonly level: LevelView;
  readonly camera: CameraSystem;
  readonly particles: ParticleSystem;
  readonly dials: ScoreDials;
}

const debug = false;

/** Go `Draw`; the order is exactly Go's. The cabinet is drawn unshaken. */
export function draw(s: SweetSamScene, screen: Surface): void {
  screen.draw(imageCabinet, 0, 0);
  drawOnScreen(screen, () => {
    drawScreen(s, screen);
  });
}

/** Everything inside the cabinet's screen, shaken by the camera. */
function drawScreen(s: SweetSamScene, screen: Surface): void {
  const [ox, oy] = s.camera.cameraOffset();
  const bufX = cabinetInsetLeft + ox;
  const bufY = cabinetInsetTop + oy;
  const l = s.level;
  if (l.intermission() !== null) {
    drawIntermission(s, screen, bufX, bufY);
    return;
  }
  drawBackground(l, screen, bufX, bufY);
  s.dials.draw(screen, bufX, bufY);
  drawLives(l, screen, bufX, bufY);
  drawLevel(l, screen, bufX, bufY);
  drawReady(l, screen, bufX, bufY);
  drawItems(l, screen, bufX, bufY);
  drawFlower(l, screen, bufX, bufY);
  drawPlayer(l, screen, bufX, bufY);
  drawTiles(l, screen, bufX, bufY, debug);
  drawLines(l, screen, bufX, bufY, debug);
  drawEnemies(l, screen, bufX, bufY);
  drawBonusEatIndicators(l.popups(), screen, bufX, bufY);
  drawFlowerPopup(l, screen, bufX, bufY);
  s.particles.draw(screen, bufX, bufY);
  drawMode(l, screen, bufX, bufY, debug);
}

/** A cutscene (#160): its actors over a black screen, under the score and lives. */
function drawIntermission(s: SweetSamScene, screen: Surface, bufX: number, bufY: number): void {
  const l = s.level;
  const poses = l.intermissionPoses();
  if (poses === null) return;
  screen.fillRect(bufX, bufY, mazeWidth, mazeHeight, "black");
  s.dials.draw(screen, bufX, bufY);
  drawLevel(l, screen, bufX, bufY);
  screen.clipped(bufX, bufY, mazeWidth, mazeHeight, () => {
    for (const pose of poses) {
      drawPose(pose, screen, bufX, bufY);
    }
  });
}

function drawPose(p: IntermissionPose, screen: Surface, bufX: number, bufY: number): void {
  const y = intermissionY + p.y;
  if (p.sprite === "tornBee") {
    // intermission.png's tear frames: the bee at the cell's front end, anything wider behind it.
    const sx = imageIntermission.sx + tearCellWidth * p.frame;
    const sy = imageIntermission.sy + (p.facing === "LEFT" ? frameSize : 0);
    const left = p.facing === "LEFT" ? p.x - frameSize / 2 : p.x + frameSize / 2 - tearCellWidth;
    screen.draw(
      sub(imageIntermission, sx, sy, sx + tearCellWidth, sy + frameSize),
      left + bufX,
      y - frameSize / 2 + bufY,
    );
    return;
  }
  if (p.sprite === "wing" || p.sprite === "dust" || p.sprite === "nail") {
    // A prop stands on its cell's bottom edge: the floor, `frameSize / 2` below its y.
    const sx = imageIntermission.sx + propCellWidth * p.frame;
    const sy = imageIntermission.sy + 2 * frameSize;
    const frame = sub(imageIntermission, sx, sy, sx + propCellWidth, sy + propCellHeight);
    screen.draw(frame, p.x - propCellWidth / 2 + bufX, y + frameSize / 2 - propCellHeight + bufY);
    return;
  }
  const sheet = p.sprite === "bear" ? imageBear : beeSheet("red");
  const row = p.sprite === "bear" ? bearRows[p.facing] : beeRows[p.facing] + (p.frightened ? frightenedRowOffset : 0);
  const sx = sheet.sx + frameSize * p.frame;
  const sy = sheet.sy + frameSize * row;
  const frame = sub(sheet, sx, sy, sx + frameSize, sy + frameSize);
  const half = (frameSize * p.scale) / 2;
  screen.draw(frame, p.x - half + bufX, y - half + bufY, { scale: p.scale });
}

function drawBackground(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  screen.draw(l.mazeFlash() ? imageSweetSamMazeFlash : imageSweetSamMaze, bufX, bufY);
}

function drawLives(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  for (let i = 0; i < l.lives() - 1; i++) {
    // The first frame of bear.png: the bear facing down, standing.
    const spriteFrame = sub(imageBear, 0, 0, frameSize, frameSize);

    screen.draw(spriteFrame, 8 * (2 + i * 2) + bufX, 8 * 34 + 1 + bufY);
  }
}

/** The level counter: the flowers of the last `levelCounterLength` levels at the bottom right, their bottom pixels on the screen's bottom row, the current level's rightmost (Pac-Man's fruit row). */
export const levelCounterRight = 8 * 26;
export const levelCounterLength = 7;

/** The bonus flower for `level`: its kind's frame of flower.png. */
export function flowerSprite(level: number): Sprite {
  const x = flowerKind(level) * frameSize;
  return sub(imageFlower, x, 0, x + frameSize, frameSize);
}

function drawLevel(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  const first = Math.max(1, l.levelNumber() - levelCounterLength + 1);
  for (let level = first; level <= l.levelNumber(); level++) {
    const x = levelCounterRight - (l.levelNumber() - level + 1) * frameSize;
    screen.draw(flowerSprite(level), x + bufX, mazeHeight - frameSize + bufY);
  }
}

/** Where READY! stands: centred under the bee home. */
const readyCentreX = 8 * 14;
const readyTop = 8 * 20 + 1;

function drawFlower(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  if (!l.flowerShowing()) return;
  screen.draw(flowerSprite(l.levelNumber()), flowerX - frameSize / 2 + bufX, flowerY - frameSize / 2 + bufY);
}

/** An eaten flower's points, in the pixel font where it stood. */
function drawFlowerPopup(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  const popup = l.flowerPopup();
  if (popup === null) return;
  drawTextCentered(screen, String(popup.points), flowerX + bufX, flowerY - Math.trunc(textHeight / 2) + bufY, "white");
}

/** ImageReady ("READY!") strips: 48×8 → six 8×8 glyphs. */
export const readyGlyphWidth = 8;

export const readyWaveAmpPx = 2.0;
/** Sine advance per elapsed START frame. */
export const readyWaveTimeRad = 0.14;
/** Phase step between adjacent glyphs (radians). */
export const readyWaveGlyphPhaseRad = 1.05;

function drawReady(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  if (l.startTicks() <= 0) {
    return;
  }

  const img = imageReady;
  const count = Math.trunc(img.w / readyGlyphWidth);
  if (count <= 0) {
    return;
  }

  const baseX = readyCentreX - Math.trunc((count * readyGlyphWidth) / 2) + bufX;
  const baseY = readyTop + bufY;

  // startTicks counts down during START; more elapsed ⇒ larger phase progression.
  const intoReady = startTicks - l.startTicks();

  for (let i = 0; i < count; i++) {
    const rx = i * readyGlyphWidth;
    const glyph = sub(img, rx, 0, rx + readyGlyphWidth, img.h);

    // Traveling wave along the string (vertical offset only). No rounding; D13 snapping applies.
    const dy = readyWaveAmpPx * Math.sin(intoReady * readyWaveTimeRad + i * readyWaveGlyphPhaseRad);

    screen.draw(glyph, baseX + rx, baseY + dy);
  }
}

function drawItems(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  const pelletFrame = Math.trunc(l.pelletAnimTick() / pelletAnimHoldTicks) % pelletAnimFrameCount;
  for (const item of l.items()) {
    if (item === null) {
      continue;
    }

    if (item.isFood) {
      drawFoodAtlas(item, screen, bufX, bufY, pelletFrame);
      continue;
    }
    drawEntity(item, screen, bufX, bufY);
  }
}

function drawFoodAtlas(e: Entity, screen: Surface, bufX: number, bufY: number, animFrame: number): void {
  if (e.sprite === null) {
    return;
  }

  const frame = animFrame % pelletAnimFrameCount;
  const sx = frame * itemCellWidth;
  const frameRect = sub(e.sprite, sx, 0, sx + itemCellWidth, itemCellHeight);

  screen.draw(frameRect, goRound(bufX + e.x - e.width / 2), goRound(bufY + e.y - e.height / 2));
}

function drawPlayer(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  const death = l.deathFrame();
  const player = l.player();
  if (death !== null) {
    const sx = death * frameSize;
    const sy = bearDeathRow * frameSize;
    const frame = sub(imageBear, sx, sy, sx + frameSize, sy + frameSize);
    screen.draw(frame, player.x - frameSize / 2 + bufX, player.y - frameSize / 2 + bufY);
    return;
  }

  if (player.hidden) {
    return;
  }

  drawEntity(player, screen, bufX, bufY, l.smoked() ? imageBearSmoked : undefined);
}

function drawTiles(l: LevelView, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
  if (!dbg) {
    return;
  }

  for (const e of l.enemies()) {
    const c = e.color ?? { r: 0, g: 0, b: 0, a: 0 };
    drawTile(screen, bufX, bufY, pointToTile(e.x, e.y), c);
    drawTile(screen, bufX, bufY, findTarget(e, l.enemies(), l.player(), l.mode().current), c);
  }
}

function drawLines(l: LevelView, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
  if (!dbg) {
    return;
  }

  for (const e of l.enemies()) {
    const target = findTarget(e, l.enemies(), l.player(), l.mode().current);

    const sx = Math.fround(e.x + bufX);
    const sy = Math.fround(e.y + bufY);
    const dx = Math.fround(target.x * tileSize + bufX);
    const dy = Math.fround(target.y * tileSize + bufY);

    // Debug only (`debug` is a compile-time false in Go): approximate the
    // premultiplied colour with CSS alpha.
    const c = e.color ?? { r: 0, g: 0, b: 0, a: 0 };
    screen.line(sx, sy, dx, dy, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`);
  }
}

function drawEnemies(l: LevelView, screen: Surface, bufX: number, bufY: number): void {
  // The bees leave the maze to the bear while it flashes.
  if (l.state() === stateIDLevelClear) {
    return;
  }
  for (const enemy of l.enemies()) {
    if (enemy.eyes) {
      drawEyes(enemy, screen, bufX, bufY);
    } else {
      drawEntity(enemy, screen, bufX, bufY);
    }
  }
}

/**
 * An eaten bee's eyes: the bee-eyes.png frame for its direction, centred on it
 * like a bee. Before it has a direction it looks right.
 */
function drawEyes(e: Entity, screen: Surface, bufX: number, bufY: number): void {
  const x =
    Math.max(
      0,
      beeEyesOrder.findIndex((d) => d === e.direction),
    ) * frameSize;
  const eyes = sub(imageBeeEyes, x, 0, x + frameSize, frameSize);
  screen.draw(eyes, e.x - frameSize / 2 + bufX, e.y - frameSize / 2 + bufY);
}

/**
 * Go prints `[modeIndex] Scatter|Chase: modeTicks` with `DebugPrintAt`.
 * `debug` is a compile-time false, so this never draws; the text is built for
 * reference only (see docs/port-notes.md).
 */
function drawMode(l: LevelView, _screen: Surface, _bufX: number, _bufY: number, dbg: boolean): string {
  if (!dbg) {
    return "";
  }

  let mode = "";
  const { index, current, ticks } = l.mode();
  switch (current) {
    case 0:
      mode = "Scatter";
      break;
    case 1:
      mode = "Chase";
      break;
  }
  return `[${index}] ${mode}: ${ticks}`;
}

/** `e` at its frame; `sheet` stands in for its own sheet, laid out the same (the smoked bear). */
function drawEntity(e: Entity, screen: Surface, bufX: number, bufY: number, sheet?: Sprite): void {
  const sprite = sheet ?? e.sprite;
  if (sprite === null) {
    return;
  }

  // Go map lookup: a nil map or missing key ("" direction) reads as 0.
  let row = e.direction === "" ? 0 : (e.frameDirection?.[e.direction] ?? 0);

  if (e.blueFrames > 0) {
    row += frightenedRowOffset;
    if (e.flash) {
      row += frightenedRowOffset;
    }
  }

  // A bee's sheet is a sub-image of bees.png, so frames count from its corner.
  const sx = sprite.sx + e.width * Math.trunc(e.frame);
  const sy = sprite.sy + e.height * Math.trunc(row);
  const sw = e.width;
  const sh = e.height;

  const spriteFrame = sub(sprite, Math.trunc(sx), Math.trunc(sy), Math.trunc(sx + sw), Math.trunc(sy + sh));

  screen.draw(spriteFrame, e.x - e.width / 2 + bufX, e.y - e.height / 2 + bufY);
}

function drawTile(screen: Surface, bufX: number, bufY: number, tile: Tile, color: PremulColor): void {
  // Go fills an 8×8 image with the premultiplied colour, then draws it (D15).
  screen.fillPremul(bufX + tile.x * tileSize, bufY + tile.y * tileSize, tileSize, tileSize, color);
}
