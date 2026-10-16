// Brass Monkey's Software (#39): the run in play.ts, played inside its
// cabinet and drawn to fill the cabinet's screen: the score, high score and
// bonus in a 32 px band of wall at the top, then the floor.

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
import { drawText, drawTextCentered, textWidth } from "../ui/text.ts";
import { girderTop, type Floor } from "./floors.ts";
import { Run, type Hazard, type Monkey, type RunSound } from "./play.ts";
import { escapeTicks } from "./tuning.ts";
import { noAdvantages, type BrassMonkeyAdvantages } from "./advantages.ts";

/** The band at the top of the screen holding the score, high score and bonus. */
const hudHeight = 32;

const backgrounds: readonly Sprite[] = [imageGirderFloor, imageConveyorFloor];

const frame = (sheet: Sprite, col: number, w: number, h: number): Sprite => sub(sheet, col * w, 0, (col + 1) * w, h);

const digits = (n: number, width: number): string => String(Math.trunc(n)).padStart(width, "0");

/** The sound for each of the run's sound cues. */
const runSounds: Readonly<Record<RunSound, Sound>> = {
  jump: sounds.monkeyJump,
  bolt: sounds.monkeyBolt,
  hazard: sounds.monkeyHazard,
  death: sounds.monkeyDeath,
  floor: sounds.monkeyFloor,
  escape: sounds.monkeyEscape,
};

export class BrassMonkeySoftware implements FixedViewport {
  readonly name = "brassMonkey" as const;

  readonly run: Run;
  private highScore: number;

  constructor(highScore = 0, advantages: Readonly<BrassMonkeyAdvantages> = noAdvantages) {
    this.highScore = highScore;
    this.run = new Run({
      advantages,
      onSound: (s): void => {
        runSounds[s].rewind();
        runSounds[s].play();
      },
    });
  }

  background(): Sprite {
    return backgrounds[this.run.floor] ?? imageGirderFloor;
  }

  update(i: Input): void {
    this.run.update(i);
    this.highScore = Math.max(this.highScore, this.run.score);
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
    screen.draw(frame(imageGnome, run.gnomeThrowing() ? 1 : 0, 32, 32), left + floor.gnome.x, top + floor.gnome.y);
    for (const h of run.hazards) drawHazard(screen, h, left, top, run.ticks);
    // The monkey blinks while it loses a life.
    if (run.phase !== "dying" || Math.trunc(run.phaseTicks / 6) % 2 === 0) drawMonkey(screen, run.monkey, left, top);
    for (let n = 0; n < run.lives; n++) screen.draw(frame(imageMonkey, 0, 16, 16), left + 4 + n * 14, top + 2);
    // Across from the lives.
    const lap = lapLabel(run.loop);
    drawText(screen, lap, left + cabinetPlayfieldWidth - 4 - textWidth(lap), top + 6, "orange");
    if (run.lapBanner > 0 && run.phase === "play")
      drawTextCentered(screen, lapLabel(run.loop), left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "clear") drawTextCentered(screen, "FLOOR CLEAR!", left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "over") drawTextCentered(screen, "GAME OVER", left + cabinetPlayfieldWidth / 2, top + 20);
  }

  private drawHud(screen: Surface, left: number, top: number): void {
    for (let x = 0; x < cabinetPlayfieldWidth; x += 32) screen.draw(imageWall, left + x, top);
    const w = cabinetPlayfieldWidth;
    drawText(screen, "SCORE", left + 6, top + 6, "orange");
    drawText(screen, digits(this.run.score, 6), left + 6, top + 17);
    drawTextCentered(screen, "HIGH SCORE", left + w / 2, top + 6, "orange");
    drawTextCentered(screen, digits(this.highScore, 6), left + w / 2, top + 17);
    drawText(screen, "BONUS", left + w - 38, top + 6, "orange");
    drawText(screen, digits(this.run.bonus, 4), left + w - 38, top + 17, "yellow");
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
