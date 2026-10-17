// Draws Firefly inside its cabinet: the night sky, the enemies (or their hit
// effects), an Owl's tractor beam, a captured firefly, enemy shots, sparks, the firefly (or its death effect), the
// score HUD shared with Sweet Sam (src/ui/scoreDials.ts) and spare lives, stage badges, escort-kill bonuses, and "STAGE n" while a stage opens.

import {
  imageBadges,
  imageCaptive,
  imageCabinetFirefly,
  imageFirefly,
  imageFireflyBackground,
  imageHit,
  imageMoth,
  imageOwl,
  imageOwlHurt,
  imageShot,
  imageSpark,
  imageWasp,
} from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { cabinetInsetLeft, cabinetInsetTop, drawOnScreen } from "../ui/cabinet.ts";
import { sweetie } from "../ui/sweetie16.ts";
import { drawScoreLabels, type ScoreDials } from "../ui/scoreDials.ts";
import { drawTextCentered } from "../ui/text.ts";
import { angle, frameAngle, type Bonus, type Captive, type Enemy, type Shot, type Spark, type Vec } from "./entity.ts";
import {
  badgesShown,
  badgeValues,
  beamHeight,
  beamWidth,
  fieldHeight,
  fieldWidth,
  halves,
  hitEffectTicks,
  respawnTicks,
  stageBadges,
  stageIntroTicks,
  type EnemyKind,
} from "./rules.ts";

const ox = cabinetInsetLeft;
const oy = cabinetInsetTop;

/** Each enemy kind's rotation sheet. */
const enemySheets: Readonly<Record<EnemyKind, Sprite>> = {
  moth: imageMoth,
  wasp: imageWasp,
  owl: imageOwl,
};

/** Every enemy frame is 16×16. */
const enemySize = 16;

/** Frames of the hit effect, each `hitFrameTicks` long. */
const hitFrameTicks = 15;
const hitFrameSize = 32;

/** The hit effect frame for `deadFrames` ticks left, centred on (x, y); nothing once it has played. */
function drawHit(screen: Surface, deadFrames: number, x: number, y: number): void {
  const col = Math.trunc((hitEffectTicks - deadFrames) / hitFrameTicks);
  if (col >= 5) return;
  const frame = sub(imageHit, col * hitFrameSize, 0, (col + 1) * hitFrameSize, hitFrameSize);
  screen.draw(frame, ox + x - hitFrameSize / 2, oy + y - hitFrameSize / 2);
}

function drawEnemy(screen: Surface, e: Enemy): void {
  if (e.state === "waiting") return;
  if (e.deadFrames > 0) {
    drawHit(screen, e.deadFrames, e.x, e.y);
    return;
  }
  const sheet = enemySheets[e.kind];
  const image = e.kind === "owl" && e.hp === 1 ? imageOwlHurt : sheet;
  const [row, col] = frameAngle(angle({ x: e.dx, y: e.dy }));
  const frame = sub(image, col * enemySize, row * enemySize, (col + 1) * enemySize, (row + 1) * enemySize);
  screen.draw(frame, ox + e.x - enemySize / 2, oy + e.y - enemySize / 2);
}

/** The beam's bands, each `beamBand` rows tall, scroll down a row every `beamScrollTicks`. */
const beamBand = 4;
const beamScrollTicks = 2;
const beamColours = [sweetie.c, sweetie.B] as const;
/** The beam's width just under the Owl; it widens to `beamWidth` at the firefly's row. */
const beamTopWidth = 8;

/** A beaming Owl's tractor beam: striped bands widening from under it down past the firefly's row. */
function drawBeam(screen: Surface, e: Enemy): void {
  if (e.state !== "beaming" || e.beamTicks === 0 || e.deadFrames > 0) return;
  const top = Math.round(e.y) + 8;
  // The Owl hovers `beamHeight` above the firefly's row; the beam reaches its bottom edge.
  const bottom = top + beamHeight;
  const scroll = Math.trunc(e.beamTicks / beamScrollTicks);
  for (let y = top; y < bottom; y++) {
    const w = 2 * Math.round((beamTopWidth + ((beamWidth - beamTopWidth) * (y - top)) / (bottom - 1 - top)) / 2);
    const stripe = Math.trunc((y - top + beamBand * 2 - (scroll % (beamBand * 2))) / beamBand) % 2;
    screen.fillRect(ox + Math.round(e.x) - w / 2, oy + y, w, 1, beamColours[stripe === 0 ? 0 : 1]);
  }
}

/** Spare lives: fireflies along the bottom left, where Sweet Sam shows its spare bears, under the firefly in play. */
function drawLives(screen: Surface, spare: number): void {
  for (let i = 0; i < spare; i++) screen.draw(imageFirefly, ox + 8 * (2 + i * 2), oy + 8 * 34 + 1);
}

/** Badge slots in imageBadges are 16 wide; the 1 and 5 pennants fill half of theirs. */
const badgeSlot = 16;

function badgeWidth(v: number): number {
  return v < 10 ? badgeSlot / 2 : badgeSlot;
}

/**
 * The stage's badges along the bottom right, largest first and ending 2 short
 * of the edge. Each stands where it ends up, so they are added left to right.
 */
function drawBadges(screen: Surface, stage: number, stageTick: number): void {
  const badges = stageBadges(stage);
  let x = fieldWidth - 2 - badges.reduce((w, v) => w + badgeWidth(v), 0);
  for (const v of badges.slice(0, badgesShown(stage, stageTick))) {
    const sx = badgeValues.indexOf(v) * badgeSlot;
    screen.draw(sub(imageBadges, sx, 0, sx + badgeWidth(v), badgeSlot), ox + x, oy + fieldHeight - badgeSlot);
    x += badgeWidth(v);
  }
}

/** What drawing needs of the game (`FireflySoftware`). */
export interface FireflyView {
  stage: number;
  stageTick: number;
  lives: number;
  player: Vec;
  respawn: number;
  over: boolean;
  sparks: readonly Spark[];
  enemies: readonly Enemy[];
  shots: readonly Shot[];
  bonuses: readonly Bonus[];
  /** The firefly in play was taken by a beam: no burst while it respawns. */
  captured: boolean;
  captive: Captive | null;
  /** Two fireflies, `dualOffset` either side of `player.x`. */
  dual: boolean;
  highScore: number;
  dials: ScoreDials;
  score(): number;
}

export function drawFirefly(screen: Surface, f: FireflyView): void {
  screen.draw(imageCabinetFirefly, 0, 0);
  drawOnScreen(screen, () => {
    drawField(screen, f);
  });
}

function drawField(screen: Surface, f: FireflyView): void {
  screen.draw(imageFireflyBackground, ox, oy);

  for (const e of f.enemies) drawBeam(screen, e);
  for (const e of f.enemies) drawEnemy(screen, e);
  if (f.captive !== null) screen.draw(imageCaptive, ox + f.captive.x - 8, oy + f.captive.y - 8);
  for (const s of f.shots) screen.draw(imageShot, ox + s.x - 2, oy + s.y - 4);
  for (const s of f.sparks) screen.draw(imageSpark, ox + s.x - 4, oy + s.y - 4);
  // Galaga's escort-kill bonus: the points, where the Owl was shot.
  for (const b of f.bonuses) drawTextCentered(screen, `${b.points}`, ox + b.x, oy + b.y - 4, "blue");

  if (f.respawn > 0) {
    // The firefly bursts like a hit enemy, over the first part of the pause;
    // one taken by a beam rides up as the captive instead.
    if (!f.captured) drawHit(screen, Math.max(0, hitEffectTicks - (respawnTicks - f.respawn)), f.player.x, f.player.y);
  } else if (!f.over) {
    // Once the last life is gone the firefly stays gone, under GAME OVER and the payout.
    for (const x of halves(f.player.x, f.dual)) screen.draw(imageFirefly, ox + x - 8, oy + f.player.y - 8);
  }

  // Sweet Sam's HUD: the high score follows the score once the score passes it.
  drawScoreLabels(screen, ox, oy);
  f.dials.draw(screen, ox, oy, f.score(), f.highScore);
  drawLives(screen, Math.max(0, f.lives - 1));
  drawBadges(screen, f.stage, f.stageTick);

  if (f.stageTick <= stageIntroTicks) {
    drawTextCentered(screen, `STAGE ${f.stage}`, ox + fieldWidth / 2, oy + 150, "yellow");
  }
  if (f.lives === 0) {
    drawTextCentered(screen, "GAME OVER", ox + fieldWidth / 2, oy + 150, "orange");
  }
}
