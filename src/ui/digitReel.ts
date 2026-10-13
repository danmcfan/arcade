// Port of internal/hive/digit_reel.go: the slot-machine digit effect. Sweet
// Sam's score dials and the payout menu both spin their digits with it.

/** How long one digit spends scrolling from → to at 60 FPS. */
export const digitReelDurationFrames = 18;

export type Digits6 = [number, number, number, number, number, number];

export function digits6(value: number): Digits6 {
  let v = value;
  if (v < 0) {
    v = 0;
  }
  if (v > 999_999) {
    v = 999_999;
  }
  return [
    Math.trunc(v / 100_000),
    Math.trunc((v % 100_000) / 10_000),
    Math.trunc((v % 10_000) / 1_000),
    Math.trunc((v % 1_000) / 100),
    Math.trunc((v % 100) / 10),
    v % 10,
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
    let digit = target % 10;
    if (digit < 0) {
      digit = -digit % 10;
    }
    if (this.active) {
      return;
    }
    if (this.settledDigit === digit) {
      return;
    }
    this.from = this.settledDigit;
    this.to = digit;
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

/** Point each reel at its digit of `target` (a spin starts on idle reels only), then advance every reel one tick. */
export function syncAndTick(reels: DigitReels, target: Digits6): void {
  for (let i = 0; i < 6; i++) {
    reels[i]?.syncTarget(target[i] ?? 0);
  }
  for (const r of reels) {
    r.stepFrame();
  }
}

/** Settle every reel on its digit of `value` at once, with no spin. */
export function bootReels(reels: DigitReels, value: number): void {
  const d = digits6(value);
  reels.forEach((r, i) => {
    r.boot(d[i] ?? 0);
  });
}
