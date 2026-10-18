// Brass Monkey's Software (#39): the run in play.ts, played inside its
// cabinet and drawn to fill the cabinet's screen: the HUD in a 32 px band of
// wall at the top, then the floor. The HUD is Sweet Sam's (#212): its labels,
// its rolling dials on its rows, laid out after Donkey Kong's: spare lives
// under the score, LOOP and BONUS at the right.

import {
  imageBolt,
  imageCabinetBrassMonkey,
  imageConveyor,
  imageConveyorFloor,
  imageElevatorFloor,
  imageDoor,
  imageEmber,
  imageFurnace,
  imageGear,
  imagePan,
  imageGirder,
  imageGirderFloor,
  imageGnome,
  imageLift,
  imageMonkey,
  imageMonkeyDeath,
  imageSpring,
  imageRivet,
  imageRivetFloor,
  imageWall,
  imageWrench,
  imageWrenchSwing,
  imageUmbrella,
  sounds,
} from "../engine/assets.ts";
import type { Sound } from "../engine/audio.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import type { BrassMonkeySnapshot } from "../game/snapshot.ts";
import type { FixedViewport } from "../game/software.ts";
import {
  cabinetHeight,
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
  cabinetWidth,
  drawOnScreen,
} from "../ui/cabinet.ts";
import { sweetie } from "../ui/sweetie16.ts";
import { drawTextCentered } from "../ui/text.ts";
import { scoreLabelsX } from "../ui/hudArt.ts";
import { hudLabelSprite } from "../ui/hudLabels.ts";
import { Dial, ScoreDials } from "../ui/dials.ts";
import { conveyorFloor, girderFloor, girderTop, type Floor } from "./floors.ts";
import { facing, Run, type Hazard, type Monkey, type RunSound } from "./play.ts";
import { dyingTicks, escapeTicks, umbrellaFurledTicks, umbrellaPopTicks } from "./tuning.ts";
import { noAdvantages, type BrassMonkeyAdvantages } from "./advantages.ts";

/** The band at the top of the screen holding the score, high score and bonus. */
const hudHeight = 32;

const backgrounds: readonly Sprite[] = [imageGirderFloor, imageConveyorFloor, imageElevatorFloor, imageRivetFloor];

const frame = (sheet: Sprite, col: number, w: number, h: number): Sprite => sub(sheet, col * w, 0, (col + 1) * w, h);

/**
 * Where the HUD's readouts stand in the band, after Donkey Kong's (8 px tiles):
 * labels on row 0 and score dials on row 1 as Sweet Sam's, spare lives under
 * the score from column 1, the level (LOOP) on row 1 at the right where Donkey
 * Kong's L=01 starts (column 21), and BONUS under it on rows 2-3 in the BONUS
 * box's columns 21-26. Donkey Kong's L= and box sit a row lower, but the band is 4 rows.
 */
const hud = {
  score: 8,
  highScore: 8 * 11,
  dialsTop: 8,
  livesLeft: 8,
  livesTop: 16,
  /** LOOP's label; its dial's six-reel field starts a tile left, so the digit follows the word. */
  loop: 8 * 21,
  loopDials: 8 * 20,
  loopTop: 8,
  /** BONUS's label, centred over its six-reel dial in columns 21-26. */
  bonus: 8 * 21 + 4,
  bonusDials: 8 * 21,
  bonusTop: 16,
  bonusDialsTop: 24,
} as const;

/** Each floor's music. */
const floorMusic: ReadonlyMap<Floor, Sound> = new Map([
  [girderFloor, sounds.monkeyGirder],
  [conveyorFloor, sounds.monkeyConveyor],
]);

/** The sound for each of the run's sound cues. */
const runSounds: Readonly<Record<RunSound, Sound>> = {
  jump: sounds.monkeyJump,
  bolt: sounds.monkeyBolt,
  hazard: sounds.monkeyHazard,
  smash: sounds.monkeySmash,
  death: sounds.monkeyDeath,
  floor: sounds.monkeyFloor,
  escape: sounds.monkeyEscape,
  stomp: sounds.monkeyStomp,
  step: sounds.monkeyStep,
  extraLife: sounds.ticket,
  howHigh: sounds.monkeyHowHigh,
};

export class BrassMonkeySoftware implements FixedViewport {
  readonly name = "brassMonkey" as const;

  readonly run: Run;
  private readonly scoreDials: ScoreDials;
  private readonly bonusDial: Dial;
  private readonly loopDial = new Dial({ x: hud.loopDials, y: hud.loopTop }, 1, 1);
  /** The music playing (the wrench's while it is held, else the floor's), or none. */
  private music: Sound | null = null;

  constructor(highScore = 0, advantages: Readonly<BrassMonkeyAdvantages> = noAdvantages) {
    this.scoreDials = new ScoreDials(highScore, {
      score: { x: hud.score, y: hud.dialsTop },
      high: { x: hud.highScore, y: hud.dialsTop },
    });
    this.run = new Run({
      advantages,
      intro: true,
      onSound: (s): void => {
        runSounds[s].rewind();
        runSounds[s].play();
      },
    });
    this.bonusDial = new Dial({ x: hud.bonusDials, y: hud.bonusDialsTop }, this.run.bonus);
    this.playMusic();
  }

  background(): Sprite {
    return backgrounds[this.run.floor] ?? imageGirderFloor;
  }

  update(i: Input): void {
    this.run.update(i);
    this.scoreDials.tick(this.run.score);
    this.bonusDial.update(this.run.bonus);
    this.loopDial.update(this.run.loop + 1);
    this.playMusic();
  }

  /** In play, the wrench music while the monkey holds it, else the floor's music; none otherwise. */
  private playMusic(): void {
    const run = this.run;
    const floor = run.monkey.wrench > 0 ? sounds.monkeyWrench : (floorMusic.get(run.currentFloor()) ?? null);
    const music = run.phase === "play" ? floor : null;
    if (music === this.music) return;
    this.music?.pause();
    this.music = music;
    music?.blip();
  }

  /** Start loop `stage` (as the player counts it, from 1) afresh on the first floor. */
  jumpTo(stage: number): void {
    this.run.startLoop(stage - 1);
    this.update(NO_INPUT);
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

  /** The floor, then the HUD over its top edge: the Gnome climbing away from a clear goes up behind it. */
  private drawScreen(screen: Surface): void {
    this.drawPlayfield(screen);
    this.drawHud(screen, cabinetInsetLeft, cabinetInsetTop);
  }

  private drawPlayfield(screen: Surface): void {
    const left = cabinetInsetLeft;
    let top = cabinetInsetTop + hudHeight;
    const run = this.run;
    if (run.phase === "escape") {
      drawEscape(screen, left, top, escapeTicks - run.phaseTicks);
      drawTextCentered(screen, lapLabel(run.loop + 1), left + cabinetPlayfieldWidth / 2, top + 84, "dark");
      return;
    }
    if (run.phase === "howHigh") {
      drawHowHigh(screen, left, top, run.howHighStack());
      return;
    }
    const floor = run.currentFloor();
    const intro = run.phase === "intro";
    // A stomp shakes the floor: down a pixel every other tick.
    if (run.introShaking() && run.ticks % 2 === 0) top++;
    screen.draw(this.background(), left, top);
    if (intro) drawBentGirders(screen, floor, left, top, run.introTilt());
    drawConveyors(screen, floor, left, top, run.ticks);
    for (const l of run.lifts()) screen.draw(imageLift, left + l.x0, top + l.y);
    floor.bolts.forEach((b, n) => {
      if (run.bolts[n] === true) return;
      const t = run.ticks % 120;
      const glint = t < 18 ? 1 + Math.trunc(t / 6) : 0;
      screen.draw(frame(imageBolt, glint, 10, 14), left + b.x - 5, top + b.y - 14);
    });
    floor.rivets?.forEach((r, n) => {
      if (run.rivets[n] !== true) screen.draw(imageRivet, left + r.x - 4, top + r.y);
    });
    floor.wrenches.forEach((w, n) => {
      if (run.wrenches[n] !== true) screen.draw(imageWrench, left + w.x - 4, top + w.y - 14);
    });
    // Falling at the loop's end, the Gnome tumbles: flipped every 6 ticks.
    const tumbling = run.finalClear() && Math.trunc(run.ticks / 6) % 2 === 0;
    screen.draw(
      frame(imageGnome, gnomeColumn(run), 32, 32),
      left + floor.gnome.x,
      top + run.gnomeY(),
      tumbling ? { flipX: true } : undefined,
    );
    if (floor.furnace !== undefined) {
      // Lit, its flames flicker every 8 ticks.
      const col = run.furnaceLit ? 1 + (Math.trunc(run.ticks / 8) % 2) : 0;
      screen.draw(frame(imageFurnace, col, 16, 24), left + floor.furnace.x - 8, top + floor.furnace.y - 24);
    }
    for (const h of run.hazards) drawHazard(screen, h, floor, left, top, run.ticks);
    // The monkey comes on when the floor starts; losing a life, it spins and falls (deathColumn).
    if (run.phase === "dying") {
      const m = run.monkey;
      screen.draw(frame(imageMonkeyDeath, deathColumn(run.phaseTicks), 16, 24), left + m.x - 8, top + m.y - 24);
    } else if (!intro) {
      drawMonkey(screen, run.monkey, left, top);
      // In its last ticks the wrench flashes: drawn 4 ticks, hidden 4.
      if (run.monkey.wrench > 0 && (!run.wrenchFlashing() || Math.trunc(run.ticks / 4) % 2 === 0))
        drawWrench(screen, run.monkey, left, top, run.ticks);
      if (run.umbrellaPop > 0) drawUmbrella(screen, run.monkey, left, top, run.umbrellaPop);
    }
    for (const s of run.smashes) drawTextCentered(screen, `${s.points}`, left + s.x, top + s.y - 16);
    for (const p of run.popups) drawTextCentered(screen, String(p.points), left + p.x, top + p.y - 22);
    if (run.lapBanner > 0 && run.phase === "play")
      drawTextCentered(screen, lapLabel(run.loop), left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "clear") drawTextCentered(screen, "FLOOR CLEAR!", left + cabinetPlayfieldWidth / 2, top + 20);
    if (run.phase === "over") drawTextCentered(screen, "GAME OVER", left + cabinetPlayfieldWidth / 2, top + 20);
  }

  private drawHud(screen: Surface, left: number, top: number): void {
    for (let x = 0; x < cabinetPlayfieldWidth; x += 32) screen.draw(imageWall, left + x, top);
    const { run } = this;
    screen.draw(hudLabelSprite("scores"), left + scoreLabelsX, top);
    screen.draw(hudLabelSprite("bonus"), left + hud.bonus, top + hud.bonusTop);
    this.scoreDials.draw(screen, left, top);
    this.bonusDial.draw(screen, left, top);
    // Spare lives: the one in play is not counted.
    for (let n = 0; n < run.lives - 1; n++)
      screen.draw(frame(imageMonkey, 0, 16, 16), left + hud.livesLeft + 16 * n, top + hud.livesTop);
    screen.draw(hudLabelSprite("loop"), left + hud.loop, top + hud.loopTop);
    this.loopDial.draw(screen, left, top);
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
      highScore: this.scoreDials.highScore,
      bonus: run.bonus,
      x: m.x,
      y: m.y,
      footing: m.footing,
      vy: m.vy,
      frame: m.frame,
      left: m.left,
      moving: m.moving,
      hazards: run.hazards.map((h) => ({
        kind: h.kind,
        x: h.x,
        y: h.y,
        dir: h.dir,
        footing: h.footing,
        hot: h.hot,
        wild: h.wild,
      })),
      bolts: [...run.bolts],
      rivets: [...run.rivets],
      wrench: m.wrench,
      wrenches: [...run.wrenches],
      smashes: run.smashes.map(({ x, y, points }) => ({ x, y, points })),
      popups: run.popups.map((p) => ({ ...p })),
      furnaceLit: run.furnaceLit,
      gearTimer: run.gearTimer,
      emberTimer: run.emberTimer,
      howHighStack: run.howHighStack(),
      lifts: run.lifts().map((l) => ({ x: l.x0, y: l.y })),
      gnomeY: run.gnomeY(),
    };
  }
}

/** How far each Gnome stands above the one below on the "How high can you get?" screen, in px: on its head. */
const howHighRung = 26;
/** Each floor's height on the "How high can you get?" screen, as Donkey Kong's boards: 25 m. */
const metresPerFloor = 25;
/** The row the bottom Gnome stands on; the question sits under it. */
const howHighGround = 208;

/**
 * The "How high can you get?" screen: `stack` Gnomes stacked up from the
 * floor, each labelled with its height (25 m a floor), the top one with its
 * arms up, and the question beneath them.
 */
function drawHowHigh(screen: Surface, left: number, top: number, stack: number): void {
  const w = cabinetPlayfieldWidth;
  const ground = howHighGround;
  screen.fillRect(left, top, w, cabinetPlayfieldHeight - hudHeight, sweetie.k);
  const x = w / 2 - 16;
  for (let n = 0; n < stack; n++) {
    const y = ground - (n + 1) * howHighRung;
    screen.draw(frame(imageGnome, n === stack - 1 ? 1 : 0, 32, 32), left + x, top + y);
    drawTextCentered(screen, `${(n + 1) * metresPerFloor}M`, left + x + 56, top + y + 12, "yellow");
  }
  drawTextCentered(screen, "HOW HIGH CAN YOU GET?", left + w / 2, top + ground + 16);
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

/** Ticks per quarter turn of the death spin, and the quarter turns in it: twice round. */
const spinTicks = 6;
const spinTurns = 8;
/** Ticks per puff of the downed monkey's smoke. */
const smokeTicks = 8;

/**
 * The death sheet's column `phaseTicks` before the life is lost: the spin,
 * a quarter turn each column (0-3), then the monkey down on its back with
 * its smoke puffing (4, 5).
 */
export function deathColumn(phaseTicks: number): number {
  const elapsed = dyingTicks - phaseTicks;
  const spin = spinTicks * spinTurns;
  if (elapsed < spin) return Math.trunc(elapsed / spinTicks) % 4;
  return 4 + (Math.trunc((elapsed - spin) / smokeTicks) % 2);
}

/** The Gnome's sheet column: reaching as it climbs (in the intro and away from a clear) and as it hops to stomp, arms up as it throws and as it falls at the loop's end, else idle. */
export function gnomeColumn(run: Run): number {
  if (run.finalClear()) return 1;
  if (run.introGnomeRise() > 0 || run.gnomeClimbing()) return Math.trunc(run.ticks / 10) % 2 === 0 ? 2 : 0;
  if (run.introHop() > 0) return 2;
  return run.gnomeThrowing() ? 1 : 0;
}

/**
 * The intro's girders, `tilt` of the way (0 to 1) from flat to their slopes:
 * each sloped girder in the background is papered over with wall, then drawn
 * again from its tiles, turning about its middle.
 */
function drawBentGirders(screen: Surface, floor: Floor, left: number, top: number, tilt: number): void {
  if (tilt >= 1) return;
  const wall = imageWall.w;
  for (const g of floor.girders) {
    if (g.drop === 0 || g.belt !== undefined) continue;
    const middle = girderTop(g, (g.x0 + g.x1) / 2);
    for (let x = g.x0; x < g.x1; x += 8) {
      const y0 = girderTop(g, x);
      for (let y = y0; y < y0 + 8; y++)
        screen.draw(sub(imageWall, x % wall, y % wall, (x % wall) + 8, (y % wall) + 1), left + x, top + y);
    }
    for (let x = g.x0; x < g.x1; x += 8)
      screen.draw(imageGirder, left + x, top + Math.round(middle + tilt * (girderTop(g, x) - middle)));
  }
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

/**
 * The umbrella that just saved the monkey (#268), at twice its prize size
 * over the monkey's head: furled for its first ticks, then open until it goes.
 */
function drawUmbrella(screen: Surface, m: Monkey, left: number, top: number, pop: number): void {
  const open = umbrellaPopTicks - pop >= umbrellaFurledTicks;
  screen.draw(frame(imageUmbrella, open ? 1 : 0, 8, 8), left + m.x - 8, top + m.y - 32, { scale: 2 });
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

function drawHazard(screen: Surface, h: Hazard, floor: Floor, left: number, top: number, ticks: number): void {
  if (h.kind === "spring") {
    // Squashed as it lands on the Gnome's girder, stretched in flight.
    const { springs } = floor;
    const landing = springs !== undefined && h.x < springs.dropX && h.y >= springs.y - 3;
    screen.draw(frame(imageSpring, landing ? 1 : 0, 12, 12), left + h.x - 6, top + h.y - 12);
    return;
  }
  // A pan's scraps jolt as it rides; a hot gear turns in the gear sheet's last two frames.
  const turn = Math.trunc(Math.abs(h.x) / 4) % 2;
  const [image, col] =
    h.kind === "gear"
      ? [imageGear, turn + (h.hot ? 2 : 0)]
      : h.kind === "pan"
        ? [imagePan, turn]
        : [imageEmber, Math.trunc(ticks / 8) % 4];
  screen.draw(frame(image, col, 12, 12), left + h.x - 6, top + h.y - 12);
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
