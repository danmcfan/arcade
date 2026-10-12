// Visual verification harness: everything a browser check needs, in one
// place. It starts its own dev server on a free port (or reuses the one at
// ARCADE_PORT), drives the page with agent-browser, and writes screenshots,
// logical frames and videos under out/verify/<name>/ for the PR.
//
//   import { verify } from "./harness.ts";
//   await verify("pause-menu", async (v) => {
//     v.open();
//     v.key("Space"); v.key("Space");
//     v.screenshot("hub");
//   });
//
// Gotchas this module absorbs (see docs/agents/visual-verification.md):
// - agent-browser `press` releases the key within one tick, so the game never
//   sees it; `key()` dispatches a real keydown, holds it, then keyup.
// - `record start` opens a fresh browser context (localStorage set before it
//   is gone), and any navigation after it freezes the video on one frame.
//   `record()` records the final URL directly and seeds storage through the
//   test hook (`load()` rebuilds the scene, which re-reads the save).
// - Audio only starts after a real user gesture; Shift does not count.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { SceneSnapshot } from "../src/game/snapshot.ts";
import type { SceneName } from "../src/game/software.ts";
import type { Input } from "../src/engine/input.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { browser, decodeDataUrl, type Browser } from "./browser.ts";

export interface Server {
  url: string;
  stop(): void;
}

async function reachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(500) })).ok;
  } catch {
    return false;
  }
}

function freePort(): number {
  const s = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = s.port;
  s.stop(true);
  return port;
}

/**
 * The dev server at ARCADE_PORT if one is already up there, otherwise a new
 * one on a free port that `stop()` (or process exit) kills.
 */
export async function startServer(): Promise<Server> {
  if (process.env.ARCADE_PORT) {
    const url = `http://localhost:${process.env.ARCADE_PORT}`;
    if (await reachable(url)) return { url, stop() {} };
  }
  const port = freePort();
  const url = `http://localhost:${port}`;
  const proc = Bun.spawn(["bun", `--port=${port}`, "./index.html"], { cwd: repoRoot, stdout: "ignore", stderr: "pipe" });
  const stop = () => proc.kill();
  process.on("exit", stop);
  for (let i = 0; i < 100; i++) {
    if (await reachable(url)) return { url, stop };
    if (proc.exitCode !== null) break;
    await Bun.sleep(100);
  }
  stop();
  throw new Error(`dev server did not come up on ${url}: ${await new Response(proc.stderr).text()}`);
}

export interface RecordOptions {
  /** Scene to record (default: the title). */
  scene?: SceneName;
  /** localStorage entries to set, then the scene is rebuilt so it reads them. */
  storage?: Record<string, string>;
}

export interface Verify {
  /** Where this run writes its files: out/verify/<name>/. */
  dir: string;
  page: Browser;
  /** Open the game (query like "?scene=game") and wait for the canvas. */
  open(query?: string): void;
  /** Open with `?debug`, wait for the test hook and pause the loop, so only `step()` moves the game. */
  openHook(query?: string): void;
  /** Hook only: run `ticks` fixed ticks with these keys held. */
  step(ticks: number, input?: Partial<Input>): void;
  /** Hook only: hold a key for one tick, then release for one tick. */
  tap(key: keyof Input): void;
  /** Hook only: the current scene snapshot. */
  snapshot<T extends SceneSnapshot = SceneSnapshot>(): T;
  /** A real keydown on `code` (e.g. "Space", "ArrowLeft"), held `ms` so the game loop sees it, then keyup. */
  key(code: string, ms?: number): void;
  /** Let the page run in real time. */
  wait(ms: number): void;
  /** Browser screenshot (the page as a person sees it, scaled) to <dir>/<name>.png. */
  screenshot(name: string): string;
  /** Hook only: the canvas at logical resolution, nearest-neighbour scaled by `scale`, to <dir>/<name>.png. */
  frame(name: string, scale?: number): string;
  /**
   * Record what `play` does to <dir>/<name>.mp4 (also .webm), with the loop
   * running in real time. Drive it with `key()` and `wait()`; `open()` inside
   * `play` would freeze the video. See `RecordOptions`.
   */
  record(name: string, play: () => void, opts?: RecordOptions): string;
  /** Page errors and console errors since the last call. */
  errors(): string[];
  /** Throw if the page logged any error. */
  assertNoErrors(): void;
}

/** Scale a PNG up by an integer factor with nearest-neighbour sampling. */
export function upscale(png: Buffer, scale: number): Buffer {
  if (scale === 1) return png;
  const src = PNG.sync.read(png);
  const dst = new PNG({ width: src.width * scale, height: src.height * scale });
  for (let y = 0; y < dst.height; y++) {
    for (let x = 0; x < dst.width; x++) {
      const s = (Math.floor(y / scale) * src.width + Math.floor(x / scale)) * 4;
      const d = (y * dst.width + x) * 4;
      src.data.copy(dst.data, d, s, s + 4);
    }
  }
  return PNG.sync.write(dst);
}

function keyScript(code: string, ms: number): string {
  // `key` matters too: some handlers fall back to it when `code` is empty.
  const key = code === "Space" ? " " : code.startsWith("Key") ? code.slice(3).toLowerCase() : code;
  const init = JSON.stringify({ code, key, bubbles: true });
  return `(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", ${init}));
    await new Promise((r) => setTimeout(r, ${ms}));
    window.dispatchEvent(new KeyboardEvent("keyup", ${init}));
    await new Promise((r) => setTimeout(r, 60));
    return "ok";
  })()`;
}

function makeVerify(name: string, url: string): Verify {
  const dir = join(repoRoot, "out/verify", name);
  mkdirSync(dir, { recursive: true });
  const page = browser(`arcade-verify-${name}-${process.pid}`);
  const file = (n: string, ext: string) => join(dir, `${n}.${ext}`);
  const waitCanvas = () => page.run("wait", "--fn", "document.getElementById('screen')?.width > 0");

  const v: Verify = {
    dir,
    page,
    open(query = "") {
      page.run("open", `${url}/${query}`);
      waitCanvas();
    },
    openHook(query = "") {
      const q = query ? `?debug&${query.replace(/^\?/, "")}` : "?debug";
      v.open(q);
      page.run("wait", "--fn", "window.__arcade !== undefined");
      page.eval("window.__arcade.pause()");
    },
    step(ticks, input = {}) {
      page.eval(`window.__arcade.step(${ticks}, ${JSON.stringify(input)})`);
    },
    tap(key) {
      v.step(1, { [key]: true });
      v.step(1);
    },
    snapshot<T extends SceneSnapshot>() {
      return JSON.parse(page.eval("JSON.stringify(window.__arcade.snapshot())")) as T;
    },
    key(code, ms = 120) {
      page.eval(keyScript(code, ms));
    },
    wait(ms) {
      page.run("wait", String(ms));
    },
    screenshot(n) {
      const path = file(n, "png");
      page.run("screenshot", path);
      return path;
    },
    frame(n, scale = 4) {
      const path = file(n, "png");
      writeFileSync(path, upscale(decodeDataUrl(page.eval("window.__arcade.frame()")), scale));
      return path;
    },
    record(n, play, opts = {}) {
      const webm = file(n, "webm");
      const mp4 = file(n, "mp4");
      rmSync(webm, { force: true });
      // No navigation once recording starts (it freezes the video), so record
      // the final URL with the hook installed and seed storage through it.
      const query = opts.scene ? `?debug&scene=${opts.scene}` : "?debug";
      page.run("record", "start", webm, `${url}/${query}`);
      waitCanvas();
      page.run("wait", "--fn", "window.__arcade !== undefined");
      if (opts.storage) {
        const entries = JSON.stringify(Object.entries(opts.storage));
        page.eval(`for (const [k, val] of ${entries}) localStorage.setItem(k, val); "ok"`);
        page.eval(`window.__arcade.load(${JSON.stringify(opts.scene ?? "title")}); "ok"`);
      }
      try {
        play();
      } finally {
        page.run("record", "stop");
      }
      // GitHub renders mp4 inline in PRs; webm is kept for local viewing.
      const ff = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", "-i", webm, "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", mp4]);
      if (ff.exitCode !== 0) throw new Error(`ffmpeg failed: ${ff.stderr.toString()}`);
      return mp4;
    },
    errors() {
      const lines = [
        ...page.run("errors", "--clear").split("\n"),
        ...page
          .run("console", "--clear")
          .split("\n")
          .filter((l) => /\berror\b/i.test(l)),
      ];
      return lines.map((l) => l.trim()).filter((l) => l && !/^no (page )?errors/i.test(l));
    },
    assertNoErrors() {
      const errs = v.errors();
      if (errs.length) throw new Error(`page errors:\n  ${errs.join("\n  ")}`);
    },
  };
  return v;
}

/**
 * Run `body` against a fresh browser session and dev server, then clean both
 * up. Exits non-zero (and prints the error) if `body` throws.
 */
export async function verify(name: string, body: (v: Verify) => void | Promise<void>): Promise<void> {
  const server = await startServer();
  const v = makeVerify(name, server.url);
  try {
    await body(v);
    console.log(`verify ${name}: ok. Files: ${v.dir}`);
  } catch (err) {
    console.error(`verify ${name}: FAILED\n${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    try {
      v.page.run("close");
    } catch {}
    server.stop();
  }
}

