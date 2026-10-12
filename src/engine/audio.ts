// Sounds (D4, D5, D12). Port of internal/assets/web.go. T3 (engine) owns the
// browser half; the recorder half below is the contract porters and parity
// tests rely on, and it works with no DOM.

export type SoundName = "melody" | "start" | "power" | "death" | "laser" | "boom";
export type SoundAction = "play" | "pause" | "rewind";
/** Recorded as `"<action>:<name>"`, e.g. `"rewind:laser"`, `"pause:melody"`. */
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

  constructor(
    readonly name: SoundName,
    readonly url: string,
    readonly loop: boolean,
  ) {}

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

  private emit(action: SoundAction): void {
    const e: SoundEvent = `${action}:${this.name}`;
    for (const fn of listeners) fn(e);
  }
}

/**
 * Browser only: create an `HTMLAudioElement` per sound, set `ready` on
 * `canplaythrough`. Never awaited (D5).
 */
export function loadSounds(list: readonly Sound[]): void {
  void list;
  throw new Error("TODO");
}

/**
 * Browser only: install the first-keydown/pointerdown unlock (`play()` then
 * `pause()` on each element, promises caught).
 */
export function installAudioUnlock(list: readonly Sound[]): void {
  void list;
  throw new Error("TODO");
}
