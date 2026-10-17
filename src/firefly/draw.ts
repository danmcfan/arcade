// Draws Firefly inside its cabinet: the night sky, the enemies (or their hit
// effects), an Owl's tractor beam, a captured firefly, enemy shots, sparks, the firefly (or its death effect), the
// score HUD shared with Sweet Sam (src/ui/dials.ts) and spare lives, stage badges, escort-kill bonuses, and "STAGE n" while a stage opens.

import {
  imageBadges,
  imageCaptive,
  imageCabinetFirefly,
  imageFirefly,
  imageFireflyBackground,
  imageHit,
  imageMorph,
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
import { drawScoreLabels, type ScoreDials } from "../ui/dials.ts";
import { drawTextCentered } from "../ui/text.ts";
import { angle, frameAngle, type Bonus, type Captive, type Enemy, type Shot, type Spark, type Vec } from "./entity.ts";
import {
  badgesShown,
  badgeValues,
  beamHeight,
  beamWidth,
  fieldHeight,
  fieldWidth,
  challengeTotal,
  halves,
  hitEffectTicks,
  hitMissRatio,
  perfectBonus,
  tallyBonus,
  tallyTicks,
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
  morph: imageMorph,
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
  dials: ScoreDials;
  /** On a Challenging Stage: its hits, and ticks left of the tally (0 while it flies). */
  challenge: { readonly hits: number; readonly tally: number } | null;
  /** Sparks fired and sparks that hit, for the -RESULTS- screen. */
  shotsFired: number;
  hits: number;
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

  // GAME OVER, the results and the tally show on a clear field.
  const clear = f.lives === 0 || (f.challenge !== null && f.challenge.tally > 0);
  if (!clear) drawPlay(screen, f);

  if (f.respawn > 0) {
    // The firefly bursts like a hit enemy, over the first part of the pause;
    // one taken by a beam rides up as the captive instead.
    if (!f.captured) drawHit(screen, Math.max(0, hitEffectTicks - (respawnTicks - f.respawn)), f.player.x, f.player.y);
  } else if (f.lives > 0) {
    // Once the last life is gone the firefly stays gone, under GAME OVER, the results and the payout.
    for (const x of halves(f.player.x, f.dual)) screen.draw(imageFirefly, ox + x - 8, oy + f.player.y - 8);
  }

  // Sweet Sam's HUD: the high score follows the score once the score passes it.
  drawScoreLabels(screen, ox, oy);
  f.dials.draw(screen, ox, oy);
  drawLives(screen, Math.max(0, f.lives - 1));
  drawBadges(screen, f.stage, f.stageTick);

  const cx = ox + fieldWidth / 2;
  if (f.lives === 0) {
    if (f.respawn > 0) drawTextCentered(screen, "GAME OVER", cx, oy + 150, "orange");
    else drawResults(screen, f);
  } else if (f.challenge !== null && f.challenge.tally > 0) {
    drawTally(screen, f.challenge.hits, tallyTicks - f.challenge.tally);
  } else if (f.stageTick <= stageIntroTicks) {
    const banner = f.challenge === null ? `STAGE ${f.stage}` : "CHALLENGING STAGE";
    drawTextCentered(screen, banner, cx, oy + 150, "yellow");
  }
}

/** Enemies (or their hit effects), beams, the captive, shots, sparks and bonus points. */
function drawPlay(screen: Surface, f: FireflyView): void {
  for (const e of f.enemies) drawBeam(screen, e);
  for (const e of f.enemies) drawEnemy(screen, e);
  if (f.captive !== null) screen.draw(imageCaptive, ox + f.captive.x - 8, oy + f.captive.y - 8);
  for (const s of f.shots) screen.draw(imageShot, ox + s.x - 2, oy + s.y - 4);
  for (const s of f.sparks) screen.draw(imageSpark, ox + s.x - 4, oy + s.y - 4);
  // Galaga's escort-kill and wave bonuses: the points, where the enemy was shot.
  for (const b of f.bonuses) drawTextCentered(screen, `${b.points}`, ox + b.x, oy + b.y - 4, "blue");
}

/** Ticks into the tally before its bonus line shows. */
export const tallyBonusDelay = 60;

/** After a Challenging Stage: "NUMBER OF HITS n", then the bonus, or "PERFECT!" and the special bonus. */
function drawTally(screen: Surface, hits: number, tick: number): void {
  const cx = ox + fieldWidth / 2;
  const perfect = hits === challengeTotal;
  if (perfect) drawTextCentered(screen, "PERFECT!", cx, oy + 120, "red");
  drawTextCentered(screen, `NUMBER OF HITS ${hits}`, cx, oy + 140, "blue");
  if (tick < tallyBonusDelay) return;
  const bonus = perfect ? `SPECIAL BONUS ${perfectBonus} PTS` : `BONUS ${tallyBonus(hits)}`;
  drawTextCentered(screen, bonus, cx, oy + 160, "yellow");
}

/** Galaga's end-of-run results: shots fired, hits and the hit-miss ratio. */
function drawResults(screen: Surface, f: FireflyView): void {
  const cx = ox + fieldWidth / 2;
  drawTextCentered(screen, "-RESULTS-", cx, oy + 110, "red");
  drawTextCentered(screen, `SHOTS FIRED ${f.shotsFired}`, cx, oy + 135, "yellow");
  drawTextCentered(screen, `NUMBER OF HITS ${f.hits}`, cx, oy + 150, "yellow");
  drawTextCentered(screen, `HIT-MISS RATIO ${hitMissRatio(f.shotsFired, f.hits)} %`, cx, oy + 165, "white");
}
