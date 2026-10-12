// Browser entry point: preload images (D5), pick the scene from `?scene=` (default: title)
// via `createScene` (src/game/registry.ts), run the fixed-step loop (D2), and
// install `window.__arcade` when `?debug` is present (D7).

import { allImages, allSounds, loadImages } from "./engine/assets.ts";
import { installAudioUnlock, loadSounds } from "./engine/audio.ts";
import { readInput } from "./engine/input.ts";
import { KeyTracker, installKeyboard } from "./engine/keyboard.ts";
import { startLoop } from "./engine/loop.ts";
import * as rng from "./engine/rng.ts";
import { Runtime } from "./engine/runtime.ts";
import { fitScale } from "./engine/scale.ts";
import { Surface } from "./engine/surface.ts";
import { installTestHook } from "./engine/testhook.ts";
import { createScene } from "./game/registry.ts";
import type { SceneName } from "./game/software.ts";
import { localStorageStore } from "./title/save.ts";

const SCENES: readonly SceneName[] = ["title", "game", "wave", "lumberjack"];

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById("screen");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("main: missing <canvas id=screen>");
  const screen = new Surface(canvas);

  rng.seed(Date.now());
  // D5: sounds load in the background and stay silent until ready.
  loadSounds(allSounds);
  installAudioUnlock(allSounds);
  await loadImages(allImages);

  const keys = new KeyTracker();
  installKeyboard(keys);

  // The title scene keeps its save in localStorage, also when the test hook loads it.
  const store = localStorageStore();
  const runtime = new Runtime((name, opts) => createScene(name, { store, ...opts }));
  let unmountOverlay: (() => void) | null = null;
  runtime.onReplace((next) => {
    unmountOverlay?.();
    unmountOverlay = next.mountOverlay?.(document.body) ?? null;
  });

  // A factory error propagates out of main() and is logged by the catch below.
  const requested = params.get("scene");
  runtime.load(SCENES.find((s) => s === requested) ?? "title");

  // Save "Continue" progress when the tab is closed or hidden.
  const persist = (): void => runtime.scene.persist?.();
  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  // D1: logical-resolution canvas, CSS-upscaled by an integer device-pixel factor.
  let fitKey = "";
  const present = (): void => {
    const [w, h] = runtime.scene.layout();
    screen.resize(w, h);
    const dpr = window.devicePixelRatio || 1;
    const key = `${w}x${h}@${window.innerWidth}x${window.innerHeight}@${dpr}`;
    if (key === fitKey) return;
    fitKey = key;
    const fit = fitScale(w, h, window.innerWidth, window.innerHeight, dpr);
    canvas.style.width = `${fit.cssWidth}px`;
    canvas.style.height = `${fit.cssHeight}px`;
  };
  const draw = (): void => {
    present();
    screen.clear();
    runtime.scene.draw(screen);
  };

  const loop = startLoop({
    update() {
      const { pressed, justPressed } = keys.sample();
      runtime.step(readInput(pressed, justPressed));
    },
    draw,
  });

  if (params.has("debug")) {
    installTestHook({
      runtime,
      draw,
      frame: () => screen.toPNGDataURL(),
      pause: () => loop.pause(),
      resume: () => loop.resume(),
    });
  }
}

main().catch((err: unknown) => {
  console.error(err);
});
