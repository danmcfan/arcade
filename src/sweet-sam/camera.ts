// Port of the Go port's Sweet Sam camera.go.

import * as rng from "../engine/rng.ts";

// Preset screen shake for picking up a power pellet (~0.10s at 60 ticks/s).
export const cameraShakePowerPelletTicks = 6; // ticks, 100ms
export const cameraShakePowerPelletIntensity = 4.0; // pixels

// Preset screen shake when the player eats a bee while it is vulnerable (~0.15s at 60 ticks/s; twice pellet intensity).
export const cameraShakeEnemyEatTicks = 9; // ticks, 150ms
export const cameraShakeEnemyEatIntensity = 8.0; // pixels

/** Drives camera-style effects (screen shake). */
export class CameraSystem {
  shakeTicksRemaining = 0;
  shakeIntensity = 0;
  shakeOffsetX = 0;
  shakeOffsetY = 0;

  /**
   * Queues a shake lasting durationTicks update calls. A new request replaces
   * any in-progress shake.
   */
  requestScreenShake(durationTicks: number, intensity: number): void {
    if (durationTicks <= 0) {
      return;
    }
    this.shakeTicksRemaining = durationTicks;
    this.shakeIntensity = intensity;
  }

  /** Ticks down timers and recomputes per-frame jitter. Call once per game tick. */
  update(): void {
    if (this.shakeTicksRemaining <= 0) {
      this.shakeTicksRemaining = 0;
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    this.shakeOffsetX = (rng.float() * 2.0 - 1.0) * this.shakeIntensity;
    this.shakeOffsetY = (rng.float() * 2.0 - 1.0) * this.shakeIntensity;
    this.shakeTicksRemaining--;
  }

  /** Translation to apply on top of the normal playfield margin. */
  cameraOffset(): [number, number] {
    return [this.shakeOffsetX, this.shakeOffsetY];
  }
}
