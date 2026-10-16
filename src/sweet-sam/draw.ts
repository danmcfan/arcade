// Port of the Go Sweet Sam minigame's draw.go (docs/port-notes.md gives its old
// Go name). Draw paths only: nothing here mutates game state (fact 2), and all
// DOM work (offscreen surfaces) happens lazily here (D12).

import { sub, type Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import {
  imageBear,
  imageCabinet,
  imageDigits,
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
import { digits6, type DigitReels } from "../ui/digitReel.ts";
import { bearDeathRow, frameSize, itemCellHeight, itemCellWidth, mazeHeight, mazeWidth } from "./art.ts";
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
import { sweetie } from "../ui/sweetie16.ts";
import { findTarget, startTicks } from "./update.ts";
import type { SweetSamSoftware } from "./software.ts";

const debug = false;

/** Lazily created draw resources. */
export interface DrawCache {
  /** Reused cell for clipped score/high-score draws (Go `digitDialScratch`). */
  digitDialScratch: Surface | null;
}

/** Go `Draw`; the order is exactly Go's. The cabinet is drawn unshaken. */
export function draw(s: SweetSamSoftware, screen: Surface): void {
  screen.draw(imageCabinet, 0, 0);
  drawOnScreen(screen, () => {
    drawScreen(s, screen);
  });
}

/** Everything inside the cabinet's screen, shaken by the camera. */
function drawScreen(s: SweetSamSoftware, screen: Surface): void {
  const [ox, oy] = s.camera.cameraOffset();
  const bufX = cabinetInsetLeft + ox;
  const bufY = cabinetInsetTop + oy;
  if (s.intermission() !== null) {
    drawIntermission(s, screen, bufX, bufY);
    return;
  }
  drawBackground(s, screen, bufX, bufY);
  drawScore(s, screen, bufX, bufY);
  drawHighScore(s, screen, bufX, bufY);
  drawLives(s, screen, bufX, bufY);
  drawLevel(s, screen, bufX, bufY);
  drawReady(s, screen, bufX, bufY);
  drawLevelBanner(s, screen, bufX, bufY);
  drawItems(s, screen, bufX, bufY);
  drawFlower(s, screen, bufX, bufY);
  drawPlayer(s, screen, bufX, bufY);
  drawTiles(s, screen, bufX, bufY, debug);
  drawLines(s, screen, bufX, bufY, debug);
  drawEnemies(s, screen, bufX, bufY);
  drawBonusEatIndicators(s, screen, bufX, bufY);
  drawFlowerPopup(s, screen, bufX, bufY);
  s.particles.draw(screen, bufX, bufY);
  drawMode(s, screen, bufX, bufY, debug);
}

/** A cutscene (#160): its actors over a black screen, under the score and lives. */
function drawIntermission(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  const poses = s.intermissionPoses();
  if (poses === null) return;
  screen.fillRect(bufX, bufY, mazeWidth, mazeHeight, "black");
  drawScore(s, screen, bufX, bufY);
  drawHighScore(s, screen, bufX, bufY);
  drawLevel(s, screen, bufX, bufY);
  screen.clipped(bufX, bufY, mazeWidth, mazeHeight, () => {
    for (const pose of poses) {
      drawPose(pose, screen, bufX, bufY);
    }
  });
}

function drawPose(p: IntermissionPose, screen: Surface, bufX: number, bufY: number): void {
  const sheet = p.sprite === "bear" ? imageBear : beeSheet("red");
  const row = p.sprite === "bear" ? bearRows[p.facing] : beeRows[p.facing] + (p.frightened ? frightenedRowOffset : 0);
  const sx = sheet.sx + frameSize * p.frame;
  const sy = sheet.sy + frameSize * row;
  const frame = sub(sheet, sx, sy, sx + frameSize, sy + frameSize);
  const half = (frameSize * p.scale) / 2;
  screen.draw(frame, p.x - half + bufX, intermissionY - half + bufY, { scale: p.scale });
}

function drawBackground(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  screen.draw(s.mazeFlash() ? imageSweetSamMazeFlash : imageSweetSamMaze, bufX, bufY);
}

function drawScore(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  drawRollingInteger(s, screen, bufX, bufY, s.scoreValue, 1, 1, s.scoreDial);
}

function drawHighScore(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  const highScore = Math.trunc(Math.max(s.scoreValue, s.highScore));
  drawRollingInteger(s, screen, bufX, bufY, highScore, 11, 1, s.highScoreDial);
}

function drawLives(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  for (let i = 0; i < s.lives - 1; i++) {
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

function drawLevel(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  const first = Math.max(1, s.level - levelCounterLength + 1);
  for (let level = first; level <= s.level; level++) {
    const x = levelCounterRight - (s.level - level + 1) * frameSize;
    screen.draw(flowerSprite(level), x + bufX, mazeHeight - frameSize + bufY);
  }
}

/** Where READY! and "LEVEL n" stand: centred under the bee home. */
const readyCentreX = 8 * 14;
const readyTop = 8 * 20 + 1;

/** "LEVEL n" before READY on every level after the first. */
function drawLevelBanner(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.levelBannerTicks <= 0) return;
  drawTextCentered(screen, `LEVEL ${s.level}`, readyCentreX + bufX, readyTop + bufY, "yellow");
}

function drawFlower(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.flowerTicks <= 0) return;
  screen.draw(flowerSprite(s.level), flowerX - frameSize / 2 + bufX, flowerY - frameSize / 2 + bufY);
}

/** An eaten flower's points, in the pixel font where it stood. */
function drawFlowerPopup(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.flowerPopup === null) return;
  drawTextCentered(
    screen,
    String(s.flowerPopup.points),
    flowerX + bufX,
    flowerY - Math.trunc(textHeight / 2) + bufY,
    "white",
  );
}

/** ImageReady ("READY!") strips: 48×8 → six 8×8 glyphs. */
export const readyGlyphWidth = 8;

export const readyWaveAmpPx = 2.0;
/** Sine advance per elapsed START frame. */
export const readyWaveTimeRad = 0.14;
/** Phase step between adjacent glyphs (radians). */
export const readyWaveGlyphPhaseRad = 1.05;

function drawReady(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.startTicks <= 0 || s.levelBannerTicks > 0) {
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
  const intoReady = startTicks - s.startTicks;

  for (let i = 0; i < count; i++) {
    const rx = i * readyGlyphWidth;
    const glyph = sub(img, rx, 0, rx + readyGlyphWidth, img.h);

    // Traveling wave along the string (vertical offset only). No rounding; D13 snapping applies.
    const dy = readyWaveAmpPx * Math.sin(intoReady * readyWaveTimeRad + i * readyWaveGlyphPhaseRad);

    screen.draw(glyph, baseX + rx, baseY + dy);
  }
}

function drawItems(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  const pelletFrame = Math.trunc(s.pelletAnimTick / pelletAnimHoldTicks) % pelletAnimFrameCount;
  for (const item of s.items) {
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

function drawPlayer(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  const death = s.deathFrame();
  if (death !== null) {
    const sx = death * frameSize;
    const sy = bearDeathRow * frameSize;
    const frame = sub(imageBear, sx, sy, sx + frameSize, sy + frameSize);
    screen.draw(frame, s.player.x - frameSize / 2 + bufX, s.player.y - frameSize / 2 + bufY);
    return;
  }

  if (s.player.hidden) {
    return;
  }

  drawEntity(s.player, screen, bufX, bufY);
}

function drawTiles(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
  if (!dbg) {
    return;
  }

  for (const e of s.enemies) {
    const c = e.color ?? { r: 0, g: 0, b: 0, a: 0 };
    drawTile(screen, bufX, bufY, pointToTile(e.x, e.y), c);
    drawTile(screen, bufX, bufY, findTarget(e, s.enemies, s.player, s.modeCurrent), c);
  }
}

function drawLines(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
  if (!dbg) {
    return;
  }

  for (const e of s.enemies) {
    const target = findTarget(e, s.enemies, s.player, s.modeCurrent);

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

function drawEnemies(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  // The bees leave the maze to the bear while it flashes.
  if (s.stateMachine.currentId() === stateIDLevelClear) {
    return;
  }
  for (const enemy of s.enemies) {
    if (enemy.eyes) {
      drawEyes(enemy, screen, bufX, bufY);
    } else {
      drawEntity(enemy, screen, bufX, bufY);
    }
  }
}

const eyeWhite = sweetie.w;
const eyePupil = sweetie.b;

/**
 * An eaten bee's eyes: two white 2×3 eyes, each with a 1 px pupil toward its
 * direction of travel. A placeholder until the eye sprites (#196).
 */
function drawEyes(e: Entity, screen: Surface, bufX: number, bufY: number): void {
  const cx = e.x + bufX;
  const cy = e.y + bufY;
  const px = e.direction === "RIGHT" ? 1 : 0;
  const py = e.direction === "UP" ? 0 : e.direction === "DOWN" ? 2 : 1;
  for (const ex of [cx - 4, cx + 2]) {
    screen.fillRect(ex, cy - 2, 2, 3, eyeWhite);
    screen.fillRect(ex + px, cy - 2 + py, 1, 1, eyePupil);
  }
}

/**
 * Go prints `[modeIndex] Scatter|Chase: modeTicks` with `DebugPrintAt`.
 * `debug` is a compile-time false, so this never draws; the text is built for
 * reference only (see docs/port-notes.md).
 */
function drawMode(s: SweetSamSoftware, _screen: Surface, _bufX: number, _bufY: number, dbg: boolean): string {
  if (!dbg) {
    return "";
  }

  let mode = "";
  switch (s.modeCurrent) {
    case 0:
      mode = "Scatter";
      break;
    case 1:
      mode = "Chase";
      break;
  }
  return `[${s.modeIndex}] ${mode}: ${s.modeTicks}`;
}

function digitGlyphSize(): [number, number] {
  const dw = Math.trunc(imageDigits.w / 10);
  const dh = imageDigits.h;
  return [dw, dh];
}

function digitFrame(digit: number): Sprite {
  let d = digit % 10;
  if (d < 0) {
    d += 10;
  }
  const [dw, dh] = digitGlyphSize();
  return sub(imageDigits, d * dw, 0, (d + 1) * dw, dh);
}

function digitDialCell(s: SweetSamSoftware, dw: number, dh: number): Surface {
  const cached = s.drawCache.digitDialScratch;
  if (cached !== null && cached.width === dw && cached.height === dh) {
    return cached;
  }
  const cell = Surface.offscreen(dw, dh);
  s.drawCache.digitDialScratch = cell;
  return cell;
}

/**
 * Renders each decimal column into a dw×dh scratch (hard clip), then
 * composites that cell onto the HUD. The last 2 digits always draw.
 */
function drawRollingInteger(
  s: SweetSamSoftware,
  screen: Surface,
  bufX: number,
  bufY: number,
  value: number,
  tx: number,
  ty: number,
  reels: DigitReels,
): void {
  const digs = digits6(value);
  const [dw, dhInt] = digitGlyphSize();
  const dh = dhInt;
  const cell = digitDialCell(s, dw, dhInt);

  let leadingZero = true;
  for (let i = 0; i < 6; i++) {
    const digit = digs[i] ?? 0;
    const r = reels[i];
    if (r === undefined) {
      continue;
    }
    if (i >= 6 - 2) {
      leadingZero = false;
    }

    if (digit === 0 && leadingZero && !r.active) {
      continue;
    }

    if (digit !== 0) {
      leadingZero = false;
    }

    const px = 8 * (tx + i) + bufX;
    const py = 8 * ty + bufY;

    cell.clear();

    if (r.active) {
      const p = r.scroll01();
      const offOld = -p * dh;
      const offNew = (1 - p) * dh;
      cell.draw(digitFrame(r.from), 0, offOld);
      cell.draw(digitFrame(r.to), 0, offNew);
    } else {
      cell.draw(digitFrame(r.settledDigit), 0, 0);
    }

    screen.drawSurface(cell, goRound(px), goRound(py));
  }
}

function drawEntity(e: Entity, screen: Surface, bufX: number, bufY: number): void {
  if (e.sprite === null) {
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
  const sx = e.sprite.sx + e.width * Math.trunc(e.frame);
  const sy = e.sprite.sy + e.height * Math.trunc(row);
  const sw = e.width;
  const sh = e.height;

  const spriteFrame = sub(e.sprite, Math.trunc(sx), Math.trunc(sy), Math.trunc(sx + sw), Math.trunc(sy + sh));

  screen.draw(spriteFrame, e.x - e.width / 2 + bufX, e.y - e.height / 2 + bufY);
}

function drawTile(screen: Surface, bufX: number, bufY: number, tile: Tile, color: PremulColor): void {
  // Go fills an 8×8 image with the premultiplied colour, then draws it (D15).
  screen.fillPremul(bufX + tile.x * tileSize, bufY + tile.y * tileSize, tileSize, tileSize, color);
}
