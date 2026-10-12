// Port of internal/hive/digit_reel.go.

import type { HiveSoftware } from "./software.ts";

/** How long one digit spends scrolling from → to at 60 FPS. */
export const digitReelDurationFrames = 18;

export type Digits6 = [number, number, number, number, number, number];

export function digits6(value: number): Digits6 {
  if (value < 0) {
    value = 0;
  }
  if (value > 999_999) {
    value = 999_999;
  }
  return [
    Math.trunc(value / 100_000),
    Math.trunc((value % 100_000) / 10_000),
    Math.trunc((value % 10_000) / 1_000),
    Math.trunc((value % 1_000) / 100),
    Math.trunc((value % 100) / 10),
    value % 10,
  ];
}

/** Go `1 - math.Pow(1-t, 3)`, which Go computes as `u*(u*u)` (fact 3). */
export function easeDialOut(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  const u = 1 - t;
  return 1 - u * (u * u);
}

/** Spins one decimal column vertically (previous digit exits upward, next rises from below). */
export class DigitReel {
  /** 0-9 shown when idle. */
  settledDigit = 0;
  active = false;
  /** Spin endpoints during active. */
  from = 0;
  to = 0;
  t = 0;

  boot(digit: number): void {
    this.active = false;
    this.t = 0;
    let d = digit % 10;
    if (d < 0) {
      d += 10;
    }
    this.settledDigit = d;
  }

  syncTarget(target: number): void {
    target %= 10;
    if (target < 0) {
      target = -target % 10;
    }
    if (this.active) {
      return;
    }
    if (this.settledDigit === target) {
      return;
    }
    this.from = this.settledDigit;
    this.to = target;
    this.active = true;
    this.t = 0;
  }

  stepFrame(): void {
    if (!this.active) {
      return;
    }
    this.t += 1 / digitReelDurationFrames;
    if (this.t >= 1) {
      this.t = 1;
      this.settledDigit = this.to;
      this.active = false;
    }
  }

  /** Eased 0 = start of spin, 1 = finished showing the new digit. Idle columns return 1. */
  scroll01(): number {
    if (!this.active) {
      return 1;
    }
    return easeDialOut(this.t);
  }
}

export type DigitReels = [DigitReel, DigitReel, DigitReel, DigitReel, DigitReel, DigitReel];

export function newDigitReels(): DigitReels {
  return [new DigitReel(), new DigitReel(), new DigitReel(), new DigitReel(), new DigitReel(), new DigitReel()];
}

function syncAndTick(reels: DigitReels, target: Digits6): void {
  for (let i = 0; i < 6; i++) {
    reels[i]?.syncTarget(target[i] ?? 0);
  }
  for (const r of reels) {
    r.stepFrame();
  }
}

export function syncAndTickScoreRollingDials(s: HiveSoftware): void {
  syncAndTick(s.scoreDial, digits6(s.scoreValue));
}

export function syncAndTickHighScoreRollingDials(s: HiveSoftware): void {
  syncAndTick(s.highScoreDial, digits6(Math.max(s.scoreValue, s.highScore)));
}
