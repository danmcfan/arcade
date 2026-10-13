# Arcade: Go/Odin → TypeScript + Bun port

Implementation spec for an **orchestrator agent** that delegates to **sub-agents** and lands the whole port as **one PR** from the integration branch `ts-port`. Each ticket is built on its own branch in its own git worktree and merged into `ts-port` (D10). The ticket graph is in §8.

> **Note (#37):** `gearhead` in this plan is the Go code name for Brass Monkey. The TypeScript code now calls it `brassMonkey` (`src/brass-monkey/`).
>
> **Note (#45):** `hive` in this plan is the Go code name for Sweet Sam. The TypeScript code now calls it `sweetSam` (`src/sweet-sam/`).

Goal: replace the Go + Ebitengine (Wasm) build and the Odin + raylib prototype with a TypeScript game that draws to a `<canvas>`, built, served and tested with Bun. Gameplay must be **tick-for-tick identical** to the Go version, as proven by parity traces captured from Go before it is deleted.

---

## 0. Ground truth (read before starting)

### Current repo inventory

| Path                                                                                         | What it is                                                                                                                                  | Fate                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `main.go`, `go.mod`, `go.sum`                                                                | Ebitengine entry point (`game.New(nil)`)                                                                                                    | delete (Phase 5)                                                                       |
| `internal/game`                                                                              | Top-level loop: arcade hub ↔ active "software" (minigame), Esc, Shift+P debug, `Layout`                                                     | port → `src/game/`                                                                     |
| `internal/input`                                                                             | `Input` struct, `Direction`, `Axis`, key mapping                                                                                            | port → `src/engine/input.ts`                                                           |
| `internal/software`                                                                          | `Software` + `FixedViewport` interfaces                                                                                                     | port → `src/game/software.ts`                                                          |
| `internal/arcade`                                                                            | Hub: walk around, 3 cabinets, melody + title overlay, debug overlay                                                                         | port → `src/arcade/`                                                                   |
| `internal/hive` (~1,900 lines)                                                               | Pac-Man-like: bear vs 4 bees, cabinet bezel, state machine, particles, shake, rolling score dials                                           | port → `src/hive/`                                                                     |
| `internal/firefly`                                                                           | Galaga-like: ship, bullets, bezier bug waves, explosions                                                                                    | port → `src/firefly/`                                                                  |
| `internal/gearhead`                                                                          | Gnome walking in a workshop (stub game)                                                                                                     | port → `src/gearhead/`                                                                 |
| `internal/wave`                                                                              | Wave-function-collapse demo, **not wired into the arcade**, uses `debugui`                                                                  | port as lab scene → `src/lab/wave/`                                                    |
| `internal/lumberjack`                                                                        | Tree-chopping demo, **not wired into the arcade**. Asset pack is 726 PNGs / 6.3 MB, of which **9 are used** (~125 KB, listed in §5 [A:lab]) | port as lab scene → `src/lab/lumberjack/`                                              |
| `internal/draw`, `internal/debug`                                                            | Helpers, arcade debug side panel                                                                                                            | port                                                                                   |
| `internal/assets`                                                                            | Embedded PNG/WAV/OGG + Sound wrappers (native + `js` build tags)                                                                            | assets **copied** → `src/assets/` (originals deleted in Phase 5); code → `src/engine/` |
| `internal/assets/images/shipExplosion.png`                                                   | Not loaded by `assets.go`                                                                                                                   | not imported (not shipped); keep the file with the other assets                        |
| `internal/assets/aseprite/cabinet.ase`                                                       | Source art for `cabinet.png`                                                                                                                | keep as source art: `git mv` → `art/cabinet.ase` in Phase 5 (not shipped)              |
| `internal/reload`, `cmd/serve.go`, `cmd/serve` (8 MB arm64 binary), `.air*.toml`, `Makefile` | Dev server + websocket reload (reload is not even called)                                                                                   | delete; Bun dev server replaces                                                        |
| `main.wasm` (14 MB), `wasm_exec.js`, `index.html`                                            | Committed web build                                                                                                                         | delete / rewrite `index.html`                                                          |
| `main.odin`, `ols.json`, `assets/arcade.png`, `assets/gamer.png`                             | Odin prototype (158 lines), Odin language-server config, its own asset copies                                                               | delete                                                                                 |
| `.github/workflows/static.yml`                                                               | Deploys **repo root** to GitHub Pages                                                                                                       | rewrite to build with Bun and deploy `dist/`                                           |
| `icon.svg`, `README.md`                                                                      |                                                                                                                                             | keep / rewrite README                                                                  |
| `tmp/` (untracked)                                                                           | air build output                                                                                                                            | gitignore                                                                              |

### Toolchain present on the machine

- `bun` 1.4.2 (`~/.bun/bin/bun`), `go` 1.26 (Homebrew, darwin/arm64), `odin`, `agent-browser` 0.33.2 (global npm), Rosetta 2 (works).

### Facts that shape the plan

1. **Ebitengine API surface used is small:** `Image`, `SubImage`, `DrawImage` with `GeoM` (translate / scale(-1,1) / rotate) and `ColorScale` (alpha, color tint), `NewImage` + `Fill`, `vector.StrokeRect/StrokeLine/FillCircle/FillRect` (debug only), `ebitenutil.DebugPrintAt` (debug only), key polling. Also: `NewImageFromImage` + `Image.Set` pixel writes at init (lumberjack tree split, `tree.go:30-62`); direct `inpututil`/`IsKeyPressed` calls in wave and lumberjack (they bypass `input.Input`); `debugui` (wave only, brings mouse input and text); `ActualFPS/ActualTPS` (wave UI text only). There are no shaders, no `ColorM`, no blend modes, no filters. Everything maps to Canvas 2D.
2. **Ebitengine runs `Update` at a fixed 60 TPS**, separately from `Draw`. All game timing is in ticks. The TS loop must be a fixed-step accumulator. Verified: every `math/rand` call is in `Update`, and no `Draw` path mutates game state, so tick-level parity is well-defined.
3. **FMA trap (verified):** `go test ./...` **fails** `firefly.TestAngle` natively on Apple Silicon because Go fuses `x*y+z` into FMA on arm64. With `CGO_ENABLED=1 GOARCH=amd64` (Rosetta) it **passes**. `CGO_ENABLED=0 GOARCH=amd64` does **not build** (Ebitengine's Metal driver needs cgo), so `CGO_ENABLED=1` is required. Keep `GOAMD64` at its default `v1`: `v3` re-enables FMA. The live Wasm site has no FMA either. ⇒ **All Go parity fixtures must be captured with `CGO_ENABLED=1 GOARCH=amd64`.** Then `+ - * /` and `Math.sqrt` match Go bit for bit.
   - **Transcendentals do not.** Go's `math.Sin/Cos/Atan2/Pow` are pure-Go implementations; JavaScriptCore (Bun) and V8 (Chrome) use different algorithms and can differ in the last ulp. Verified: none of these feed snapshot state. `Sin/Cos` (particle velocity, READY wave) and `Atan2` (firefly sprite frame) are draw-only; `distance` uses `Pow(int, 2)` + `Sqrt` on integers, which is exact (port as `dx*dx`). `easeDialOut`'s `Pow(1-t, 3)` is computed by Go as `u*(u*u)`; write it that way.
   - **Untyped Go constants** (`math.Pi/180.0`, `tileSize*4.5`, `bonusEatIndicatorTTLSecs*float64(framesPerSecond)`, speed constants in `hive/entity.go:28-33`) are evaluated exactly at compile time, then rounded once. JS evaluates them in float64 step by step. They happen to agree today; hard-code them as literals and unit-test the values (§6).
4. **Go integer semantics.** Every Go `int` division, `int(...)`/`uint8(...)` conversion and int-typed field must become explicit truncation in TS (`Math.trunc`, not `Math.floor`). Go `%` and `math.Mod` match JS `%` (truncated). See the checklist in §6.
5. **Randomness.** `math/rand` is used in `hive/camera.go`, `hive/particle.go`, `hive/update.go` (`updateDirection` when scared, `resetEnemy`) and `wave/grid/grid.go`. For parity both sides use one shared seedable PRNG (§3.3).
6. **Logical resolutions (from `Layout`).** Arcade 192×176 (160×144 plus a 16 px buffer each side). Firefly 256×320 (galaxy 224×288 + buffer). Gearhead 256×288 (workshop 224×256 + buffer). Hive 336×428 (`FixedViewport`, cabinet bezel drawn at 0,0, no buffer). Wave `16*activeGridSize` square (2048×2048 at the default size 128). Lumberjack 512×288. **Debug mode adds +120 px width to whichever layout is active, including inside a minigame** (`game.go:108-110`), and Shift+P toggles it from anywhere, though the panel itself is only drawn in the hub.
7. **`bun test` has no DOM (verified):** `Image`, `OffscreenCanvas`, `document` and `Audio` are all undefined. Image/sound imports evaluate to absolute file paths. ⇒ Game modules must be loadable and steppable with no DOM (D12).
8. **Bun HTML bundling works (verified on 1.4.2):** `bun build ./index.html --outdir dist --minify` bundles `.ts`, and `import x from "./a.png" | ".ogg" | ".wav"` becomes hashed files with `./`-relative URLs; the `<script type="module">` is hoisted into `<head>`. `bun --hot ./index.html` serves on **port 3000** and ignored a trailing `--port` flag; set the port via `bun --port=<n> ./index.html` or `BUN_PORT` and verify in Phase 1b.
9. **Shipped asset bytes:** arcade images + sounds + `three.png` = **1,008,655 bytes** (the WAVs alone are ~875 KB), before any JS. Lumberjack's 9 used PNGs add ~125 KB.
10. **Go `color.RGBA` is premultiplied.** Ebitengine uses its components as-is, so a translucent color draws as `dst' = C + dst*(1 - A)`, not `C*A + dst*(1-A)`. Values like `{0,255,0,64}` (hub debug overlay, `arcade/debug.go:10-12`) are "invalid" premultiplied colors and draw near-additive. Affected draws: hub debug overlay rects, hub debug panel background `{20,20,20,200}`, hive particles (`ScaleWithColor` on a white pixel, `particle.go:109-120`). See D15.
11. **Ebitengine does not snap coordinates.** With the nearest filter and a pure translate, a sprite at fractional `x` lands at `ceil(x - 0.5)` (GPU pixel-centre rule). Canvas anti-aliases edges at fractional positions even with smoothing off. Fractional positions are everywhere: hive camera shake, entity speeds 0.9375/0.625/0.5/1.125, READY sine, dial scroll, particles; firefly beziers and explosions; lumberjack diagonals (1.5 px/tick). See D13.
12. **GitHub Pages (verified via `gh api repos/danmcfan/arcade/pages`):** `build_type: workflow`, custom domain `arcade.dannyobrien.dev` set in repo settings, HTTPS enforced. **No `CNAME` file is needed** for workflow deploys.

---

## 1. Decisions (made; do not re-litigate)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Canvas 2D, rendering at **logical resolution** into the visible canvas, which is upscaled by CSS with `image-rendering: pixelated`. Scale is chosen in **device pixels**: the largest integer `k ≥ 1` such that `k * logical / devicePixelRatio` fits the viewport in CSS px; CSS size = `k * logical / dpr`. If even `k = 1` does not fit (wave), use a fractional fit-to-viewport downscale. Centered, black letterbox via the page background. The canvas itself is **cleared to transparent each frame, never filled black** (Go frames are transparent outside drawn pixels). Every `canvas.width/height` assignment **resets context state**, so `imageSmoothingEnabled = false` must be re-applied after every resize (layout changes on every enter/exit and on Shift+P). | Matches Ebitengine's offscreen-then-scale model; crisp pixels on 125%/150% displays; screenshots of the canvas are at logical resolution, so they diff directly against Go golden frames. |
| D2  | Fixed-step loop: `requestAnimationFrame` + accumulator at 1/60 s, at most 5 catch-up updates per frame; **any accumulated time beyond the cap is discarded** (no backlog after a tab switch). One draw per rAF.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Ebitengine semantics; correct speed on 120 Hz screens.                                                                                                                                    |
| D3  | Input is read **per tick** from a keydown/keyup `Set<code>`. "Just pressed" = in this tick's set but not the previous tick's. Clear all keys on `blur`/`visibilitychange`. `preventDefault` arrows/Space. Use `KeyboardEvent.code`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Mirrors `inpututil.AppendPressedKeys/AppendJustPressedKeys`.                                                                                                                              |
| D4  | Audio uses `HTMLAudioElement` with the same `play/pause/rewind/ready` semantics as `internal/assets/web.go` (calls are ignored until `canplaythrough` sets `ready`). The first keydown or pointerdown "unlocks" audio by calling `play()` then `pause()` on each element. **Every `play()` promise gets `.catch(() => {})`**: Go ignored the promise, but in JS an unhandled rejection (`NotAllowedError`, or the `AbortError` the unlock itself triggers) logs "Uncaught (in promise)" and would fail the no-console-errors check.                                                                                                                                                                                                                                               | Exact parity with the live web build; simplest.                                                                                                                                           |
| D5  | Assets are imported through Bun's bundler (`import url from "./x.png"` → hashed file in `dist/`). Preload all **images** (`await img.decode()`) before the first tick, showing a black page meanwhile. **Do not wait for sounds**: iOS Safari may not load audio before a user gesture, which would leave a black screen forever. Sounds load in the background and stay silent until `ready`, as in `web.go`.                                                                                                                                                                                                                                                                                                                                                                    | Typed manifest; only referenced lumberjack files ship.                                                                                                                                    |
| D6  | `wave` and `lumberjack` are ported as **lab scenes** at `?scene=wave` and `?scene=lumberjack`. They stay out of the arcade hub, as today. Wave's `debugui` window becomes a small HTML overlay (two `<input type=range>` plus stats text) outside the canvas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | "Move it all over" without changing what players see.                                                                                                                                     |
| D7  | A `?debug` query param exposes `window.__arcade` (test hook, §3.5). It is always compiled in and inert without the param.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Deterministic browser verification.                                                                                                                                                       |
| D8  | Keep the module structure 1:1 with the Go packages (file per Go file where sensible), with the same names in camelCase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Reviewable diff against the Go source; easy parity debugging.                                                                                                                             |
| D9  | TS strict mode, `noUncheckedIndexedAccess`, no framework, no runtime dependencies. Dev deps: `typescript`, `@types/bun`, `pngjs`, `pixelmatch` (pinned exact versions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Small, boring.                                                                                                                                                                            |
| D10 | **One ticket = one implementer sub-agent = one worktree + branch** off `ts-port`. The implementer confirms its worktree is based on `ts-port` (resetting onto it if not), builds the ticket test-first with the `tdd` skill, commits on its branch (suggested messages per ticket in §5), and merges the `ts-port` tip into its branch before reporting done. A **merger sub-agent** then merges the branch into `ts-port`. The orchestrator never commits feature work itself. A draft PR from `ts-port` is opened after the first merge, marked as closing the spec and every ticket.                                                                                                                                                                                           | Maximum concurrency with isolated working trees; one PR with readable per-ticket history.                                                                                                 |
| D11 | Behavior is ported **as is**, bugs included (examples in §5 per agent). Note anything suspicious in `docs/port-notes.md` instead of fixing it. Do not "tidy" early returns, partial resets or quirky collision rules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Parity first; fixes are follow-ups.                                                                                                                                                       |
| D12 | **Headless-first engine.** No module may touch the DOM at import time or inside `update()`/`snapshot()`. Image assets are descriptors `{ url, width, height }` with **dimensions hard-coded** in `src/engine/assets.ts` (a unit test checks them against the PNG headers with `pngjs`); the decoded `HTMLImageElement` is attached later by `loadImages()` in the browser only. `makeSolid` and offscreen surfaces are created lazily on first `draw`. `Sound` without a DOM is a recorder only.                                                                                                                                                                                                                                                                                  | Parity replays and unit tests run under `bun test`, which has no DOM (fact 7). Layout and hive drawing read image sizes.                                                                  |
| D13 | **Snapping policy, decided up front:** every `Surface.draw`/`fillRect` without rotation snaps its final translate with `snap(v) = Math.ceil(v - 0.5)` (Ebitengine's nearest-filter result, fact 11). Rotated draws (lumberjack tree top) are not snapped; their edges get a tolerance in Phase 4. Code that calls `math.Round` in Go still calls a `goRound` first (all current arguments are positive, so `Math.round` agrees, but use the helper). Phase 4 confirms the policy against golden frames; the first firefly frame is the canary.                                                                                                                                                                                                                                    | Without this, nearly every hive/firefly/lumberjack frame differs on edges.                                                                                                                |
| D14 | **Debug text uses Ebitengine's own bitmap font.** Copy `ebitenutil/text.png` (192×128, 6×16 glyphs, Apache-2.0; add the license notice next to it) from the module cache to `src/engine/debugfont.png` and port `drawDebugText` (`ebitenutil/debugprint.go:58-85`: `cw=6, ch=16`, glyph index by code point, origin `ox+1, oy`). No `fillText`.                                                                                                                                                                                                                                                                                                                                                                                                                                   | Debug frames can then match pixel for pixel; no font dependency.                                                                                                                          |
| D15 | **Premultiplied color emulation.** `Surface.fillPremul(x, y, w, h, {r,g,b,a})` reproduces `dst' = C + dst*(1-a)`: fill black with `globalAlpha = a/255` (source-over), then fill `rgb(r,g,b)` at alpha 1 with `globalCompositeOperation = "lighter"`, on a snapped rect. Hive particles use it (a white 3×3 pixel scaled by `RGBA{R,G,B,uint8(alpha*255)}` is exactly that), as do the hub debug panel background and debug overlay strokes. All hive PNGs are fully opaque or fully transparent and the cabinet is opaque, so this is exact up to ±1 rounding per channel.                                                                                                                                                                                                       | The plain `globalAlpha` approximation is dimmer than Go and was the only planned visual deviation; this removes it.                                                                       |

---

## 2. Target layout

```
index.html                  # <canvas id="screen">, loads ./src/main.ts (Bun HTML bundler)
package.json                # scripts below; "type": "module"
bun.lock
tsconfig.json
art/cabinet.ase             # source art (Phase 5 git mv), not shipped
src/
  main.ts                   # boot: preload images, pick scene (?scene=), start loop, install test hook
  assets.d.ts               # declare module "*.png" | "*.wav" | "*.ogg" → string
  engine/
    loop.ts                 # fixed-step runner; pure stepping core is testable
    input.ts                # Input type, Direction, Axis, opposite(), axis(), direction(), moving(), readInput()
    keyboard.ts             # DOM key tracking → pressed / justPressed sets
    image.ts                # ImageAsset, Sprite (asset + source rect), sub(), makeSolid()
    surface.ts              # Surface wrapping a CanvasRenderingContext2D (screen or offscreen); draw API; snap()
    audio.ts                # Sound class + unlock + event recorder
    assets.ts               # typed registry of every image (with hard-coded w/h) and sound (mirrors internal/assets/assets.go)
    rng.ts                  # mulberry32; rng.float(), rng.intn(n), rng.seed(s), rng.state()
    gomath.ts               # goRound, fnv1a32, any other Go-semantics helpers
    text.ts                 # debugPrint(surface, text, x, y): port of ebitenutil drawDebugText (D14)
    debugfont.png           # ebitenutil/text.png + LICENSE note
    scale.ts                # viewport fit math (pure, tested)
    testhook.ts             # window.__arcade
  game/
    software.ts             # Software interface + FixedViewport
    snapshot.ts             # TS types for every §4.3 snapshot (the contract both sides implement)
    game.ts                 # port of internal/game
    debugPanel.ts           # port of internal/debug
    registry.ts             # software + scene factories (filled in by porters)
  arcade/                   # collision.ts, entity.ts, machine.ts, state.ts, update.ts, draw.ts, debug.ts
  hive/                     # one .ts per Go file
  firefly/                  # game.ts, pattern.ts, debug.ts
  gearhead/                 # game.ts
  lab/wave/                 # game.ts, grid.ts, three.png
  lab/lumberjack/           # game.ts, hitbox.ts, player.ts, sprite.ts, tree.ts, images/** (only the 9 used PNGs, same relative paths)
  assets/images/*.png, assets/sounds/*   # copied from internal/assets
test/
  fixtures/
    inputs/*.json           # scripted input scenarios (shared by Go capture and TS replay)
    traces/*.jsonl.gz       # Go-captured per-tick state snapshots, gzipped
    frames/<scenario>/<tick>.png   # Go-captured logical-res frames
    rng.json                # first 1000 mulberry32 outputs for seeds 1, 42
  parity/
    harness.ts              # shared: load script, expand to per-tick inputs, replay a scene, diff vs trace (first diverging tick + field path)
    *.test.ts               # one per scene/software, thin wrappers over harness.ts
scripts/
  frame-diff.ts             # pixelmatch two PNGs → diff count + diff PNG
  capture-frames.ts         # drives agent-browser to dump TS frames for the golden scenarios
tools/golden/               # TEMPORARY Go harness (deleted in Phase 5; fixtures stay)
docs/ts-port-plan.md        # this file
docs/port-notes.md          # oddities found during the port
```

`package.json` scripts:

```json
{
  "dev": "bun --hot --port=${ARCADE_PORT:-3000} ./index.html",
  "build": "bun build ./index.html --outdir dist --minify",
  "preview": "bunx serve dist", // or a 10-line Bun.serve static server in scripts/
  "typecheck": "tsc --noEmit",
  "test": "bun test",
  "frames": "bun scripts/capture-frames.ts",
  "check": "bun run typecheck && bun test && bun run build"
}
```

The HTML entry point is verified to work for both `build` and `dev` (fact 8). The dev server uses `ARCADE_PORT` (default 3000; verify the `--port` placement on Bun 1.4.2 in T3, fact 8); scripts that need the URL read it from one constant that also honors `ARCADE_PORT`.

---

## 3. Shared contracts (written FIRST by ticket 1a, before fanning out)

The 1a ticket writes these files and merges them into `ts-port` before any other ticket starts, so the parallel agents code against stable interfaces. Engine internals can come later.

### 3.1 `src/engine/input.ts`

```ts
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type Axis = "VERTICAL" | "HORIZONTAL";
export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  escape: boolean;
  shiftP: boolean;
}
export const NO_INPUT: Input;
export function moving(i: Input): boolean;
export function direction(i: Input): Direction | ""; // priority Up, Down, Left, Right (as Go)
export function opposite(d: Direction): Direction; // throws on invalid, like Go panic
export function axis(d: Direction): Axis;
export function readInput(pressed: ReadonlySet<string>, justPressed: ReadonlySet<string>): Input;
// codes: KeyW/ArrowUp, KeyS/ArrowDown, KeyA/ArrowLeft, KeyD/ArrowRight, Space, Escape,
// shiftP = (ShiftLeft||ShiftRight) pressed && KeyP justPressed
```

`Input` holds **held** state (plus the `shiftP` edge). Scenes that need other edges derive them from the previous tick's `Input` (wave's Space). Lumberjack reads all four directions independently and must not use `direction()` (§5 [A:lab]).

### 3.2 `src/engine/image.ts` and `surface.ts` (Ebitengine-shaped draw API)

```ts
export interface ImageAsset {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  image: HTMLImageElement | null;
} // image set by loadImages() in the browser only
export interface Sprite {
  readonly asset: ImageAsset;
  readonly sx: number;
  readonly sy: number;
  readonly w: number;
  readonly h: number;
}
export function sub(s: Sprite, x0: number, y0: number, x1: number, y1: number): Sprite; // image.Rect order, intersected with bounds like Ebitengine SubImage; an empty intersection gives a 0×0 sprite
export function makeSolid(w: number, h: number, css: string): Sprite; // canvas created lazily on first draw

export interface DrawOpts {
  flipX?: boolean; // GeoM.Scale(-1,1) then Translate(w,0)
  rotate?: { angle: number; pivotX: number; pivotY: number }; // Translate(-p) Rotate(a) Translate(+p), applied before x/y; disables snapping
  alpha?: number; // ColorScale.ScaleAlpha
}
export function snap(v: number): number; // Math.ceil(v - 0.5), D13
export class Surface {
  readonly width: number;
  readonly height: number;
  static offscreen(w: number, h: number): Surface;
  clear(): void; // transparent
  fill(css: string): void;
  draw(s: Sprite, x: number, y: number, opts?: DrawOpts): void; // x,y = final GeoM translate; snapped unless rotated; no-op for 0×0 sprites
  drawSurface(src: Surface, x: number, y: number, opts?: DrawOpts): void;
  fillRect(x: number, y: number, w: number, h: number, css: string): void;
  fillPremul(x: number, y: number, w: number, h: number, c: { r: number; g: number; b: number; a: number }): void; // D15
  strokeRect(x: number, y: number, w: number, h: number, c: { r: number; g: number; b: number; a: number }): void; // vector.StrokeRect 1px, premultiplied color
  line(x1: number, y1: number, x2: number, y2: number, css: string): void;
  fillCircle(x: number, y: number, r: number, css: string): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  toPNGDataURL(): string;
}
```

Rules: `imageSmoothingEnabled = false` on every context, re-applied after every resize (D1). Snapping per D13. `strokeRect`/`line`/`fillCircle` are debug-only; Phase 4 decides their exact pixel rule.

### 3.3 `src/engine/rng.ts`: shared PRNG (must match the Go harness bit for bit)

```ts
// mulberry32
let a = 0;
export function seed(s: number) {
  a = s >>> 0;
}
export function state(): number {
  return a;
} // exposed in every snapshot (§4.3)
export function float(): number {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function intn(n: number): number {
  return Math.floor(float() * n);
}
```

Normal play seeds from `Date.now()`. Go replicates this in `internal/rng` with `uint32` arithmetic. `test/fixtures/rng.json` locks both together.

### 3.4 `src/game/software.ts` and `snapshot.ts`

```ts
export interface Software {
  readonly name: "hive" | "firefly" | "gearhead";
  background(): Sprite;
  update(i: Input): void;
  draw(screen: Surface, buffer: number): void;
  gameOver(): boolean;
  score(): number;
  snapshot(): SoftwareSnapshot; // §4.3
}
export interface FixedViewport extends Software {
  fixedViewportSize(): [number, number];
}
export function isFixedViewport(s: Software): s is FixedViewport;
```

Scenes (top-level `Game`, wave, lumberjack) implement `Scene { step(i: Input): void; draw(screen: Surface): void; layout(): [w, h]; snapshot(): SceneSnapshot; }`. The loop reads input and calls `scene.step(input)`, so the test hook and parity replays can inject input without the DOM.

`src/game/snapshot.ts` declares the TS type of every §4.3 snapshot, field for field. It is the contract: the golden agent emits exactly these keys from Go, the porters return them from `snapshot()`, and `test/parity/harness.ts` diffs them.

### 3.5 `window.__arcade` test hook (`?debug` only)

```ts
{
  pause(): void; resume(): void;
  step(n: number, input?: Partial<Input>): void;      // n fixed ticks with that input, then one draw
  runScript(script: InputScript): void;               // §4.2 format, then one draw
  seed(n: number): void;
  load(scene: "game" | "wave" | "lumberjack", opts?: { software?: "hive"|"firefly"|"gearhead"; wave?: { gridSize: number; seconds: number } }): void; // fresh instance
  tick(): number; snapshot(): unknown;
  frame(): string;                                    // canvas.toDataURL() at logical resolution
  layout(): [number, number];
  sounds(): string[];                                 // log of "play:start", "pause:melody", ... since last call
}
```

Audio must not throw when not unlocked, and `sounds()` records calls regardless of `ready`.

---

## 4. Parity strategy (the core of verification)

The Go code is the spec. Before deleting it, we capture **what it does, tick by tick**, and the TS port must reproduce it.

### 4.1 Go harness changes (temporary, on the branch only)

- Add `internal/rng` (mulberry32, `Seed`, `State`, `Float64`, `Intn` = `int(Float64()*n)` floor). Replace **every** `math/rand` call in hive and wave with it. Call order must stay identical.
- Refactor `game.Game.Update()` into `UpdateWithInput(input.Input)`, with `Update()` reading keys and delegating. Lumberjack: extract `Step(lumberjack.Input)` (it has its own `Input` read via `IsKeyPressed`, `game.go:36-42`). Wave: extract `Step(spaceJustPressed bool)` without debugui, and move the four globals (`gridSize`, `seconds`, `activeGridSize`, `activeSeconds`) into settable state so the harness can apply a scenario's `wave` settings.
- Wave: split `Draw` into `drawCells(screen)` and the `ui.Draw` call. **Golden frames capture `drawCells` only** (the debugui window becomes an HTML overlay in TS, outside the canvas).
- Add `Snapshot()` methods matching §4.3 exactly (JSON field names are the contract; see `src/game/snapshot.ts`). Serialize with `encoding/json` (shortest round-trip float formatting), never `%f`.
- Add a sound-event hook: `assets.Sound` gets a `Name` and a package-level `OnSoundEvent func(string)` that the harness records ("play:laser", "rewind:laser", "pause:melody", …). Record **before** web.go's `Ready` check (the harness runs native, where there is no check).
- `tools/golden/main.go` has two modes:
  - `trace <scenario.json>` → writes `test/fixtures/traces/<name>.jsonl.gz`, no window. Run with `CGO_ENABLED=1 GOARCH=amd64 go run ./tools/golden trace …`.
  - `frames <scenario.json>` → runs `ebiten.RunGame` (needed: `ReadPixels` requires a running game). In each `Update`, advance the script to the next capture tick with `UpdateWithInput`; in `Draw`, render the scene into a cleared offscreen `ebiten.NewImage(layoutW, layoutH)`, `ReadPixels` → `test/fixtures/frames/<name>/<tick>.png`. It also blits to the window and quits after the last capture. Run under amd64 as well. (This works because no `Draw` mutates state, fact 2.)
- Sanity gate: `CGO_ENABLED=1 GOARCH=amd64 go test ./...` passes, including `TestAngle`.

### 4.2 Input script format (`test/fixtures/inputs/<name>.json`)

```json
{
  "name": "hive-fuzz-1",
  "scene": "game",
  "software": "hive",
  "seed": 1,
  "steps": [
    { "ticks": 45, "input": { "left": true } },
    { "ticks": 10, "input": {} }
  ],
  "captureTicks": [1, 60, 121, 600]
}
```

- `scene: "game"` with `software` = construct `game.New(<software>)`, like `game.New(initialSoftware)` in Go. Omit `software` to start in the hub. Note: Go hands `initialSoftware` to the hub as `LoadedSoftware`, so **tick 1 runs one hub update with that tick's input** and the software takes over from tick 2. Port this as is.
- `shiftP` in a step means "just pressed" on that step's **first** tick only. Shift+P works inside minigames and changes the layout (+120); scenarios other than `arcade-walk` should not use it.
- Wave scenarios add `"wave": { "gridSize": 64, "seconds": 5 }` (the pending slider values; defaults 128 and 5). `space` is held state; the wave scene treats a rising edge as "just pressed". On that tick it applies the pending settings and resets the grid, and **runs no `Step`** (`wave/game.go:82-91`). The first run uses `New()`, which reads `gridSize`, not `activeGridSize`.
- Lumberjack scenarios use the same `input` fields; `up/down/left/right/space` map 1:1 to its own `Input`, all held, all applied independently.

### 4.3 Snapshot schemas (JSON; both languages emit the same keys)

Every snapshot also carries `rng: <uint32 PRNG state>` at the top level, so a change in random-call order is caught on the tick it happens.

- **game:** `{ tick, rng, debug, software: null|"<name>", arcade: { player:{x,y,dir,frame}, melodyPlaying, title: null|"gearhead"|"sweet"|"firefly", highScore }, sw: <software snapshot>|null, sounds: [..events this tick] }`
- **hive:** `{ state, player:{x,y,dir,frame,hidden,velocity}, enemies:[{kind,x,y,dir,frame,velocity,blue,flashFrames,flash,home,dotMin,reverse,reverseTile:[x,y]}], items: <remaining count>, itemsHash: <FNV-1a over the indexes still present>, score, lives, highScore, modeIndex, mode, modeTicks, pauseTicks, startTicks, respawnBlinkRemaining, scaredEatAwardNext, popups:[{x,y,frameIdx,ticks}], shake:[ox,oy,ticks,intensity], particlesActive, pelletAnimTick, joystick, dials:[[settled,active,from,to,t]x12] }`
  - Go names differ: `blue`=`BlueFrames`, `dotMin`=`dotMinimum`, `reverse`=`reverseDirection`, `mode`=`modeCurrent`, popup `ticks`=`ticksRemain`, `joystick`=`cabinetJoystickFrame`, `shake`=`shakeOffsetX/Y`+`shakeTicksRemaining`+`shakeIntensity`, `respawnBlinkRemaining`=`StartState.respawnBlinkRemaining`, `dials` = `scoreDial[6]` then `highScoreDial[6]` with `{SettledDigit, active, from, to, t}`.
  - Particle positions are deliberately excluded (they use `Sin/Cos`, fact 3).
- **firefly:** `{ player:{x,y}, fireDelay, bullets:[{x,y}], bugs:[{pattern:"L"|"R",x,y,dx,dy,duration,deadFrames}] }`
- **gearhead:** `{ x, y, frame, left, moving }`
- **wave:** `{ collapsed, width, cellsHash }` per tick; full grid on the last tick.
- **lumberjack:** `{ player:{x,y,dir,frameX,frameY,frameCounter,moving,acting}, trees:[{x,y,theta,thetaInc,shaking,shakeRight,behind,transparent,health}] }`

Hashes are **FNV-1a 32-bit** (offset basis `2166136261`, prime `16777619`) over little-endian `uint32` bytes, implemented once in `src/engine/gomath.ts` and once in the Go harness:

- `itemsHash`: each present item index, ascending.
- `cellsHash`: for each collapsed cell with exactly one possibility, in Draw order (**x outer, y inner**, `wave/game.go:97-98`), the triple `x, y, possible[0]`.

Comparison: ints, strings and bools exact. Floats exact (expected under amd64; fact 3). If exact fails, the harness reports the **first diverging tick and field path**; `|a-b| ≤ 1e-9` is allowed only with orchestrator sign-off in `docs/port-notes.md`.

### 4.4 Required scenarios (golden agent authors them; coverage is asserted)

| Scenario                               | Purpose / must cover                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rng`                                  | 1000 values × seeds {1, 42}                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `arcade-walk`                          | every wall face, all 3 cabinets approached facing Up (title + melody start/stop), debug toggle via Shift+P                                                                                                                                                                                                                                                                                                                                                                    |
| `arcade-enter-{gearhead,hive,firefly}` | Up+Space at the cabinet, ~300 ticks inside, Esc back (layout changes, `pause:start`)                                                                                                                                                                                                                                                                                                                                                                                          |
| `hive-fuzz-{1..4}`                     | seeded random held directions (10–60 tick holds), ≥3600 ticks each. **Across the set** the trace must show: power pellet eaten, bee eaten (PAUSE state, 200/400 award), tunnel wrap, death → DEATHWAIT → START, final death → GAMEOVER, round win (all items eaten) OR a scripted `hive-clear` route if fuzz can't reach it in reasonable time, every mode transition through index 7. The golden agent iterates seeds/scripts until a coverage script confirms all of these. |
| `hive-highscore`                       | via `game` scene: play hive to game over, check the hub `highScore` is updated                                                                                                                                                                                                                                                                                                                                                                                                |
| `firefly-play`                         | hold Space while sweeping left/right for 1500 ticks: bullets, hits, explosions, wave respawn, bugs exiting off the top, a bullet hitting a not-yet-spawned bug at (0,0) if reachable                                                                                                                                                                                                                                                                                          |
| `gearhead-walk`                        | both walls, flip left/right, idle frame reset                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `wave-64-seed7`, `wave-128-seed3`      | `wave.gridSize` 64 / 128; run to full collapse, plus a mid-run restart via Space                                                                                                                                                                                                                                                                                                                                                                                              |
| `lumberjack-chop`                      | walk into a tree (collision resolve), chop from 2 sides until health ≤0, keep chopping past 0, walk behind a tree (transparency), a diagonal walk, Up+Down held together                                                                                                                                                                                                                                                                                                      |

`captureTicks` for frames: hub start, beside each cabinet (title overlay), hub with debug on (panel + overlay), hive tick 1 / READY wave mid-anim / mid-play / camera shake / power mode / flashing / bee-eaten popup with particles / game over, firefly mid-wave with an explosion, gearhead facing left, lumberjack mid-shake (rotation) and behind-tree alpha, wave at the 50% and 100% collapse points.

---

## 5. Phases, agents and gates

Legend: **[O]** = orchestrator does it itself (coordination only, no feature commits). **[A:name]** = implementer sub-agent working one ticket per D10 (general-purpose unless noted). Parallel groups are marked ∥. Every sub-agent prompt is mostly pointers: the path of this file, its section numbers, the ticket number, the exact files it owns (it may not edit others), and its gate commands.

**Worktree setup:** each worktree runs `bun install --frozen-lockfile` once before starting (Bun's global cache makes this cheap). Anything that serves the app reads its port from `ARCADE_PORT` (default 3000; the one URL constant in `scripts/` reads it too), so parallel agents use distinct ports: engine 3001, frames 3002, explore 3003.

**Typecheck gates:** each worktree contains only `ts-port` plus that ticket's work, and the 1a stubs typecheck, so `bun run typecheck` in the worktree must pass in full. Before reporting done, the agent merges the `ts-port` tip and re-runs its gates.

**Shared files:** file ownership is disjoint except `docs/port-notes.md`, which everyone appends to. 1a marks it `merge=union` in `.gitattributes` so appends from parallel branches merge cleanly. Nobody but 1a edits `src/game/registry.ts` (see 1a).

### Phase 1: Foundation

**[O] before any ticket:** create the integration branch `ts-port` from `main` (`git switch -c ts-port`, push it).

**1a [A:scaffold] contracts and scaffold (sequential, ~small; blocks every other ticket)**

- `bun init` equivalent by hand: `package.json`, `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `lib: ["DOM","ES2022"]`, `types: ["bun"]`), `index.html`, `src/assets.d.ts`, `.gitignore` (`node_modules/`, `dist/`, `out/`, `tmp/`), `.gitattributes` (`docs/port-notes.md merge=union`), an empty `docs/port-notes.md`. Run `bun install` and commit `bun.lock`.
- **Copy** (do not `git mv`) `internal/assets/images` → `src/assets/images`, `internal/assets/sounds` → `src/assets/sounds`, `internal/wave/three.png` → `src/lab/wave/three.png`, and only the 9 used lumberjack PNGs (§5 [A:lab]) → `src/lab/lumberjack/images/` with the same relative paths. `//go:embed` cannot reference `..` or follow symlinks, so the Go tree keeps its own copies until Phase 5.
- Write the §3 contract files (types plus signatures; bodies may `throw new Error("TODO")`), including `src/game/snapshot.ts` (all §4.3 types), `snap()`, `ImageAsset` with **hard-coded dimensions for every image** (D12), and `src/game/registry.ts`.
- `src/game/registry.ts` is final in 1a: it imports each factory from a stub entry module owned by the porter (`src/hive/index.ts` → `createHive(highScore)`, `src/firefly/index.ts`, `src/gearhead/index.ts`, `src/lab/wave/index.ts`, `src/lab/lumberjack/index.ts`, `src/game/index.ts` for the top-level `Game`). Stubs `throw new Error("TODO")`. Porters replace their own stub, so no two tickets edit the same line.
- Gate: `bun run typecheck` passes.
- Commit message: `Scaffold Bun/TypeScript project and shared engine contracts`.

**1b ∥ (three agents in parallel)**

**[A:golden] Go golden capture** (owns `tools/golden/**`, `internal/**` Go edits, `test/fixtures/**`)

- Do everything in §4.1. Emit snapshots that match `src/game/snapshot.ts` key for key. Author all §4.4 scenarios, plus a small coverage checker (`tools/golden/coverage.go` or a Bun script over the JSONL) that asserts the hive coverage list.
- Write `test/fixtures/README.md` describing the formats and the exact regeneration commands.
- Gates: `CGO_ENABLED=1 GOARCH=amd64 go test ./...` green; coverage checker green; every `captureTicks` PNG exists and has the right dimensions; the game still runs normally with `go run .` (harness changes are behavior-neutral; the snapshot code is read-only).
- Report: scenario list, coverage results, total fixture size, anything surprising in Go behavior.

**[A:engine] Engine** (owns `src/engine/**`, `src/main.ts`, `index.html`, `scripts/**`, `test/parity/harness.ts`)

- Implement loop (D2, including discarding excess time), keyboard, input, image/surface (D1 resize handling, D13 snapping, D15 `fillPremul`), audio (D4 promise handling, D5 no waiting on sounds, event recorder), assets registry (every image/sound from `assets.go`, plus wave/lumberjack ones; skip `shipExplosion.png`), rng, gomath (`goRound`, `fnv1a32`), debug text (D14), scale (device-pixel integer fit, D1), test hook (wire `load()` to scene factories via `src/game/registry.ts`).
- `test/parity/harness.ts`: load a script, expand it to per-tick `Input`s (`shiftP` on the first tick of its step only), seed, construct the scene from the registry, step, gunzip the trace (`Bun.gunzipSync`), and deep-diff each tick's snapshot, failing with the first diverging tick and field path. It must run with no DOM. Until fixtures exist, it skips with a visible message.
- `scripts/frame-diff.ts` (pixelmatch, `threshold: 0.1`, optional mask rects) and `scripts/capture-frames.ts` (uses `agent-browser`: open `http://localhost:3000/?debug`, `eval` `__arcade.seed/load/runScript`, read `frame()`, decode the data URL, write `out/frames/<scenario>/<tick>.png`).
- Unit tests (`bun test`): input mapping and direction priority, justPressed per tick, loop accumulator (feed fake timestamps: 60 Hz → 1 update/frame, 120 Hz → alternate 0/1, 250 ms stall → 5 updates and then no backlog), scale math (integer fit at dpr 1, 1.25, 2; fractional fallback), `snap()`, `sub()` clamping and the empty case, asset dimensions vs PNG headers, rng vs `test/fixtures/rng.json` (skip with a clear message until golden delivers it, then must pass), FNV-1a known vectors, Sound `ready` gating and that a rejected `play()` doesn't surface.
- Gates: own-files typecheck, tests, `bun run build` succeeds, `bun run dev` serves a page that shows a test pattern scene at 192×176 integer-scaled. **Load the `agent-browser` skill** and take one screenshot to prove it; confirm the console has no errors after a keypress (audio unlock).

**[A:hub] Game shell + arcade hub** (owns `src/game/**` except the 1a contract files' signatures, `src/arcade/**`, `test/parity/game.test.ts`)

- Port `internal/game`, `internal/software`, `internal/debug`, `internal/arcade` per §3 contracts. Machines reference software factories through `src/game/registry.ts` (`createHive(highScore)`, etc.), which 1a already wired to each porter's `index.ts` stub. Hub implements `src/game/index.ts` and does not edit `registry.ts`.
- Debug drawing: overlay rects and panel background use premultiplied colors (D15, fact 10); panel text uses `debugPrint` (D14). The +120 debug width applies to every layout, including minigames (fact 6). Tick 1 of `game.New(software)` is a hub tick (§4.2).
- `test/parity/game.test.ts`: replays `arcade-walk`, `arcade-enter-*` and `hive-highscore` through `harness.ts`. The minigame parts of those traces pass once the porters land.
- Unit tests: walls/collision table, `findMachine`, melody/title transitions and their sound events, enter/exit software, high score only taken on `gameOver()`, layout sizes per software and debug (+120 everywhere).

### Phase 2: Minigame ports ∥ (start as soon as 1a lands; they code against contracts)

Each agent ports one Go package file by file, writes unit tests, implements `snapshot()` per §4.3 / `snapshot.ts`, and adds a parity test `test/parity/<name>.test.ts` that replays the matching fixtures through `harness.ts`. Parity tests **skip with a visible message** if fixtures are absent and are required to pass by Phase 3.

**[A:hive]** (owns `src/hive/**`, `test/parity/hive.test.ts`). Biggest port; give it the full §6 checklist plus these hive specifics:

- Enemy identity: Go compares `e.color` against `colorRed` etc. Add `kind: "red"|"pink"|"teal"|"orange"`, keep `color` only for debug drawing.
- Food identity: Go uses `e.Sprite == assets.ImageFood`. Use an explicit `isFood` flag.
- **Tile comparison by value:** `updateDirection` checks `tileCurrent != e.reverseTile` (`update.go:176`). Compare fields with a `tileEq` helper; `!==` on objects is always true and makes bees reverse immediately on every mode change.
- `updateDirection`: distances go into a map, but the tie-break is the fixed priority **Up, Left, Down, Right**. Port it as that.
- Exact float equality checks stay exact: `e.Y == 8*17+4` (tunnel row), `X <= 0` / `>= 224` wrap (player too). Tunnel speed 0.5 applies to bees only. Enemy `Velocity` is reassigned every PLAY tick (`state.go:168-178`).
- At most **one item eaten per tick** (`items[idx] = nil; break`). Items keep their slots (nullable array), and `winner` checks that all are null; it runs at the start of the next PLAY tick.
- `pointToTile` = `Math.trunc(x/8)` (never sees a negative X: wrap happens in the same `updatePosition`).
- **Update order is part of the spec** (`update.go:43-50`): joystick, `pelletAnimTick++`, camera (rand), particles, state machine, popups, score dials, high-score dials. So a popup ticks on the tick it spawns, a particle doesn't move until the next tick, and a shake requested on tick N first consumes rand on tick N+1.
- **Do not tidy** (D11): on a collision `PlayState.Update` returns immediately (`state.go:212,223,226`), so later bees skip `updateBlue`/`updateDirection`, nothing moves, nothing is eaten and the award reset is skipped. `resetEnemy` leaves `reverseDirection`, `Velocity` and `Frame` alone. `restartRound` leaves camera, particles and `modeCurrent` alone.
- Sounds: `rewind:start` then `play:start` in `StartState.OnEnter` (at construction, which happens during the hub tick; after a death; after a win); `rewind:power`/`play:power` when a bee is eaten; `rewind:death`/`play:death` on player death. A power pellet plays **no** sound.
- Particles: draw in pool slot order with `fillPremul` (D15) on a snapped 3×3 rect, `a = Math.trunc(alpha*255)` (`uint8` conversion). Colors are `#72dcbb` (bee eaten) and `#ee6a7c` (player eaten). Particle velocity uses `Math.cos/sin`, which may differ from Go in the last ulp (fact 3); positions are not in the snapshot.
- Rolling digits: the clipped 8×8 cell is done with `ctx.save(); clip rect; draw both glyphs; restore()` or an offscreen 8×8 surface. Note the leading-zero logic (the last 2 digits always draw). `easeDialOut` = `1 - u*(u*u)` with `u = 1-t`.
- READY glyph wave: `2*sin(intoReady*0.14 + i*1.05)`, no rounding (snapping per D13 still applies).
- Speed constants (1.0, 1.125, 0.9375, 0.625, 0.5) and derived constants (36, 188, 45) are hard-coded literals with a unit test.
- Draw order exactly as in `HiveSoftware.Draw` (`draw.go:19-36`). The cabinet is drawn unshaken.
- The cabinet sheet is 1680×428, 5 frames of 336. Asset sizes: bear 64×64, bee 64×96, food 32×24, ready 48×8, digits 80×8, bonus 64×16.
- Unit tests: `digits6`, `easeDialOut`, DigitReel sync/step, `findTarget` for all 4 kinds × modes, `updateDirection` tie-breaks, the no-reverse rule and `reverseTile` equality, the `updateBlue` flash cadence, `respawnBlinkHiddenForElapsed`, state machine transitions, the award ladder 200→400→800→1600 (capped) and its reset when no bee is scared, tunnel speed and wrap, `restartRound`, the collision early return.

**[A:arcade-games] firefly + gearhead** (owns `src/firefly/**`, `src/gearhead/**`, their parity tests)

- Firefly: port `TestAngle`/`TestFrameAngle` verbatim (they pass under JS float semantics). Add tests for the bezier endpoints, `collide`, the bullet lifecycle and `fireDelay`. Notes:
  - Bullets have Width/Height 0 (top-left anchor at position) and are flagged dead at `y <= 0`, but **still collide in that same tick** (`game.go:162-183` doesn't skip `Dead`).
  - Bugs not yet spawned (`Duration < 0`) sit at (0,0) and are collidable (`:169` only checks `DeadFrames`).
  - Explosion col = `5 - trunc(deadFrames/15)`. `explosion.png` is 160×32 (5 columns), so for deadFrames 1..14 col 5 is off the sheet: `sub()` returns 0×0 and nothing is drawn. Col 0 is never shown: deadFrames is set to 75 and decremented in the same tick, so the first draw sees 74.
  - `fireDelay` is set to 20 and decremented in the same tick (snapshot shows 19; fire period is 20 ticks).
  - Dead bugs are removed at the end of a tick (`:218`), so one snapshot has `bugs: []` before the wave respawns at the start of the next update.
  - Movement uses the `direction()` priority, so holding Up masks Left/Right.
  - Bugs are culled outside (0, 224)×(0, 288) **exclusive**; `durationStep = 1/(60*3)`. `Atan2` is draw-only (sprite frame).
  - Sounds: `rewind` then `play` for laser and boom.
- Gearhead: frame remap `2→0, 3→2`; flip via `flipX`; clamp X to [6, 108].

**[A:lab] wave + lumberjack** (owns `src/lab/**`, their parity tests)

- Wave:
  - Port `grid.go` exactly (entropy buckets, swap-remove, `Propogate` direction remap, constraints table). `Propogate` **replaces** a neighbour's set only when the new one is shorter (`grid.go:150-153`); it does not intersect.
  - rand order per `Step`: `intn(W)` then `intn(H)` on the first step, otherwise `intn(bucketLen)`; then `intn(len(possible))`.
  - The four Go globals (`gridSize`, `seconds`, `activeGridSize`, `activeSeconds`) become instance fields; defaults 128 and 5. `StepInterval = trunc(activeGridSize²/(60*activeSeconds))` (54 at the defaults; ≥2 within slider ranges). Space handling per §4.2 (rising edge, apply settings, reset, no `Step` that tick).
  - Draw collapsed cells **incrementally** into a persistent offscreen surface, then blit (256² cells would be too many draw calls per frame). Uncollapsed cells draw nothing (transparent).
  - HTML overlay outside the canvas: grid size slider 64–256 step 64, seconds 1–30, FPS/TPS, `collapsed / total`.
  - Tests: full collapse respects the constraints for adjacent cells (water never touches grass: constraint rows 1 = {1,2} and 3 = {2,3}; not guaranteed by construction but holds empirically, so keep the test over many seeds), `collapsedCount` reaches `w*h`, bucket invariants hold after random steps. Port the benchmarks (Go has only benchmarks, no tests) as an optional perf smoke (128² grid collapses in <1 s).
- Lumberjack:
  - Port the globals (`player`, `trees`) as fields of a `Lumberjack` scene instance; pass `trees` into `player.update` (Go reads the global at `player.go:181`).
  - Input: its own `Input` built from held up/down/left/right/space. All four directions apply in the order Up, Down, Left, Right (Up+Down cancel but `moving` stays true; facing = last applied, `player.go:163-179`). Do not use `direction()`.
  - Chop: damage applies on **every tick** with `acting && frameX == 2` and an overlapping action hitbox: 8 ticks × 10 = **80 per swing**, re-triggering `shake` each tick (`game.go:46-63`). Health goes negative and keeps dropping; a tree with health ≤0 is invisible but still collides and can still be chopped.
  - Spritesheet `Frame` out of range: Go would panic (`DrawImage(nil)`); it is unreachable with the current sheets (body 576×3584 = 9×56 frames, max FrameY 34; tools 384×768 = 6×12, FrameY 0..2). Throw, matching Go.
  - Tree top/bottom split: replicate the init-time pixel writes by copying frame (1,0) into two offscreen 64×80 surfaces and `clearRect` rows `[0,56)` on the bottom and `[56,80)` on the top. Rotate the top about (`pivotX`, 58) in tree-local coordinates by `theta`, where `pivotX = shakeRight ? 37 : 26`. Alpha 0.5 when transparent.
  - Draw order: trees not behind → player layers (base, chest, legs, feet, head, hands, tool if acting) → trees behind.
  - Import only these 9 PNGs (under `images/`): `Tiles/Grass/Grass_1_Middle.png`, `Player/Player_Base/Player_Base_animations.png`, `Player/Head/Hair_1/Hair_1_Brown.png`, `Player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png`, `Player/Hands/Hands_1_Bare.png`, `Player/Legs/OG_Pants/Pants_1_Blue.png`, `Player/Feet/Shoes_1_Brown.png`, `Player/Tools/Iron/Iron_Tools.png`, `Trees/Big_Oak_Tree.png`. (`Trees/Oak_Leaf_Particle.png` is loaded by Go but never drawn; skip it and note it.)
  - Tests: `Overlaps` (strict `<`), `Resolve` sign conventions (returns minus the overlap, ties go to Y), the tree shake cycle returns to theta 0, chop damage 80 per swing and only on `frameX == 2`, diagonal speed is ×0.75 (1.5 px/tick), Up+Down held together.

**Phase 2 gate per agent:** full `bun run typecheck` in its worktree, its unit tests, and its parity tests (once fixtures exist) pass, plus a short report listing the Go → TS file mapping and anything it put in `port-notes.md`.

### Phase 3: Integration [A:integrate] (blocked by every 1b and Phase 2 ticket)

- This ticket may edit any file under `src/` and `test/parity/`. Confirm every 1a stub has been replaced and the registries (hub ↔ software factories, test hook ↔ scenes) resolve to real code. Remove all `TODO` throws (`grep -rn "TODO" src` must be empty or justified).
- Run `bun run check`. **Every parity test must pass with no skips** (`bun test 2>&1 | grep -i skip` is empty). If a parity test fails, find the first diverging tick and field path, read the matching Go function, and fix the port in the owning module. A diverging `rng` field means a random call is missing, extra or out of order. Repeat until green. (If the original porter's agent is still alive, the orchestrator may instead SendMessage it the diverging tick/field to reuse its context, and that agent fixes it on its own branch, which is merged again.)
- Commit message: `Port arcade hub and minigames to TypeScript with tick-level parity tests`.

### Phase 4: Visual verification ∥ (two agents)

Both agents must **load the `agent-browser` skill first** (`Skill: agent-browser`, then `agent-browser skills get core --full`).

**[A:frames] Golden frame diff**

- `ARCADE_PORT=3002 bun run dev` in the background, then `ARCADE_PORT=3002 bun run frames` to capture TS frames for every scenario `captureTicks`. Then `scripts/frame-diff.ts` against `test/fixtures/frames`. Start with the first firefly frame to confirm the D13 snapping rule before running the rest.
- Pass criteria (pixelmatch `threshold: 0.1`, which absorbs ±1 rounding in alpha-blended pixels):
  - **0 differing pixels** for hub (including the debug panel and overlay, thanks to D14/D15), gearhead, firefly, wave (cells only on both sides) and hive, including particle frames. Exception: a particle one pixel off at a snap boundary is allowed only if it is traced to a last-ulp `Math.sin/cos` difference (fact 3) and noted in `port-notes.md`.
  - Lumberjack rotated tree tops: differences allowed only on the edge pixels of the rotated tree-top bounding box (mask from the snapshot); everything else 0.
  - Debug `strokeRect`/`line` pixel rules are settled here if they differ.
  - Any other diff → investigate (snapping, draw order, premultiplied color) and fix in the owning module (message that agent or fix directly in Phase 4 with a note).
- Produce `out/frame-report.md` (not committed): table of scenario/tick/diff-pixels plus diff PNG paths. Attach a summary to the PR body.
- Commit the fixes plus the `scripts/` updates only.

**[A:explore] Exploratory play-test** (read-only except `docs/port-notes.md`)

- With `agent-browser` against the dev server started with `ARCADE_PORT=3003` (no `?debug`, real keyboard via `press`/key down-up):
  1. Page loads; no console errors before or after the first keypress (audio unlock); canvas is integer-scaled and crisp at 1280×800 and 1920×1080 viewports and at device scale factor 1.25 if `agent-browser` supports it; no scrollbars; arrows/Space don't scroll the page.
  2. Walk to each cabinet: title overlay appears and the melody element plays (check `audio.paused === false` via `eval`).
  3. Enter each game, play ~10 s each, Esc back; the canvas resizes correctly each time and sprites stay crisp after every resize.
  4. Hive: lose all lives, auto-return to the hub, high score shown on the next hive launch.
  5. Shift+P toggles the debug panel (canvas width +120), in the hub and inside a game.
  6. `?scene=wave` and `?scene=lumberjack` work; wave sliders work and Space applies them.
  7. Tab away for 5 s and back: the game doesn't fast-forward (catch-up cap discards the backlog) and keys aren't stuck.
  8. Throttle the frame rate if `agent-browser` supports it (or open on a 120 Hz-simulated loop via the test hook's fake clock): speed is unchanged.
- Screenshots of each screen into `out/screens/` for the PR description.
- Report a pass/fail checklist.

**Phase 4 gate:** both agents green, or every failure has a fix landed and re-verified.

### Phase 5: Cleanup and deploy [A:cleanup] (blocked by both Phase 4 tickets), then [O] review

- Delete: `main.go`, `go.mod`, `go.sum`, `internal/` (after the `git mv` below), `cmd/`, `tools/golden/`, `main.wasm`, `wasm_exec.js`, `.air.toml`, `.air.web.toml`, `Makefile`, `main.odin`, `ols.json`, `assets/` (Odin copies). Keep `test/fixtures/**` (it is now the regression suite) and `icon.svg`. `git mv internal/assets/aseprite/cabinet.ase art/cabinet.ase`.
- `.gitignore` already has `node_modules/`, `dist/`, `out/`, `tmp/` (1a); confirm.
- `index.html`: title "Arcade", favicon `icon.svg`, black background, `<canvas id="screen">`, no external requests.
- `.github/workflows/static.yml`: checkout → `oven-sh/setup-bun@v2` (`bun-version: 1.4.2`) → `bun install --frozen-lockfile` → `bun run typecheck` → `bun test` → `bun run build` → `actions/configure-pages` → `actions/upload-pages-artifact` with `path: dist` → deploy. Keep the same triggers, permissions and concurrency. No `CNAME` file (fact 12).
- Rewrite `README.md`: what it is, controls (unchanged table plus Shift+P), `bun install`, `bun run dev`, `bun test`, `bun run build`, lab scenes, `?debug` hook, how to regenerate fixtures (they can no longer be regenerated from Go after this PR; say so and point at the commit that has the harness).
- Size gates: `dist/` total excluding lumberjack PNGs **< 1.2 MB** (assets alone are ~1.01 MB, fact 9), main JS < 60 KB minified. Report the actual numbers (vs 14 MB Wasm), split into JS / images / audio.
- Gates: `bun run check` green from a clean clone (`git clean -xfd && bun install && bun run check`); `rg -n "ebiten|wasm|odin" --glob '!docs/**' --glob '!test/fixtures/**' --glob '!src/engine/debugfont*'` is empty (the debug font's license notice names Ebitengine).

**[O] Final review**

- Run the `code-review` skill on `ts-port` against `main` (Standards + Spec, with this file as the spec). One implementer sub-agent fixes everything it confirms, in its own worktree, and a merger merges it.
- The draft PR has existed since the first merge (D10). Rewrite its body with the `pr` skill and mark it ready for review. The body has the summary, the deletion list, parity results (scenarios × ticks compared), the frame-diff table summary, screenshots, bundle size before/after, `port-notes.md` highlights, and how to run locally. It ends with the attribution line.

---

## 6. Port checklist (give to every porting agent)

- [ ] Every Go `int` field stays integer-valued: use `Math.trunc` on every int division and `int(...)`/`uint8(...)` conversion. Known sites: `pointToTile`, `digits6`, `frameAngle`, firefly explosion column, hive `pelletAnimTick / 15 % 4`, `respawnBlinkHiddenForElapsed`, bear sprite `Dx()/4` and `Dy()/4`, `b.Dx()/readyGlyphWidth`, digit glyph `Dx()/10`, `int(math.Max(...))` (`hive/draw.go:50`, `digit_reel.go:101`), `int(sx)`/`int(row)` (`hive/draw.go:289-294`), particle `uint8(alpha*255)`, lumberjack `MaxX/MaxY`, wave `StepInterval`, `int(player.Frame)` / `int(e.Frame)` in every sprite-frame lookup, `int(bonusEatIndicatorTTLSecs*60)`, particle `MaxLifeTicks = 18 + trunc(r*24)`.
- [ ] Keep float expression **order** identical to Go for runtime arithmetic (e.g. `velocityMax * 0.8`, `(50 + r*100) / 60`) so IEEE results match. Go **constant** expressions are folded exactly at compile time: hard-code their values as literals and unit-test them.
- [ ] `math.Mod` → `%`. `math.Max` on ints → `Math.max`. `math.Pow(x, 2)` on ints → `x*x`; `math.Pow(u, 3)` → `u*(u*u)`. `math.Round` → `goRound`.
- [ ] **Struct `==` / `!=` compares values in Go.** Compare fields in TS (`tileEq` etc.); never `===` on objects.
- [ ] Go zero values: struct fields default to 0 / false / `""` / nil. Initialize explicitly.
- [ ] Go maps used only for lookup → `Record<Direction, number>`. Never depend on map iteration order (Go randomizes it; the code already avoids that).
- [ ] Go slices with `DeleteFunc`/filter → `Array.prototype.filter`, preserving order.
- [ ] Struct value copies vs pointers: Go `tile` / `vec` / `rect` / `bonusEatPopup` are **values**. Copy them in TS (`{...v}`) wherever Go copies, e.g. `machine.rect.x += buffer` in the arcade debug overlay mutates a **copy**.
- [ ] `panic(...)` → `throw new Error(...)` with the same message.
- [ ] Every RNG call goes through `src/engine/rng.ts`, in the same order as Go.
- [ ] Sounds are called in the same order with the same method (`rewind` then `play`, etc.).
- [ ] Translucent `color.RGBA` values are premultiplied: draw them with `fillPremul` (D15), not `rgba()` CSS.
- [ ] No DOM access at import time or in `update()`/`snapshot()` (D12).
- [ ] Keep Go constant names (camelCase is fine) and comments that explain behavior.
- [ ] No `any`. No non-null `!` assertions without a comment saying why.

---

## 7. Definition of done

1. `bun run check` passes from a clean clone; CI is green on the PR.
2. All parity tests pass with zero skips: every scenario in §4.4, every tick, every snapshot field.
3. Frame diff: zero differing pixels at pixelmatch threshold 0.1, except edge pixels of rotated lumberjack tree tops and any documented last-ulp particle offsets.
4. The exploratory checklist (Phase 4) passes fully, with screenshots attached to the PR.
5. No Go, Odin or Wasm artifacts remain; the README and workflow are updated.
6. Bundle is < 1.2 MB excluding lab assets (vs 14 MB Wasm today).
7. `docs/port-notes.md` lists every intentional deviation (expected: rotated-sprite edges and last-ulp `Sin/Cos/Atan2` differences only) and any Go oddities preserved per D11.

## 8. Ticket graph and orchestrator run sheet

One GitHub issue per ticket. Blocking edges use GitHub's native issue dependencies (`docs/agents/issue-tracker.md`).

| Ticket                           | Section                         | Blocked by |
| -------------------------------- | ------------------------------- | ---------- |
| T1 scaffold + contracts          | §5 1a, §3                       | —          |
| T2 golden capture                | §5 1b [A:golden], §4            | T1         |
| T3 engine                        | §5 1b [A:engine]                | T1         |
| T4 game shell + hub              | §5 1b [A:hub]                   | T1         |
| T5 hive                          | §5 Phase 2 [A:hive], §6         | T1         |
| T6 firefly + gearhead            | §5 Phase 2 [A:arcade-games], §6 | T1         |
| T7 wave + lumberjack             | §5 Phase 2 [A:lab], §6          | T1         |
| T8 integration, all parity green | §5 Phase 3                      | T2–T7      |
| T9 golden frame diff             | §5 Phase 4 [A:frames]           | T8         |
| T10 exploratory play-test        | §5 Phase 4 [A:explore]          | T8         |
| T11 cleanup + deploy             | §5 Phase 5 [A:cleanup]          | T9, T10    |

```
[O]   create ts-port from main, push
T1    implement → merge into ts-port → open draft PR (closes spec + T1–T11)
T2–T7 ∥ six implementers, each in its own worktree → merge each as it finishes
T8    implement → merge
T9 ∥ T10 → merge
T11   implement → merge
[O]   code-review skill on ts-port vs main → one implementer fixes → merge
[O]   rewrite PR body (pr skill), mark ready; clean up worktrees
```

Max concurrency: 6 implementers (T2–T7). Each runs in its own worktree on its own branch; mergers merge into `ts-port` one at a time. File ownership is disjoint, apart from `docs/port-notes.md`, which merges by union (§5 legend).
