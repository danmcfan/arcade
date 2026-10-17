import { afterEach, describe, expect, test } from "bun:test";
import { Sound, addSoundListener, installAudioUnlock, loadSounds, type SoundEvent } from "./audio.ts";

/** Stand-in for HTMLAudioElement: records calls; `play()` rejects like a blocked autoplay. */
class FakeAudio {
  calls: string[] = [];
  src = "";
  loop = false;
  volume = 1;
  preload = "";
  paused = true;
  currentTime = 5;
  private readonly listeners = new Map<string, () => void>();
  private readonly reject: boolean;

  constructor(reject: boolean = true) {
    this.reject = reject;
  }
  async play(): Promise<void> {
    this.calls.push("play");
    await Promise.resolve();
    if (this.reject) throw new DOMException("blocked", "NotAllowedError");
  }
  pause(): void {
    this.calls.push("pause");
  }
  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, fn);
  }
  fire(type: string): void {
    this.listeners.get(type)?.();
  }
}

/** Lets a FakeAudio stand in for the DOM element; it checks the members Sound uses. */
function standsInForAudio(a: FakeAudio | HTMLAudioElement): a is HTMLAudioElement {
  return typeof a.play === "function" && typeof a.pause === "function" && typeof a.addEventListener === "function";
}

function asElement(a: FakeAudio): HTMLAudioElement {
  if (!standsInForAudio(a)) throw new Error("FakeAudio lacks the members Sound uses");
  return a;
}

/** Count unhandled promise rejections while `fn` runs and settles. */
async function unhandledDuring(fn: () => void): Promise<number> {
  let count = 0;
  const onRejection = (): void => {
    count++;
  };
  process.on("unhandledRejection", onRejection);
  try {
    fn();
    await new Promise((r) => {
      setTimeout(r, 10);
    });
  } finally {
    process.off("unhandledRejection", onRejection);
  }
  return count;
}

let unsubscribe: (() => void) | null = null;
afterEach(() => {
  unsubscribe?.();
  unsubscribe = null;
});

describe("Sound (D4: web.go semantics)", () => {
  test("calls are recorded but ignored until ready", () => {
    const events: SoundEvent[] = [];
    unsubscribe = addSoundListener((e) => {
      events.push(e);
    });
    const fake = new FakeAudio();
    const s = new Sound("spark", "spark.wav", false);
    s.element = asElement(fake);
    s.rewind();
    s.play();
    s.pause();
    expect(events).toEqual(["rewind:spark", "play:spark", "pause:spark"]);
    expect(fake.calls).toEqual([]);
    expect(fake.currentTime).toBe(5);
  });

  test("once ready, calls reach the element", () => {
    const fake = new FakeAudio(false);
    const s = new Sound("spark", "spark.wav", false);
    s.element = asElement(fake);
    s.ready = true;
    s.rewind();
    s.play();
    s.pause();
    expect(fake.currentTime).toBe(0);
    expect(fake.calls).toEqual(["play", "pause"]);
  });

  test("a rejected play() promise does not surface as an unhandled rejection", async () => {
    const s = new Sound("sweetStart", "sweet-sam-start.wav", false);
    s.element = asElement(new FakeAudio(true));
    s.ready = true;
    expect(
      await unhandledDuring(() => {
        s.play();
      }),
    ).toBe(0);
  });

  test("without a DOM a Sound is a recorder only and never throws", () => {
    const s = new Sound("hub", "hub.wav", true);
    expect(() => {
      s.play();
      s.pause();
      s.rewind();
    }).not.toThrow();
  });
});

describe("loadSounds (D5: never awaited)", () => {
  test("creates one element per sound and sets ready on canplaythrough", () => {
    const made: FakeAudio[] = [];
    const hub = new Sound("hub", "hub.wav", true, 0.3);
    const spark = new Sound("spark", "spark.wav", false);
    loadSounds([hub, spark], () => {
      const a = new FakeAudio();
      made.push(a);
      return asElement(a);
    });
    expect(made.map((a) => [a.src, a.loop, a.volume])).toEqual([
      ["hub.wav", true, 0.3],
      ["spark.wav", false, 1],
    ]);
    expect(hub.ready).toBe(false);
    made[0]?.fire("canplaythrough");
    expect(hub.ready).toBe(true);
    expect(spark.ready).toBe(false);
  });

  test("is a no-op with no Audio constructor (bun test has no DOM)", () => {
    const s = new Sound("sweetBee", "sweet-sam-bee.wav", false);
    expect(() => {
      loadSounds([s]);
    }).not.toThrow();
    expect(s.element).toBeNull();
  });
});

describe("installAudioUnlock", () => {
  class FakeTarget {
    readonly listeners = new Map<string, () => void>();
    addEventListener(type: string, fn: () => void): void {
      this.listeners.set(type, fn);
    }
    removeEventListener(type: string): void {
      this.listeners.delete(type);
    }
  }

  test("first keydown plays then pauses each element, swallowing rejections, once", async () => {
    const target = new FakeTarget();
    const a = new FakeAudio(true);
    const b = new FakeAudio(true);
    const sa = new Sound("hub", "h.wav", true);
    const sb = new Sound("spark", "l.wav", false);
    sa.element = asElement(a);
    sb.element = asElement(b);
    installAudioUnlock([sa, sb], target);
    const unhandled = await unhandledDuring(() => target.listeners.get("keydown")?.());
    expect(unhandled).toBe(0);
    expect(a.calls).toEqual(["play", "pause"]);
    expect(b.calls).toEqual(["play", "pause"]);
    expect(target.listeners.size).toBe(0);
  });

  test("pointerdown also unlocks; an element already playing is left playing", () => {
    const target = new FakeTarget();
    const playing = new FakeAudio(false);
    playing.paused = false;
    const s = new Sound("hub", "h.wav", true);
    s.element = asElement(playing);
    installAudioUnlock([s], target);
    target.listeners.get("pointerdown")?.();
    expect(playing.calls).toEqual([]);
  });
});

describe("Sound.blip", () => {
  test("rewinds, then plays", () => {
    const events: SoundEvent[] = [];
    const off = addSoundListener((e) => {
      events.push(e);
    });
    new Sound("move", "move.wav", false).blip();
    off();
    expect(events).toEqual(["rewind:move", "play:move"]);
  });
});
