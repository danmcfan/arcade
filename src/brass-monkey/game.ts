// Brass Monkey's Software (#39): the run in play.ts, played inside its
// cabinet and drawn to fill the cabinet's screen: the HUD in a 32 px band of
// wall at the top, then the floor. The HUD is Sweet Sam's (#212): its labels,
// its rolling dials on its rows, and spare lives in its spacing, under the
// scores, since Sweet Sam's place for them is where the monkey walks.

import {
  imageBolt,
  imageCabinetBrassMonkey,
  imageConveyor,
  imageConveyorFloor,
  imageDoor,
  imageEmber,
  imageGear,
  imageGirderFloor,
  imageGnome,
  imageMonkey,
  imageWall,
  imageWrench,
  imageWrenchSwing,
  sounds,
} from "../engine/assets.ts";
import type { Sound } from "../engine/audio.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import type { BrassMonkeySnapshot } from "../game/snapshot.ts";
import type { FixedViewport } from "../game/software.ts";
import {
  cabinetHeight,
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldWidth,
  cabinetWidth,
  drawOnScreen,
} from "../ui/cabinet.ts";
import { sweetie } from "../ui/sweetie16.ts";
import { drawTextCentered } from "../ui/text.ts";
import { scoreLabelsX } from "../ui/hudArt.ts";
import { hudLabelSprite } from "../ui/hudLabels.ts";
import { Dial } from "../ui/rollingDials.ts";
import { girderTop, type Floor } from "./floors.ts";
import { facing, Run, type Hazard, type Monkey, type RunSound } from "./play.ts";
import { escapeTicks } from "./tuning.ts";
import { noAdvantages, type BrassMonkeyAdvantages } from "./advantages.ts";

/** The band at the top of the screen holding the score, high score and bonus. */
const hudHeight = 32;

const backgrounds: readonly Sprite[] = [imageGirderFloor, imageConveyorFloor];

const frame = (sheet: Sprite, col: number, w: number, h: number): Sprite => sub(sheet, col * w, 0, (col + 1) * w, h);

/** Where the HUD's readouts stand in the band, as Sweet Sam's: labels on row 0, dials on row 1 (8 px rows). */
const hud = {
  score: 8,
  highScore: 8 * 11,
  /** BONUS and LOOP, at the right; their dials' six-reel fields start a tile left of them. */
  right: 8 * 21,
  rightDials: 8 * 20,
  dialsTop: 8,
  livesTop: 16,
  loopTop: 20,
} as const;

/** The sound for each of the run's sound cues. */
const runSounds: Readonly<Record<RunSound, Sound>> = {
  jump: sounds.monkeyJump,
  bolt: sounds.monkeyBolt,
  hazard: sounds.monkeyHazard,
  smash: sounds.monkeySmash,
  death: sounds.monkeyDeath,
  floor: sounds.monkeyFloor,
  escape: sounds.monkeyEscape,
};

export class BrassMonkeySoftware implements FixedViewport {
  readonly name = "brassMonkey" as const;

  readonly run: Run;
  private highScore: number;
  private readonly scoreDial = new Dial();
  private readonly highScoreDial: Dial;
  private readonly bonusDial: Dial;
  private readonly loopDial = new Dial(1, 1);
  /** The wrench music is playing. */
  private wrenchMusic = false;

  constructor(highScore = 0, advantages: Readonly<BrassMonkeyAdvantages> = noAdvantages) {
    this.highScore = highScore;
    this.highScoreDial = new Dial(highScore);
    this.run = new Run({
      advantages,
      onSound: (s): void => {
        runSounds[s].rewind();
        runSounds[s].play();
      },
    });
    this.bonusDial = new Dial(this.run.bonus);
  }

  background(): Sprite {
    return backgrounds[this.run.floor] ?? imageGirderFloor;
  }

  update(i: Input): void {
    this.run.update(i);
    this.highScore = Math.max(this.highScore, this.run.score);
    this.scoreDial.update(this.run.score);
    this.highScoreDial.update(this.highScore);
    this.bonusDial.update(this.run.bonus);
    this.loopDial.update(this.run.loop + 1);
    const held = this.run.phase === "play" && this.run.monkey.wrench > 0;
    if (held !== this.wrenchMusic) {
      this.wrenchMusic = held;
      if (held) sounds.monkeyWrench.blip();
      else sounds.monkeyWrench.pause();
    }
  }

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  /** A `FixedViewport`: `buffer` is 0. */
  draw(screen: Surface, _buffer: number): void {
    screen.draw(imageCabinetBrassMonkey, 0, 0);
    drawOnScreen(screen, () => {
      this.drawScreen(screen);
    });
  }

  private drawScreen(screen: Surface): void {
    const left = cabinetInsetLeft;
    const top = cabinetInsetTop + hudHeight;
    this.drawHud(screen, left, cabinetInsetTop);
    const run = this.run;
    if (run.phase === "escape") {
      drawEscape(screen, left, top, escapeTicks - run.phaseTicks);
      drawTextCentered(screen, lapLabel(run.loop + 1), left + cabinetPlayfieldWidth / 2, top + 84, "dark");
      return;
    }
    const floor = run.currentFloor();
    screen.draw(this.background(), left, top);
    drawConveyors(screen, floor, left, top, run.ticks);
    floor.bolts.forEach((b, n) => {
      if (run.bolts[n] === true) return;
      const t = run.ticks % 120;
      const glint = t < 18 ? 1 + Math.trunc(t / 6) : 0;
      screen.draw(frame(imageBolt, glint, 10, 14), left + b.x - 5, top + b.y - 14);
    });
    floor.wrenches.forEach((w, n) => {
      if (run.wrenches[n] !== true) screen.draw(imageWrench, left + w.x - 4, top + w.y - 14);
    });
    screen.draw(frame(imageGnome, run.gnomeThrowing() ? 1 : 0, 32, 32), left + floor.gnome.x, top + floor.gnome.y);
    for (const h of run.hazards) drawHazard(screen, h, left, top, run.ticks);
    // The monkey blinks while it loses a life.
    if (run.phase !== "dying" || Math.trunc(run.phaseTicks / 6) % 2 === 0) {
      drawMonkey(screen, run.monkey, left, top);
      // In its last ticks the wrench flashes: drawn 4 ticks, hidden 4.
      if (run.monkey.wrench > 0 && (!run.wrenchFlashing() || Math.trunc(run.ticks / 4) % 2 === 0))
        drawWrench(screen, run.monkey, left, top, run.ticks);
    }
    for (const s of run.smashes) drawTextCentered(screen, `${s.points}`, left + s.x, top + s.y - 16);
    if (run.lapBanner > 0 && run.phase === "play")
      drawTextCentered(screen, lapLabel(run.loop), left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "clear") drawTextCentered(screen, "FLOOR CLEAR!", left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "over") drawTextCentered(screen, "GAME OVER", left + cabinetPlayfieldWidth / 2, top + 20);
  }

  private drawHud(screen: Surface, left: number, top: number): void {
    for (let x = 0; x < cabinetPlayfieldWidth; x += 32) screen.draw(imageWall, left + x, top);
    const { run } = this;
    screen.draw(hudLabelSprite("scores"), left + scoreLabelsX, top);
    screen.draw(hudLabelSprite("bonus"), left + hud.right, top);
    this.scoreDial.draw(screen, left + hud.score, top + hud.dialsTop);
    this.highScoreDial.draw(screen, left + hud.highScore, top + hud.dialsTop);
    this.bonusDial.draw(screen, left + hud.rightDials, top + hud.dialsTop);
    // Spare lives: the one in play is not counted.
    for (let n = 0; n < run.lives - 1; n++)
      screen.draw(frame(imageMonkey, 0, 16, 16), left + 8 * (2 + n * 2), top + hud.livesTop);
    screen.draw(hudLabelSprite("loop"), left + hud.right, top + hud.loopTop);
    this.loopDial.draw(screen, left + hud.rightDials, top + hud.loopTop);
  }

  gameOver(): boolean {
    return this.run.phase === "over";
  }

  score(): number {
    return this.run.score;
  }

  snapshot(): BrassMonkeySnapshot {
    const { run } = this;
    const m = run.monkey;
    return {
      phase: run.phase,
      phaseTicks: run.phaseTicks,
      floor: run.floor,
      loop: run.loop,
      lives: run.lives,
      score: run.score,
      highScore: this.highScore,
      bonus: run.bonus,
      x: m.x,
      y: m.y,
      footing: m.footing,
      vy: m.vy,
      frame: m.frame,
      left: m.left,
      moving: m.moving,
      hazards: run.hazards.map((h) => ({ kind: h.kind, x: h.x, y: h.y, dir: h.dir, footing: h.footing })),
      bolts: [...run.bolts],
      wrench: m.wrench,
      wrenches: [...run.wrenches],
      smashes: run.smashes.map(({ x, y, points }) => ({ x, y, points })),
      gearTimer: run.gearTimer,
      emberTimer: run.emberTimer,
    };
  }
}

/** The lap as the player counts it, from 1: `run.loop` counts escapes. */
function lapLabel(loop: number): string {
  return `LOOP ${loop + 1}`;
}

export function newBrassMonkeySoftware(
  highScore = 0,
  advantages: Readonly<BrassMonkeyAdvantages> = noAdvantages,
): BrassMonkeySoftware {
  return new BrassMonkeySoftware(highScore, advantages);
}

/** The monkey's sheet column: walk 0, 1, 0, 2; jump 3; climb 4 or 5. */
export function monkeyColumn(m: Monkey): number {
  if (m.footing === "air") return 3;
  if (m.footing === "climb") return 4 + (Math.trunc(m.frame) % 2);
  return [0, 1, 0, 2][Math.trunc(m.frame)] ?? 0;
}

function drawMonkey(screen: Surface, m: Monkey, left: number, top: number): void {
  const flip = m.left && m.footing !== "climb";
  screen.draw(
    frame(imageMonkey, monkeyColumn(m), 16, 16),
    left + m.x - 8,
    top + m.y - 16,
    flip ? { flipX: true } : undefined,
  );
}

/** The held wrench, swinging every 8 ticks: raised over the monkey's head, then down in front of it. */
function drawWrench(screen: Surface, m: Monkey, left: number, top: number, ticks: number): void {
  const face = facing(m);
  if (Math.trunc(ticks / 8) % 2 === 0) {
    screen.draw(imageWrench, left + m.x - 4 + face * 3, top + m.y - 26);
    return;
  }
  const x = m.left ? m.x - 18 : m.x + 4;
  screen.draw(imageWrenchSwing, left + x, top + m.y - 12, m.left ? { flipX: true } : undefined);
}

function drawHazard(screen: Surface, h: Hazard, left: number, top: number, ticks: number): void {
  const col = h.kind === "gear" ? Math.trunc(Math.abs(h.x) / 4) % 2 : Math.trunc(ticks / 8) % 4;
  screen.draw(frame(h.kind === "gear" ? imageGear : imageEmber, col, 12, 12), left + h.x - 6, top + h.y - 12);
}

/** Each conveyor's tiles, their slats moving the way the belt runs at its speed (1 px every 2 ticks). */
function drawConveyors(screen: Surface, floor: Floor, left: number, top: number, ticks: number): void {
  const step = Math.trunc(ticks / 2) % 4;
  for (const g of floor.girders) {
    if (g.belt === undefined) continue;
    const f = g.belt > 0 ? step : (4 - step) % 4;
    for (let x = g.x0; x < g.x1; x += 8) {
      const end = x === g.x0 ? 0 : x + 8 >= g.x1 ? 8 : 4;
      screen.draw(frame(imageConveyor, end + f, 8, 8), left + x, top + girderTop(g, x));
    }
  }
}

/**
 * The escaped scene, `t` ticks in: daylight over grass, the factory's wall
 * and exit door on the left, and the monkey running out of the door to the right.
 */
function drawEscape(screen: Surface, left: number, top: number, t: number): void {
  const w = cabinetPlayfieldWidth;
  const ground = 208;
  screen.fillRect(left, top, w, 256, sweetie.B);
  screen.fillRect(left + 168, top + 24, 24, 24, sweetie.y);
  screen.fillRect(left, top + ground, w, 256 - ground, sweetie.G);
  screen.fillRect(left, top + ground, w, 2, sweetie.g);
  for (let y = ground - 96; y < ground; y += 32) {
    for (let x = 0; x < 64; x += 32) screen.draw(imageWall, left + x, top + y);
  }
  screen.draw(imageDoor, left + 24, top + ground - 24);
  const x = Math.min(w - 12, 32 + t * 1.2);
  const step = Math.trunc(t / 5) % 4;
  screen.draw(frame(imageMonkey, [0, 1, 0, 2][step] ?? 0, 16, 16), left + x - 8, top + ground - 16);
  drawTextCentered(screen, "ESCAPED!", left + w / 2, top + 72, "dark");
}
