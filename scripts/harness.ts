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
// - A headless browser can look touch-first and show the "needs a keyboard"
//   notice instead of the game. `open()` and `record()` add `?keyboard`, which
//   skips it; after `phone()` they leave it off, so a phone sees the notice.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type {
  FireflySnapshot,
  GameSnapshot,
  SceneSnapshot,
  SweetSamSnapshot,
  TitleSnapshot,
} from "../src/game/snapshot.ts";
import type { SceneName } from "../src/game/software.ts";
import type { Input } from "../src/engine/input.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { browser, decodeDataUrl, isRecord, type Browser } from "./browser.ts";

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

/** Poll `url` every 100 ms, up to `tries` times, until it answers or `proc` exits. */
async function waitUp(url: string, proc: { exitCode: number | null }, tries: number): Promise<boolean> {
  if (await reachable(url)) return true;
  if (tries <= 1 || proc.exitCode !== null) return false;
  await Bun.sleep(100);
  return waitUp(url, proc, tries - 1);
}

/** The command that serves a page on `port`. */
export type ServerCommand = (port: number) => string[];

/** The game's dev server. */
const devServer: ServerCommand = (port) => ["bun", `--port=${port}`, "./index.html"];

/**
 * The dev server at ARCADE_PORT if one is already up there, otherwise a new
 * one (or `command`'s server) on a free port that `stop()` (or process exit) kills.
 */
export async function startServer(command: ServerCommand = devServer): Promise<Server> {
  const envPort = process.env["ARCADE_PORT"];
  if (command === devServer && envPort !== undefined && envPort !== "") {
    const url = `http://localhost:${envPort}`;
    if (await reachable(url)) return { url, stop() {} };
  }
  const port = freePort();
  const url = `http://localhost:${port}`;
  const proc = Bun.spawn(command(port), {
    cwd: repoRoot,
    stdout: "ignore",
    stderr: "pipe",
  });
  const stop = (): void => {
    proc.kill();
  };
  process.on("exit", stop);
  if (await waitUp(url, proc, 100)) return { url, stop };
  stop();
  throw new Error(`dev server did not come up on ${url}: ${await new Response(proc.stderr).text()}`);
}

export interface RecordOptions {
  /** Scene to record (default: the title). */
  scene?: SceneName;
  /** The game's page, relative to the server root (default: the root), e.g. an option `bun run pixel play` built. */
  path?: string;
  /** localStorage entries to set, then the scene is rebuilt so it reads them. */
  storage?: Record<string, string>;
}

export interface Verify {
  /** Where this run writes its files: out/verify/<name>/. */
  dir: string;
  /** The server's root URL, e.g. http://localhost:4123. */
  url: string;
  page: Browser;
  /** Open the game (query like "?scene=game", plus `keyboard` unless emulating a phone) and wait for the canvas. */
  open(query?: string): void;
  /** Open with `?debug`, wait for the test hook and pause the loop, so only `step()` moves the game. */
  openHook(query?: string): void;
  /** Hook only: run `ticks` fixed ticks with these keys held. */
  step(ticks: number, input?: Partial<Input>): void;
  /** Hook only: jump the running minigame to stage (or level) `stage`. */
  jump(stage: number): void;
  /** Hook only: hold a key for one tick, then release for one tick. */
  tap(key: keyof Input): void;
  /** Hook only: the current scene snapshot, checked with `is` (e.g. `isTitleSnapshot`). */
  snapshot<T extends SceneSnapshot>(is: (s: unknown) => s is T): T;
  /** A real keydown on `code` (e.g. "Space", "ArrowLeft"), held `ms` so the game loop sees it, then keyup. */
  key(code: string, ms?: number): void;
  /** Keydown on `code`, run `play` (more `key()` and `wait()` calls) while it is held, then keyup: Space held while steering, say. */
  hold(code: string, play: () => void): void;
  /**
   * Emulate a phone for the rest of this run: the `device` viewport (an
   * agent-browser device name) plus a touch screen, so `(pointer: coarse)`
   * and `(hover: none)` match. Needs a page open; `open()` reloads keep it.
   */
  phone(device?: string): Promise<void>;
  /**
   * Hook only: dismiss the "needs a keyboard" notice (shown only after `phone()`). Only a running
   * loop clears it, so this runs the loop around a key press, then pauses it again.
   */
  dismissNotice(): void;
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
  /** `record()` on an emulated phone (see `phone()`); `device` is an agent-browser device name. */
  recordPhone(name: string, play: () => void, opts?: RecordOptions & { device?: string }): Promise<string>;
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

/** `query` with `keyboard` added, so the page skips the "needs a keyboard" notice. */
export function withKeyboard(query: string): string {
  const q = query.replace(/^\?/u, "");
  return `?${q === "" ? "keyboard" : `${q}&keyboard`}`;
}

/** A verify step: log `what`, or throw with what the page had instead. */
export function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function keyInit(code: string): string {
  // `key` matters too: some handlers fall back to it when `code` is empty.
  const key = code === "Space" ? " " : code.startsWith("Key") ? code.slice(3).toLowerCase() : code;
  return JSON.stringify({ code, key, bubbles: true });
}

function keyScript(code: string, ms: number): string {
  const init = keyInit(code);
  return `(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", ${init}));
    await new Promise((r) => setTimeout(r, ${ms}));
    window.dispatchEvent(new KeyboardEvent("keyup", ${init}));
    await new Promise((r) => setTimeout(r, 60));
    return "ok";
  })()`;
}

type Guard<T> = (x: unknown) => x is T;

/** Run `js` in the page, parse its JSON result and check it with `is`. */
export function evalJson<T>(page: Browser, js: string, is: Guard<T>): T {
  const out = page.eval(js);
  const parsed: unknown = JSON.parse(out);
  if (!is(parsed)) throw new Error(`unexpected value from the page for ${js}: ${out.slice(0, 200)}`);
  return parsed;
}

export function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((e) => typeof e === "string");
}

/** A `GameSnapshot` by its shape (checks the fields the verify checks rely on to tell scenes apart). */
export function isGameSnapshot(x: unknown): x is GameSnapshot {
  return (
    isRecord(x) &&
    typeof x["tick"] === "number" &&
    isRecord(x["arcade"]) &&
    isRecord(x["arcade"]["player"]) &&
    "software" in x &&
    "menu" in x &&
    "sw" in x
  );
}

/** A `SweetSamSnapshot` by its shape. */
export function isSweetSamSnapshot(x: unknown): x is SweetSamSnapshot {
  return (
    isRecord(x) &&
    typeof x["level"] === "number" &&
    typeof x["lives"] === "number" &&
    Array.isArray(x["enemies"]) &&
    isRecord(x["player"])
  );
}

/** The Sweet Sam snapshot inside a game snapshot; throws when another software is running. */
export function sweetSamIn(g: GameSnapshot): SweetSamSnapshot {
  if (g.software !== "sweetSam" || !isSweetSamSnapshot(g.sw)) throw new Error(`not in Sweet Sam: ${g.software}`);
  return g.sw;
}

/** A `TitleSnapshot` by its shape. */
export function isTitleSnapshot(x: unknown): x is TitleSnapshot {
  return (
    isRecord(x) &&
    typeof x["tick"] === "number" &&
    typeof x["phase"] === "string" &&
    isStringArray(x["items"]) &&
    typeof x["cursor"] === "number" &&
    (x["game"] === null || isGameSnapshot(x["game"]))
  );
}

interface CdpReply {
  id?: number;
  result?: unknown;
  error?: unknown;
}

function isCdpReply(x: unknown): x is CdpReply {
  return isRecord(x) && (x["id"] === undefined || typeof x["id"] === "number");
}

function isTargets(x: unknown): x is { targetInfos: { targetId: string; type: string }[] } {
  return (
    isRecord(x) &&
    Array.isArray(x["targetInfos"]) &&
    x["targetInfos"].every((t) => isRecord(t) && typeof t["targetId"] === "string" && typeof t["type"] === "string")
  );
}

function isAttached(x: unknown): x is { sessionId: string } {
  return isRecord(x) && typeof x["sessionId"] === "string";
}

function isEvaluated(x: unknown): x is { result: { value?: unknown } } {
  return isRecord(x) && isRecord(x["result"]);
}

const anyReply = (_x: unknown): _x is unknown => true;

type Send = <T>(method: string, is: Guard<T>, params?: object, sessionId?: string) => Promise<T>;

/** Attach to each page target in turn until one carries `mark`; its CDP session id, or null. */
async function findMarked(send: Send, targetIds: string[], mark: string): Promise<string | null> {
  const [targetId, ...rest] = targetIds;
  if (targetId === undefined) return null;
  const { sessionId } = await send("Target.attachToTarget", isAttached, { targetId, flatten: true });
  const r = await send("Runtime.evaluate", isEvaluated, { expression: "window.__touchMark" }, sessionId);
  if (r.result.value === mark) return sessionId;
  await send("Target.detachFromTarget", anyReply, { sessionId });
  return findMarked(send, rest, mark);
}

/**
 * Turn on touch emulation for the session's page over raw CDP (agent-browser
 * has no command for it). The emulation lasts as long as the CDP connection,
 * so this returns the function that closes it.
 */
async function emulateTouch(page: Browser): Promise<() => void> {
  const ws = new WebSocket(page.run("get", "cdp-url").trim());
  const replies = new Map<number, (m: CdpReply) => void>();
  let id = 0;
  ws.addEventListener("message", (e): void => {
    const m: unknown = JSON.parse(String(e.data));
    if (isCdpReply(m) && m.id !== undefined) replies.get(m.id)?.(m);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const send: Send = async (method, is, params = {}, sessionId) => {
    const m = await new Promise<CdpReply>((resolve) => {
      replies.set(++id, resolve);
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    if (m.error !== undefined) throw new Error(`CDP ${method}: ${JSON.stringify(m.error)}`);
    if (!is(m.result)) throw new Error(`CDP ${method}: unexpected result ${JSON.stringify(m.result)}`);
    return m.result;
  };
  // The browser may hold other pages (a recording opens a new context), so
  // mark the one agent-browser drives and find it by the mark.
  const mark = `touch-${Date.now()}-${Math.random()}`;
  page.eval(`window.__touchMark = ${JSON.stringify(mark)}; "ok"`);
  const { targetInfos } = await send("Target.getTargets", isTargets);
  const pages = targetInfos.filter((t) => t.type === "page").map((t) => t.targetId);
  const sessionId = await findMarked(send, pages, mark);
  if (sessionId === null) throw new Error("phone(): could not find the page over CDP");
  await send("Emulation.setTouchEmulationEnabled", anyReply, { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send("Emulation.setEmitTouchEventsForMouse", anyReply, { enabled: true, configuration: "mobile" }, sessionId);
  return () => {
    ws.close();
  };
}

function makeVerify(name: string, url: string): Verify & { cleanups: (() => void)[] } {
  const dir = join(repoRoot, "out/verify", name);
  mkdirSync(dir, { recursive: true });
  const page = browser(`arcade-verify-${name}-${process.pid}`);
  const file = (n: string, ext: string): string => join(dir, `${n}.${ext}`);
  const waitCanvas = (): void => {
    page.run("wait", "--fn", "document.getElementById('screen')?.width > 0");
  };
  const cleanups: (() => void)[] = [];
  /** Set by `phone()`: the page keeps its "needs a keyboard" notice. */
  let isPhone = false;

  /** Start recording `<name>.webm` on a fresh load of `scene` with the test hook. */
  const startRecording = (n: string, scene?: SceneName, path = ""): string => {
    const webm = file(n, "webm");
    rmSync(webm, { force: true });
    const query = scene ? `?debug&scene=${scene}` : "?debug";
    page.run("record", "start", webm, `${url}/${path}${isPhone ? query : withKeyboard(query)}`);
    waitCanvas();
    page.run("wait", "--fn", "window.__arcade !== undefined");
    return webm;
  };
  const seedStorage = (storage: Record<string, string>): void => {
    const entries = JSON.stringify(Object.entries(storage));
    page.eval(`for (const [k, val] of ${entries}) localStorage.setItem(k, val); "ok"`);
  };
  /** Run `play`, stop recording, and convert to `<name>.mp4`. */
  const finishRecording = (n: string, webm: string, play: () => void): string => {
    try {
      play();
    } finally {
      page.run("record", "stop");
    }
    // GitHub renders mp4 inline in PRs; webm is kept for local viewing.
    const mp4 = file(n, "mp4");
    const ff = Bun.spawnSync([
      "ffmpeg",
      "-y",
      "-loglevel",
      "error",
      "-i",
      webm,
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      mp4,
    ]);
    if (ff.exitCode !== 0) throw new Error(`ffmpeg failed: ${ff.stderr.toString()}`);
    return mp4;
  };

  const v: Verify = {
    dir,
    url,
    page,
    open(query = "") {
      page.run("open", `${url}/${isPhone ? query : withKeyboard(query)}`);
      waitCanvas();
    },
    openHook(query = "") {
      const q = query ? `?debug&${query.replace(/^\?/u, "")}` : "?debug";
      v.open(q);
      page.run("wait", "--fn", "window.__arcade !== undefined");
      page.eval("window.__arcade.pause()");
    },
    step(ticks, input = {}) {
      page.eval(`window.__arcade.step(${ticks}, ${JSON.stringify(input)})`);
    },
    jump(stage) {
      page.eval(`window.__arcade.jump(${stage}); "ok"`);
    },
    tap(key) {
      v.step(1, { [key]: true });
      v.step(1);
    },
    snapshot(is) {
      return evalJson(page, "JSON.stringify(window.__arcade.snapshot())", is);
    },
    key(code, ms = 120) {
      page.eval(keyScript(code, ms));
    },
    hold(code, play) {
      page.eval(`window.dispatchEvent(new KeyboardEvent("keydown", ${keyInit(code)})); "ok"`);
      try {
        play();
      } finally {
        page.eval(`window.dispatchEvent(new KeyboardEvent("keyup", ${keyInit(code)})); "ok"`);
      }
    },
    dismissNotice() {
      page.eval("window.__arcade.resume()");
      this.key("KeyZ");
      this.wait(100);
      page.eval("window.__arcade.pause()");
    },
    async phone(device = "iPhone 15") {
      isPhone = true;
      page.run("set", "device", device);
      cleanups.push(await emulateTouch(page));
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
      const webm = startRecording(n, opts.scene, opts.path);
      // No navigation once recording starts (it freezes the video), so record
      // the final URL with the hook installed and seed storage through it.
      if (opts.storage) {
        seedStorage(opts.storage);
        page.eval(`window.__arcade.load(${JSON.stringify(opts.scene ?? "title")}); "ok"`);
      }
      return finishRecording(n, webm, play);
    },
    async recordPhone(n, play, opts = {}) {
      isPhone = true; // record without `?keyboard`, so the phone shows the notice
      const webm = startRecording(n, opts.scene, opts.path);
      if (opts.storage) seedStorage(opts.storage);
      // The recording's fresh context drops the emulation, and the page reads
      // the device only on load, so emulate and reload once. This one reload
      // shows in the video (agent-browser 0.33).
      await v.phone(opts.device);
      page.eval("location.reload(); 'ok'");
      page.run("wait", "--fn", "window.__touchMark === undefined && window.__arcade !== undefined");
      waitCanvas();
      return finishRecording(n, webm, play);
    },
    errors() {
      const lines = [
        ...page.run("errors", "--clear").split("\n"),
        ...page
          .run("console", "--clear")
          .split("\n")
          .filter((l) => /\berror\b/iu.test(l)),
      ];
      return lines.map((l) => l.trim()).filter((l) => l !== "" && !/^no (page )?errors/iu.test(l));
    },
    assertNoErrors() {
      const errs = v.errors();
      if (errs.length > 0) throw new Error(`page errors:\n  ${errs.join("\n  ")}`);
    },
  };
  return Object.assign(v, { cleanups });
}

/** Hook only: the arcade Game the title is hosting; throws before one starts. */
export function gameIn(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

/** The bot: Space held, dodging shots and divers close above, else steering under the nearest enemy. */
export function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const threat = [
    ...s.shots.filter((x) => x.y > s.player.y - 60),
    ...s.enemies.filter((e) => e.state === "diving" && e.deadFrames === 0 && e.y > s.player.y - 70),
  ].find((x) => Math.abs(x.x - px) < 14);
  if (threat !== undefined) return threat.x > px ? { space: true, left: true } : { space: true, right: true };
  const targets = s.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting" && e.y < 230);
  const target = targets.toSorted((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
  if (target === undefined || Math.abs(target.x - px) <= 2) return { space: true };
  return target.x > px ? { space: true, right: true } : { space: true, left: true };
}

/** Hook only: the Firefly snapshot while Firefly is running, else null. */
export function fireflyIn(v: Verify): FireflySnapshot | null {
  const g = gameIn(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

/** Hook only, while recording: Space through the title, then keyboard up to the Firefly cabinet and start it. */
export function walkToFirefly(v: Verify): void {
  for (let n = 0; n < 30 && v.snapshot(isTitleSnapshot).game === null; n++) {
    v.key("Space");
    v.wait(400);
  }
  const hubX = (): number => gameIn(v).arcade.player.x;
  for (let n = 0; n < 40 && hubX() < 118; n++) v.key("ArrowRight", 60);
  for (let n = 0; n < 40 && gameIn(v).software === null; n++) {
    v.key("ArrowUp", 80);
    v.key("Space");
  }
}

/**
 * Hook only: a fresh save, `seed`, then New game, through the intro, up to
 * the Firefly cabinet and Space: a paid Firefly run on its first tick.
 */
export function startFirefly(v: Verify, seed: number): void {
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.page.eval(`window.__arcade.seed(${seed}); "ok"`);
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
}

/**
 * Run `body` against a fresh browser session and dev server (or
 * `opts.server`'s, e.g. a dev server), then clean both up. Exits non-zero (and prints the error) if `body` throws.
 */
export async function verify(
  name: string,
  body: (v: Verify) => void | Promise<void>,
  opts: { server?: ServerCommand } = {},
): Promise<void> {
  const server = await startServer(opts.server);
  const v = makeVerify(name, server.url);
  try {
    await body(v);
    console.log(`verify ${name}: ok. Files: ${v.dir}`);
  } catch (err) {
    console.error(`verify ${name}: FAILED\n${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    for (const fn of v.cleanups) fn();
    try {
      v.page.run("close");
    } catch {}
    server.stop();
  }
}

/** One character a tick, its bits the held keys: too many ticks for a JSON array on agent-browser's command line. */
export function packInputs(inputs: readonly Input[]): string {
  return inputs
    .map((i) =>
      String.fromCodePoint(64 + (+i.up | (+i.down << 1) | (+i.left << 2) | (+i.right << 3) | (+i.space << 4))),
    )
    .join("");
}

/** JS object literal decoding a packed tick's bits (b) into the held keys. */
const heldKeys = "{ up: (b & 1) > 0, down: (b & 2) > 0, left: (b & 4) > 0, right: (b & 8) > 0, space: (b & 16) > 0 }";

/** In-page JS stepping the page through packed[from, to) at once. */
export function stepPage(packed: string, from: number, to: number): string {
  return `{ const p = ${JSON.stringify(packed.slice(from, to))};
   for (let k = 0; k < p.length; k++) {
     const b = p.charCodeAt(k) - 64;
     window.__arcade.step(1, ${heldKeys});
   } } "ok"`;
}

/** In-page JS replaying `packed` on a timer, `perFrame` ticks a 16 ms frame; window.__at counts the ticks played. */
export function replayPage(packed: string, perFrame: number): string {
  return `window.__inputs = ${JSON.stringify(packed)}; window.__at = 0;
         window.__timer = setInterval(() => {
           for (let n = 0; n < ${perFrame} && window.__at < window.__inputs.length; n++) {
             const b = window.__inputs.charCodeAt(window.__at++) - 64;
             window.__arcade.step(1, ${heldKeys});
           }
         }, 16); "ok"`;
}
