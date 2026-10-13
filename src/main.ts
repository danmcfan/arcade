// Browser entry point: preload images (D5), pick the scene from `?scene=` (default: title)
// via `createScene` (src/game/registry.ts), run the fixed-step loop (D2), and
// install `window.__arcade` when `?debug` is present (D7). On a touch-first
// device it first shows the "needs a keyboard" notice; any key press
// dismisses it, and that press is hidden from the title scene.

import { allImages, allSounds, loadImages } from "./engine/assets.ts";
import { installAudioUnlock, loadSounds } from "./engine/audio.ts";
import { looksTouchFirst, readPointer } from "./engine/device.ts";
import { readInput } from "./engine/input.ts";
import { KeyTracker, installKeyboard } from "./engine/keyboard.ts";
import { startLoop, type LoopControl } from "./engine/loop.ts";
import * as rng from "./engine/rng.ts";
import { Runtime } from "./engine/runtime.ts";
import { fitScale } from "./engine/scale.ts";
import { Surface } from "./engine/surface.ts";
import { installTestHook } from "./engine/testhook.ts";
import { createScene } from "./game/registry.ts";
import type { SceneName } from "./game/software.ts";
import { localStorageStore } from "./title/save.ts";
import { drawNotice, noticeHeight, noticeWidth } from "./ui/notice.ts";

const SCENES: readonly SceneName[] = ["title", "game", "wave", "lumberjack"];

type Notice = "up" | "dismissed" | null;

/**
 * The keyboard notice: shown until a key goes down. The scene below is
 * built but neither stepped nor drawn while it is up.
 */
function openNotice(): { state: Notice } {
  const notice: { state: Notice } = {
    state: looksTouchFirst({
      coarseNoHover: readPointer((q) => window.matchMedia(q)),
      width: window.innerWidth,
      height: window.innerHeight,
    })
      ? "up"
      : null,
  };
  if (notice.state !== null)
    window.addEventListener(
      "keydown",
      () => {
        notice.state = "dismissed";
      },
      { once: true },
    );
  return notice;
}

/** The scene runtime; the title scene keeps its save in localStorage, also when the test hook loads it. */
function newRuntime(): Runtime {
  const store = localStorageStore();
  const runtime = new Runtime((name, opts) => createScene(name, { store, ...opts }));
  let unmountOverlay: (() => void) | null = null;
  runtime.onReplace((next) => {
    unmountOverlay?.();
    unmountOverlay = next.mountOverlay?.(document.body) ?? null;
  });
  return runtime;
}

/** Save "Continue" progress when the tab is closed or hidden. */
function installPersist(runtime: Runtime): void {
  const persist = (): void => runtime.scene.persist?.();
  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
}

/** Draws a frame: the notice while it is up, else the scene. */
function newDraw(canvas: HTMLCanvasElement, screen: Surface, runtime: Runtime, notice: { state: Notice }): () => void {
  // D1: logical-resolution canvas, CSS-upscaled by an integer device-pixel factor.
  let fitKey = "";
  const present = (): void => {
    const [w, h] = notice.state ? [noticeWidth, noticeHeight] : runtime.scene.layout();
    screen.resize(w, h);
    const dpr = window.devicePixelRatio || 1;
    const key = `${w}x${h}@${window.innerWidth}x${window.innerHeight}@${dpr}`;
    if (key === fitKey) return;
    fitKey = key;
    const fit = fitScale(w, h, window.innerWidth, window.innerHeight, dpr);
    canvas.style.width = `${fit.cssWidth}px`;
    canvas.style.height = `${fit.cssHeight}px`;
  };
  return (): void => {
    present();
    screen.clear();
    if (notice.state) drawNotice(screen);
    else runtime.scene.draw(screen);
  };
}

function runLoop(keys: KeyTracker, runtime: Runtime, notice: { state: Notice }, draw: () => void): LoopControl {
  return startLoop({
    update() {
      if (notice.state === "up") {
        keys.sample();
        return;
      }
      if (notice.state === "dismissed") {
        // Keys still held from the dismissing press stay hidden until released.
        notice.state = null;
        keys.ignoreHeld();
      }
      const { pressed, justPressed } = keys.sample();
      runtime.step(readInput(pressed, justPressed));
    },
    draw,
  });
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const canvas = document.querySelector("#screen");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("main: missing <canvas id=screen>");
  const screen = new Surface(canvas);

  rng.seed(Date.now());
  // D5: sounds load in the background and stay silent until ready.
  loadSounds(allSounds);
  installAudioUnlock(allSounds);
  await loadImages(allImages);

  const keys = new KeyTracker();
  installKeyboard(keys);
  const notice = openNotice();
  const runtime = newRuntime();

  // A factory error propagates out of main() and the page's top-level await.
  const requested = params.get("scene");
  runtime.load(SCENES.find((s) => s === requested) ?? "title");
  installPersist(runtime);

  const draw = newDraw(canvas, screen, runtime, notice);
  const loop = runLoop(keys, runtime, notice, draw);

  if (params.has("debug")) {
    installTestHook({
      runtime,
      draw,
      frame: () => screen.toPNGDataURL(),
      pause: () => {
        loop.pause();
      },
      resume: () => {
        loop.resume();
      },
    });
  }
}

await main();
