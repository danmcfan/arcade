import { afterEach, describe, expect, test } from "bun:test";
import { Sound, addSoundListener, installAudioUnlock, loadSounds, type SoundEvent } from "./audio.ts";

/** Stand-in for HTMLAudioElement: records calls; `play()` rejects like a blocked autoplay. */
class FakeAudio {
  calls: string[] = [];
  src = "";
  loop = false;
  preload = "";
  paused = true;
  currentTime = 5;
  private readonly listeners = new Map<string, () => void>();
  constructor(private readonly reject = true) {}
  play(): Promise<void> {
    this.calls.push("play");
    return this.reject ? Promise.reject(new DOMException("blocked", "NotAllowedError")) : Promise.resolve();
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

const asElement = (a: FakeAudio) => a as unknown as HTMLAudioElement;

/** Count unhandled promise rejections while `fn` runs and settles. */
async function unhandledDuring(fn: () => void): Promise<number> {
  let count = 0;
  const onRejection = () => {
    count++;
  };
  process.on("unhandledRejection", onRejection);
  try {
    fn();
    await new Promise((r) => setTimeout(r, 10));
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
    unsubscribe = addSoundListener((e) => events.push(e));
    const fake = new FakeAudio();
    const s = new Sound("laser", "laser.wav", false);
    s.element = asElement(fake);
    s.rewind();
    s.play();
    s.pause();
    expect(events).toEqual(["rewind:laser", "play:laser", "pause:laser"]);
    expect(fake.calls).toEqual([]);
    expect(fake.currentTime).toBe(5);
  });

  test("once ready, calls reach the element", () => {
    const fake = new FakeAudio(false);
    const s = new Sound("boom", "boom.wav", false);
    s.element = asElement(fake);
    s.ready = true;
    s.rewind();
    s.play();
    s.pause();
    expect(fake.currentTime).toBe(0);
    expect(fake.calls).toEqual(["play", "pause"]);
  });

  test("a rejected play() promise does not surface as an unhandled rejection", async () => {
    const s = new Sound("start", "start.wav", false);
    s.element = asElement(new FakeAudio(true));
    s.ready = true;
    expect(await unhandledDuring(() => s.play())).toBe(0);
  });

  test("without a DOM a Sound is a recorder only and never throws", () => {
    const s = new Sound("melody", "melody.ogg", true);
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
    const melody = new Sound("melody", "melody.ogg", true);
    const laser = new Sound("laser", "laser.wav", false);
    loadSounds([melody, laser], () => {
      const a = new FakeAudio();
      made.push(a);
      return asElement(a);
    });
    expect(made.map((a) => [a.src, a.loop])).toEqual([
      ["melody.ogg", true],
      ["laser.wav", false],
    ]);
    expect(melody.ready).toBe(false);
    made[0]?.fire("canplaythrough");
    expect(melody.ready).toBe(true);
    expect(laser.ready).toBe(false);
  });

  test("is a no-op with no Audio constructor (bun test has no DOM)", () => {
    const s = new Sound("power", "power.wav", false);
    expect(() => loadSounds([s])).not.toThrow();
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
    const sa = new Sound("melody", "m.ogg", true);
    const sb = new Sound("laser", "l.wav", false);
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
    const s = new Sound("melody", "m.ogg", true);
    s.element = asElement(playing);
    installAudioUnlock([s], target);
    target.listeners.get("pointerdown")?.();
    expect(playing.calls).toEqual([]);
  });
});
