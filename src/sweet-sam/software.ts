// Port of the Go Sweet Sam minigame's software.go (docs/port-notes.md gives its
// old Go name). Its constants live in ./constants.ts.

import type { Input } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imageSweetSamMaze, sounds } from "../engine/assets.ts";
import { playSound } from "../engine/audio.ts";
import type { FixedViewport } from "../game/software.ts";
import type { SweetSamDialSnapshot, SweetSamSnapshot } from "../game/snapshot.ts";
import { CameraSystem } from "./camera.ts";
import { ParticleSystem } from "./particle.ts";
import { cabinetHeight, cabinetWidth } from "../ui/cabinet.ts";
import { type DigitReel } from "../ui/digitReel.ts";
import { ScoreDials } from "../ui/dials.ts";
import { scoreDialsAt } from "../ui/hudArt.ts";
import type { LevelEffect } from "./levelEffect.ts";
import { Level, type LevelSetup } from "./level.ts";
import { draw } from "./draw.ts";
import { noAdvantages, type SweetSamAdvantages } from "./advantages.ts";

/**
 * A thin adapter from the Level loop (level.ts) onto Software (#271): it
 * plays the Level's sounds, shakes the camera, bursts the particles and rolls
 * the score dials.
 */
export class SweetSamSoftware implements FixedViewport {
  readonly name = "sweetSam";

  readonly camera = new CameraSystem();
  readonly particles = new ParticleSystem();
  readonly level: Level;
  /** The Score and high score on the maze's second tile row, under 1UP and HIGH SCORE. */
  readonly dials: ScoreDials;

  /** `setup` starts the Level mid-PLAY from a described position (level.ts). */
  constructor(highscore: number, advantages: Readonly<SweetSamAdvantages> = noAdvantages, setup?: LevelSetup) {
    this.dials = new ScoreDials(highscore, scoreDialsAt);
    this.level = new Level(
      advantages,
      (e) => {
        this.effect(e);
      },
      setup,
    );
  }

  private effect(e: LevelEffect): void {
    switch (e.kind) {
      case "sound":
        playSound(sounds[e.sound]);
        break;
      case "shake":
        this.camera.requestScreenShake(e.ticks, e.intensity);
        break;
      case "burst":
        this.particles.spawnBurst(e.x, e.y, e.color, e.count);
        break;
    }
  }

  /** Go `Score()`. */
  score(): number {
    return this.level.score();
  }

  background(): Sprite {
    return imageSweetSamMaze;
  }

  fixedViewportSize(): [number, number] {
    return [cabinetWidth, cabinetHeight];
  }

  /**
   * Go `Update`. The order is part of the spec (Go's joystick step drew only
   * the cabinet's joystick, gone since #113): camera (rand), particles, the
   * Level (pelletAnimTick, state machine, popups), dials.
   */
  update(i: Input): void {
    this.camera.update();
    this.particles.update();
    this.level.step(i);
    this.dials.tick(this.level.score());
  }

  /** Test hook: start `level` from READY!, as a level clear would. */
  jumpTo(level: number): void {
    this.level.jumpTo(level);
  }

  draw(screen: Surface, _buffer: number): void {
    draw(this, screen);
  }

  gameOver(): boolean {
    return this.level.gameOver();
  }

  snapshot(): SweetSamSnapshot {
    return {
      ...this.level.snapshot(),
      highScore: this.dials.highScore,
      shake: [
        this.camera.shakeOffsetX,
        this.camera.shakeOffsetY,
        this.camera.shakeTicksRemaining,
        this.camera.shakeIntensity,
      ],
      particlesActive: this.particles.activeCount(),
      dials: [...this.dials.score.reels.map(dial), ...this.dials.high.reels.map(dial)],
    };
  }
}

function dial(r: DigitReel): SweetSamDialSnapshot {
  return [r.settledDigit, r.active, r.from, r.to, r.t];
}
