// Port of internal/hive/draw.go. Draw paths only: nothing here mutates game
// state (fact 2), and all DOM work (offscreen surfaces) happens lazily here (D12).

import { sub, type Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import { imageBear, imageCabinet, imageDigits, imageReady } from "../engine/assets.ts";
import { goRound } from "../engine/gomath.ts";
import { cabinetInsetLeft, cabinetInsetTop, drawCabinet } from "../ui/cabinet.ts";
import { drawBonusEatIndicators } from "./bonusEat.ts";
import { digits6, type DigitReels } from "./digitReel.ts";
import {
  pelletAnimFrameCount,
  pelletAnimHoldTicks,
  pelletAtlasCellH,
  pelletAtlasCellW,
  pelletAtlasPowerRowY,
  pelletAtlasSmallRowY,
  pointToTile,
  tileSize,
  type Entity,
  type Tile,
} from "./entity.ts";
import { findTarget, startTicks } from "./update.ts";
import type { HiveSoftware } from "./software.ts";

const debug = false;

/** Lazily created draw resources. */
export interface DrawCache {
  /** Reused cell for clipped score/high-score draws (Go `digitDialScratch`). */
  digitDialScratch: Surface | null;
}

/** Go `HiveSoftware.Draw`; the order is exactly Go's. The cabinet is drawn unshaken. */
export function draw(s: HiveSoftware, screen: Surface): void {
  drawCabinet(screen, s.cabinetJoystickFrame, imageCabinet);

  const [ox, oy] = s.camera.cameraOffset();
  const bufX = cabinetInsetLeft + ox;
  const bufY = cabinetInsetTop + oy;
  drawBackground(s, screen, bufX, bufY);
  drawScore(s, screen, bufX, bufY);
  drawHighScore(s, screen, bufX, bufY);
  drawLives(s, screen, bufX, bufY);
  drawReady(s, screen, bufX, bufY);
  drawItems(s, screen, bufX, bufY);
  drawPlayer(s, screen, bufX, bufY);
  drawTiles(s, screen, bufX, bufY, debug);
  drawLines(s, screen, bufX, bufY, debug);
  drawEnemies(s, screen, bufX, bufY);
  drawBonusEatIndicators(s, screen, bufX, bufY);
  s.particles.draw(screen, bufX, bufY);
  drawMode(s, screen, bufX, bufY, debug);
}

function drawBackground(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  screen.draw(s.background(), bufX, bufY);
}

function drawScore(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  drawRollingInteger(s, screen, bufX, bufY, s.scoreValue, 1, 1, s.scoreDial);
}

function drawHighScore(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  const highScore = Math.trunc(Math.max(s.scoreValue, s.highScore));
  drawRollingInteger(s, screen, bufX, bufY, highScore, 11, 1, s.highScoreDial);
}

function drawLives(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  for (let i = 0; i < s.lives - 1; i++) {
    const sw = Math.trunc(imageBear.w / 4);
    const sh = Math.trunc(imageBear.h / 4);
    const spriteFrame = sub(imageBear, 0, 0, sw, sh);

    screen.draw(spriteFrame, 8 * (2 + i * 2) + bufX, 8 * 34 + 1 + bufY);
  }
}

/** ImageReady ("READY!") strips: 48×8 → six 8×8 glyphs. */
export const readyGlyphWidth = 8;

export const readyWaveAmpPx = 2.0;
/** Sine advance per elapsed START frame. */
export const readyWaveTimeRad = 0.14;
/** Phase step between adjacent glyphs (radians). */
export const readyWaveGlyphPhaseRad = 1.05;

function drawReady(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.startTicks <= 0) {
    return;
  }

  const img = imageReady;
  const count = Math.trunc(img.w / readyGlyphWidth);
  if (count <= 0) {
    return;
  }

  const baseX = 8 * 11 + bufX;
  const baseY = 8 * 20 + bufY + 1;

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

function drawItems(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
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
  const sx = frame * pelletAtlasCellW;
  let sy = pelletAtlasSmallRowY;
  if (e.powerPellet) {
    sy = pelletAtlasPowerRowY;
  }
  const frameRect = sub(e.sprite, sx, sy, sx + pelletAtlasCellW, sy + pelletAtlasCellH);

  screen.draw(frameRect, goRound(bufX + e.x - e.width / 2), goRound(bufY + e.y - e.height / 2));
}

function drawPlayer(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  if (s.player.hidden) {
    return;
  }

  drawEntity(s.player, screen, bufX, bufY);
}

function drawTiles(s: HiveSoftware, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
  if (!dbg) {
    return;
  }

  for (const e of s.enemies) {
    const c = e.color ?? { r: 0, g: 0, b: 0, a: 0 };
    drawTile(screen, bufX, bufY, pointToTile(e.x, e.y), c);
    drawTile(screen, bufX, bufY, findTarget(e, s.enemies, s.player, s.modeCurrent), c);
  }
}

function drawLines(s: HiveSoftware, screen: Surface, bufX: number, bufY: number, dbg: boolean): void {
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

function drawEnemies(s: HiveSoftware, screen: Surface, bufX: number, bufY: number): void {
  for (const enemy of s.enemies) {
    drawEntity(enemy, screen, bufX, bufY);
  }
}

/**
 * Go prints `[modeIndex] Scatter|Chase: modeTicks` with `DebugPrintAt`.
 * `debug` is a compile-time false, so this never draws; the text is built for
 * reference only (see docs/port-notes.md).
 */
function drawMode(s: HiveSoftware, _screen: Surface, _bufX: number, _bufY: number, dbg: boolean): string {
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

function digitFrame(d: number): Sprite {
  d = d % 10;
  if (d < 0) {
    d += 10;
  }
  const [dw, dh] = digitGlyphSize();
  return sub(imageDigits, d * dw, 0, (d + 1) * dw, dh);
}

function digitDialCell(s: HiveSoftware, dw: number, dh: number): Surface {
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
  s: HiveSoftware,
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
    row += 2;
    if (e.flash) {
      row += 2;
    }
  }

  const sx = e.width * Math.trunc(e.frame);
  const sy = e.height * Math.trunc(row);
  const sw = e.width;
  const sh = e.height;

  const spriteFrame = sub(e.sprite, Math.trunc(sx), Math.trunc(sy), Math.trunc(sx + sw), Math.trunc(sy + sh));

  screen.draw(spriteFrame, e.x - e.width / 2 + bufX, e.y - e.height / 2 + bufY);
}

function drawTile(screen: Surface, bufX: number, bufY: number, tile: Tile, color: PremulColor): void {
  // Go fills an 8×8 image with the premultiplied colour, then draws it (D15).
  screen.fillPremul(bufX + tile.x * tileSize, bufY + tile.y * tileSize, tileSize, tileSize, color);
}
