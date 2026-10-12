// DOM key tracking (D3). Key events update a live `Set<code>`; the loop
// samples it once per fixed tick. "Just pressed" means in this tick's sample
// but not the previous tick's, mirroring the Go engine's
// `inpututil.AppendPressedKeys` / `AppendJustPressedKeys`. A press and
// release that both land between two ticks is not seen, as in the Go engine.

export interface KeySample {
  /** Every key (`KeyboardEvent.code`) held this tick. */
  readonly pressed: ReadonlySet<string>;
  /** Keys held this tick that were not held last tick. */
  readonly justPressed: ReadonlySet<string>;
}

export class KeyTracker {
  private readonly down = new Set<string>();
  /** Keys hidden by `ignoreHeld()` until their keyup. */
  private readonly ignored = new Set<string>();
  private previous: ReadonlySet<string> = new Set();

  keyDown(code: string): void {
    if (!this.ignored.has(code)) this.down.add(code);
  }

  keyUp(code: string): void {
    this.down.delete(code);
    this.ignored.delete(code);
  }

  /** Release every key (window blur, page hidden). */
  clear(): void {
    this.down.clear();
    this.ignored.clear();
  }

  /**
   * Hide every key held now, auto-repeat included, until it is released: the
   * key that dismissed the keyboard notice must not also act on the scene.
   */
  ignoreHeld(): void {
    for (const code of this.down) this.ignored.add(code);
    this.down.clear();
  }

  /** Call exactly once per tick. */
  sample(): KeySample {
    const pressed = new Set(this.down);
    const justPressed = new Set<string>();
    for (const code of pressed) if (!this.previous.has(code)) justPressed.add(code);
    this.previous = pressed;
    return { pressed, justPressed };
  }
}

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

/** Arrows and Space would scroll the page (D3). */
export function shouldPreventDefault(code: string): boolean {
  return SCROLL_KEYS.has(code);
}

const KEY_TO_CODE: Readonly<Record<string, string>> = {
  " ": "Space",
  Spacebar: "Space",
  Shift: "ShiftLeft",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Esc: "Escape",
};

/**
 * `KeyboardEvent.code`, or a best guess from `key` when `code` is empty.
 * Real keyboards always set `code`; synthetic CDP key events (agent-browser
 * `press`/`keydown`) may only set `key`.
 */
export function eventCode(e: Pick<KeyboardEvent, "code" | "key">): string {
  if (e.code) return e.code;
  const k = e.key;
  if (/^[a-z]$/i.test(k)) return `Key${k.toUpperCase()}`;
  return KEY_TO_CODE[k] ?? k;
}

/** The subset of `EventTarget` used here, so tests can pass fakes. */
export interface ListenerTarget {
  addEventListener(type: string, fn: (e: Event) => void): void;
  removeEventListener(type: string, fn: (e: Event) => void): void;
}

/**
 * Wire `keys` to the page: keydown/keyup on `win`, cleared on `blur` and when
 * `doc` becomes hidden. Returns a function that removes every listener.
 */
export function installKeyboard(
  keys: KeyTracker,
  win: ListenerTarget = window,
  doc: ListenerTarget = document,
  isHidden: () => boolean = () => document.hidden,
): () => void {
  const onDown = (e: Event): void => {
    const k = e as KeyboardEvent;
    const code = eventCode(k);
    if (shouldPreventDefault(code)) k.preventDefault();
    keys.keyDown(code);
  };
  const onUp = (e: Event): void => {
    const k = e as KeyboardEvent;
    const code = eventCode(k);
    if (shouldPreventDefault(code)) k.preventDefault();
    keys.keyUp(code);
  };
  const onBlur = (): void => keys.clear();
  const onVisibility = (): void => {
    if (isHidden()) keys.clear();
  };
  win.addEventListener("keydown", onDown);
  win.addEventListener("keyup", onUp);
  win.addEventListener("blur", onBlur);
  doc.addEventListener("visibilitychange", onVisibility);
  return () => {
    win.removeEventListener("keydown", onDown);
    win.removeEventListener("keyup", onUp);
    win.removeEventListener("blur", onBlur);
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}
