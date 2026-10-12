# Arcade

Pixel art games within a game. Walk around an arcade, step up to a cabinet, and play the minigame inside: **hive** (a Pac-Man-like bear and bees), **firefly** (a Galaga-like shooter) and **gearhead** (a gnome in a workshop).

The page opens on a title screen: **Continue** brings back the hub high score and where you were standing (saved in `localStorage` when you leave a minigame, quit to the menu, or close the tab). **New game** asks first when there is a save (starting one deletes it), then shows a short how-to-play screen and starts in the hub. Minigame progress is not saved.

**Play it in the browser:** https://arcade.dannyobrien.dev/

The game is TypeScript drawing to a `<canvas>` with Canvas 2D. There is no framework and there are no runtime dependencies. [Bun](https://bun.sh/) builds, serves and tests it. Pushes to `main` deploy `dist/` to GitHub Pages (`.github/workflows/static.yml`).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move; choose in menus |
| Space | Interact / action; confirm in menus |
| Esc | Leave a minigame; in the hub, open the pause menu (Resume, Controls, Quit to menu) |
| Shift+P | Toggle debug (hitboxes and a side panel in the hub) |

## Running

Requires Bun 1.4.2.

```sh
bun install          # dev dependencies only (TypeScript, pngjs, pixelmatch)
bun run dev          # dev server with hot reload on http://localhost:3000 (ARCADE_PORT=3005 bun run dev for another port)
bun test             # unit tests and the parity suite
bun run build        # production bundle in dist/
bun run preview      # serve dist/
bun run check        # typecheck + test + build, as CI does (also run by the pre-push hook)
bun run verify       # browser checks with screenshots and video (see below)
bun run art          # rebuild font.png and logo.png from src/ui/glyphs.ts
bun run sounds       # rebuild the title music and menu sounds from src/ui/sounds.ts
```

## Pixel art for text

All on-screen text is pixel art. The UI font and the title logo are drawn as ASCII (`#` and `.`) in `src/ui/glyphs.ts`; `bun run art` turns them into `src/assets/images/font.png` and `logo.png`, and a test fails if the committed PNGs drift from the source. `src/ui/text.ts` draws text, panels and key caps with them. The debug panel still uses the engine's debug font.

The title music and the menu blips are chiptune written as notes in `src/ui/sounds.ts`; `bun run sounds` synthesises them into `src/assets/sounds/title.wav`, `move.wav` and `select.wav`, and a test fails if the committed WAVs drift from the source.

## Scenes

The page opens the `title` scene. `?scene=game` skips the title and starts straight in the hub (as the parity fixtures do).

Two demos are not wired into the arcade hub. Open them with a query parameter:

- `?scene=wave`: wave-function-collapse over grass, sand and water tiles. Use the sliders in the overlay to set the grid size and how many seconds the collapse should take, then press Space to restart with the new settings.
- `?scene=lumberjack`: walk with the arrow keys and chop trees with Space.

## Test hook

With `?debug` in the URL (for example `http://localhost:3000/?debug&scene=lumberjack`), the page exposes `window.__arcade` for deterministic browser checks. It can pause the loop, step fixed ticks with scripted input, seed the RNG, load any scene, and read back the state snapshot, the frame as a PNG data URL at logical resolution, and the sound calls. The full contract is `ArcadeTestHook` in `src/engine/testhook.ts`. Without the parameter the hook is not installed.

## Verify checks

`bun run verify` runs the browser checks in `scripts/verify/` (or `bun run verify title` for one). Each starts its own dev server, drives the real page with agent-browser through the test hook and through real keyboard events, and writes screenshots, frames and an mp4 to `out/verify/<name>/`. It exits non-zero on the first failed check. `scripts/harness.ts` is the shared driver; `docs/agents/visual-verification.md` explains how to write a check.

## Layout

| Path | What |
| --- | --- |
| `src/main.ts` | Browser entry: preload images, pick the scene, run the fixed 60 TPS loop |
| `src/engine/` | Canvas draw API, input, audio, assets, RNG, viewport scaling, test hook |
| `src/game/` | Top-level loop (hub and active minigame), scene registry, snapshot types |
| `src/title/` | Title scene: title menu, intro, pause menu, save (`SaveStore`) |
| `src/ui/` | Pixel font and logo source, text and panel drawing |
| `src/arcade/`, `src/hive/`, `src/firefly/`, `src/gearhead/` | The hub and the three minigames |
| `src/lab/wave/`, `src/lab/lumberjack/` | Lab scenes |
| `test/fixtures/` | Recorded input scripts, per-tick traces and golden frames (see below) |
| `test/parity/` | Replays every fixture scenario and compares it tick by tick |
| `scripts/` | Verify harness and checks (`scripts/verify/`), frame capture and diff tools, UI art and sound generators |
| `art/cabinet.ase` | Aseprite source for `art/cabinet.png`, the base of every cabinet strip (not shipped) |
| `docs/` | Port plan, port notes, ADRs (`docs/adr/`), agent workflow docs (`docs/agents/`) |

## Parity fixtures

This is a port of an earlier Go version of the game. Before the Go code was removed, a harness recorded 16 scripted scenarios from it (38,930 ticks), now stored in `test/fixtures/`:

- `inputs/*.json`: the input scripts.
- `traces/*.jsonl.gz`: a state snapshot after every tick.
- `frames/<scenario>/<tick>.png`: golden frames at logical resolution.
- `rng.json`: reference outputs for the shared PRNG.

`bun test` replays every script and must match every trace field on every tick. Behaviour differences found during the port, and the Go quirks kept on purpose, are listed in `docs/port-notes.md`.

To compare frames, capture the TS frames, then diff them against the goldens:

```sh
bun run frames                       # starts a dev server, writes out/frames/ (needs agent-browser)
bun run frames:report                # writes out/frame-report.md and out/diff/
```

**The fixtures cannot be regenerated from this tree.** The Go game and its capture harness (`tools/golden/`) were deleted with the rest of the Go code. Commit `34840f8` is the last commit that still has them. To regenerate the fixtures, run the harness from a checkout of that commit (details in the "Regenerating" section of `test/fixtures/README.md`):

```sh
git worktree add ../arcade-golden 34840f8 && cd ../arcade-golden
# Go 1.26 with CGO_ENABLED=1 GOARCH=amd64 (Rosetta on Apple Silicon); the harness refuses any other GOARCH
./tools/golden/capture.sh          # rng.json, traces, frames (one window per scenario), verify, coverage
./tools/golden/capture.sh --gen    # same, but first rewrite inputs/*.json from tools/golden/gen.go
```

Or step by step, at that commit:

```sh
export CGO_ENABLED=1 GOARCH=amd64
go run ./tools/golden rng                                  # test/fixtures/rng.json
go run ./tools/golden gen                                  # test/fixtures/inputs/*.json
go run ./tools/golden trace all                            # every trace (or list script paths)
go run ./tools/golden frames test/fixtures/inputs/X.json   # one scenario per process (opens a window)
go run ./tools/golden verify                               # every captureTicks PNG exists, right size
go run ./tools/golden coverage                             # hive / firefly / lumberjack coverage
```

Copy the regenerated `test/fixtures/` back onto the current branch. If you change gameplay on purpose, the affected traces have to be updated with it, and there is no longer a Go reference to capture them from.
