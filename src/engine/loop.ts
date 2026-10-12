// Fixed-step loop (D2): requestAnimationFrame + an accumulator at 1/60 s,
// at most 5 catch-up updates per frame, any time beyond the cap discarded,
// one draw per frame. `FixedStepClock` is the pure, testable core.

/** One Go engine tick: 60 TPS (fact 2). */
export const TICK_MS = 1000 / 60;
export const MAX_UPDATES_PER_FRAME = 5;

/**
 * rAF timestamps jitter around the refresh period. A frame that arrives up to
 * this early still counts as a full tick (the deficit is carried as negative
 * accumulated time), so 60 Hz displays run exactly one update per frame
 * instead of an occasional 0-then-2 pattern. The long-run rate stays 60 TPS.
 */
const EARLY_SLACK_MS = 1;

export class FixedStepClock {
  private last: number | null = null;
  private acc = 0;

  /**
   * Feed a frame timestamp (ms); returns how many fixed updates to run now.
   * The first call after construction or `reset()` only starts the clock.
   */
  advance(now: number): number {
    if (this.last === null) {
      this.last = now;
      this.acc = 0;
      return 0;
    }
    const dt = Math.max(0, now - this.last);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= TICK_MS - EARLY_SLACK_MS && n < MAX_UPDATES_PER_FRAME) {
      this.acc -= TICK_MS;
      n++;
    }
    // D2: no backlog after a stall or a tab switch.
    if (this.acc >= TICK_MS - EARLY_SLACK_MS) this.acc = 0;
    return n;
  }

  /** Forget the previous timestamp, e.g. when resuming from a pause. */
  reset(): void {
    this.last = null;
    this.acc = 0;
  }
}

export interface LoopCallbacks {
  /** One fixed tick. */
  update(): void;
  /** Once per animation frame, after the updates. */
  draw(): void;
}

export interface LoopControl {
  /** Stop running updates (drawing continues). */
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  /** Cancel the animation frame loop entirely. */
  stop(): void;
}

/** Browser only: drive `callbacks` from `requestAnimationFrame`. */
export function startLoop(callbacks: LoopCallbacks): LoopControl {
  const clock = new FixedStepClock();
  let paused = false;
  let handle = 0;

  const frame = (now: number): void => {
    handle = requestAnimationFrame(frame);
    if (!paused) {
      const n = clock.advance(now);
      for (let i = 0; i < n; i++) callbacks.update();
    }
    callbacks.draw();
  };
  handle = requestAnimationFrame(frame);

  return {
    pause() {
      paused = true;
    },
    resume() {
      if (paused) clock.reset();
      paused = false;
    },
    get paused() {
      return paused;
    },
    stop() {
      cancelAnimationFrame(handle);
    },
  };
}
