// Sounds (D4, D5, D12). Port of internal/assets/web.go. T3 (engine) owns the
// browser half; the recorder half below is the contract porters and parity
// tests rely on, and it works with no DOM.

export type SoundName =
  | "hub"
  | "screenOn"
  | "attractBrassMonkey"
  | "attractSweet"
  | "attractFirefly"
  | "start"
  | "power"
  | "death"
  | "spark"
  | "hit"
  | "lifeLost"
  | "stage"
  | "title"
  | "move"
  | "select"
  | "ticket"
  | "deny";
export type SoundAction = "play" | "pause" | "rewind";
/** Recorded as `"<action>:<name>"`, e.g. `"rewind:spark"`, `"pause:hub"`. */
export type SoundEvent = `${SoundAction}:${SoundName}`;

type Listener = (e: SoundEvent) => void;
const listeners = new Set<Listener>();

/**
 * Subscribe to every sound call (the TS twin of Go's harness-only
 * `assets.OnSoundEvent`). Events fire **before** the `ready` check, so they are
 * recorded with no DOM and before audio is unlocked. Returns an unsubscribe.
 *
 * The top-level `Game` uses this to fill `GameSnapshot.sounds` with the events
 * of the current tick; the test hook uses it for `__arcade.sounds()`.
 */
export function addSoundListener(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Same `play/pause/rewind` semantics as web.go: calls are ignored (but still
 * recorded) until the element fires `canplaythrough` and sets `ready`.
 * Without a DOM a `Sound` is a recorder only.
 */
export class Sound {
  /** Set by `loadSounds()` in the browser only. */
  element: HTMLAudioElement | null = null;
  ready = false;

  readonly name: SoundName;
  readonly url: string;
  readonly loop: boolean;
  /** 0 to 1: how loud the browser plays it. */
  readonly volume: number;

  constructor(name: SoundName, url: string, loop: boolean, volume = 1) {
    this.name = name;
    this.url = url;
    this.loop = loop;
    this.volume = volume;
  }

  /** True while the browser is actually playing it (never without a DOM). */
  get playing(): boolean {
    return this.element !== null && !this.element.paused;
  }

  play(): void {
    this.emit("play");
    if (!this.ready || this.element === null) return;
    // D4: Go ignored the promise; an unhandled rejection would log an error.
    this.element.play().catch(() => {});
  }

  pause(): void {
    this.emit("pause");
    if (!this.ready || this.element === null) return;
    this.element.pause();
  }

  rewind(): void {
    this.emit("rewind");
    if (!this.ready || this.element === null) return;
    this.element.currentTime = 0;
  }

  /** Rewind and play: restarts a short sound effect even if it is still playing. */
  blip(): void {
    this.rewind();
    this.play();
  }

  private emit(action: SoundAction): void {
    const e: SoundEvent = `${action}:${this.name}`;
    for (const fn of listeners) fn(e);
  }
}

function defaultAudio(): HTMLAudioElement | null {
  return typeof Audio === "undefined" ? null : new Audio();
}

/**
 * Browser only: create an `HTMLAudioElement` per sound, set `ready` on
 * `canplaythrough`. Never awaited (D5): sounds stay silent until ready, as in
 * web.go. A no-op where there is no `Audio` (bun test). `create` is a seam for
 * tests.
 */
export function loadSounds(list: readonly Sound[], create: () => HTMLAudioElement | null = defaultAudio): void {
  for (const sound of list) {
    const el = create();
    if (el === null) return;
    el.preload = "auto";
    el.loop = sound.loop;
    el.volume = sound.volume;
    el.addEventListener("canplaythrough", () => {
      sound.ready = true;
    });
    el.src = sound.url;
    sound.element = el;
  }
}

/** The subset of `EventTarget` used by `installAudioUnlock`. */
export interface UnlockTarget {
  addEventListener(type: string, fn: () => void, opts?: AddEventListenerOptions): void;
  removeEventListener(type: string, fn: () => void, opts?: EventListenerOptions): void;
}

/**
 * Browser only: on the first keydown or pointerdown, "unlock" audio by
 * calling `play()` then `pause()` on each element that is not already
 * playing. Every play promise is caught (D4): the immediate `pause()` makes
 * it reject with `AbortError`, and a blocked one rejects with
 * `NotAllowedError`. Runs once, then removes its listeners.
 */
export function installAudioUnlock(list: readonly Sound[], target: UnlockTarget = window): void {
  const unlock = (): void => {
    target.removeEventListener("keydown", unlock, { capture: true });
    target.removeEventListener("pointerdown", unlock, { capture: true });
    for (const sound of list) {
      const el = sound.element;
      if (el === null || !el.paused) continue;
      el.play().catch(() => {});
      el.pause();
    }
  };
  target.addEventListener("keydown", unlock, { capture: true });
  target.addEventListener("pointerdown", unlock, { capture: true });
}
