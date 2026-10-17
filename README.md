# Arcade

Pixel art games within a game. Walk around an arcade, step up to a cabinet, and play the minigame inside: **Sweet Sam** (a Pac-Man-like bear and bees), **Firefly** (a Galaga-like shooter) and **Brass Monkey** (a Donkey Kong-like brass robot monkey escaping a gnome's factory).

The page opens on a title screen: **Continue** brings back the hub high score and where you were standing (saved in `localStorage` when you leave a minigame, quit to the menu, or close the tab). **New game** asks first when there is a save (starting one deletes it), then shows a short how-to-play screen and starts in the hub. Minigame progress is not saved.

**Play it in the browser:** https://arcade.dannyobrien.dev/

The game is TypeScript drawing to a `<canvas>` with Canvas 2D. There is no framework and there are no runtime dependencies. [Bun](https://bun.sh/) builds, serves and tests it. Every push to `main` runs `bun run check`, then builds and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`).

## Controls

| Key               | Action                                                                             |
| ----------------- | ---------------------------------------------------------------------------------- |
| WASD / arrow keys | Move; choose in menus                                                              |
| Space             | Interact / action; confirm in menus                                                |
| Esc               | Leave a minigame; in the hub, open the pause menu (Resume, Controls, Quit to menu) |
| Shift+P           | Toggle debug (hitboxes and a side panel in the hub)                                |

## Running

Requires Bun 1.4.2.

```sh
bun install          # dev dependencies only (TypeScript, Prettier, pngjs)
bun run dev          # dev server with hot reload on http://localhost:3000 (ARCADE_PORT=3005 bun run dev for another port)
bun test             # unit tests
bun run build        # production bundle in dist/
bun run preview      # serve dist/
bun run check        # typecheck + format check + test + build, as CI does (also run by the pre-push hook)
bun run format       # rewrite files in Prettier style (bun run format:check only reports)
bun run art          # rebuild the generated pixel art (UI, prize decorations, hub room and player from src/ui/, cabinets from art/, Firefly from src/firefly/art.ts)
bun run pixel        # look at art: rows, colours, show, before, place (docs/agents/pixel-art.md)
bun run sounds       # rebuild the title music and menu sounds from src/ui/sounds.ts
```

## Pixel art for text

All on-screen text is pixel art. The UI font and the title logo are drawn as ASCII (`#` and `.`) in `src/ui/glyphs.ts`; `bun run art` turns them into `src/assets/images/font.png` and `logo.png`, and a test fails if the committed PNGs drift from the source. The hub room (`src/ui/hubArt.ts`), the player's sprite sheet (`src/ui/playerArt.ts`), the HUD icons and the prize counter are rows of palette letters in the Sweetie 16 palette, generated the same way. `src/ui/text.ts` draws text, panels and key caps with them. The debug panel still uses the engine's debug font.

Firefly's sprites (the firefly, its spark, the Moth, Wasp and Owl, the hit effect and the night background) are rows of Sweetie 16 palette letters in `src/firefly/art.ts`. `bun run art` writes them to `src/assets/images/firefly/`, turning each enemy into a sheet of 15° rotation frames (`scripts/gen-firefly-art.ts`), and a test fails if they drift.

The title music and the menu blips are chiptune written as notes in `src/ui/sounds.ts`; `bun run sounds` synthesises them into `src/assets/sounds/title.wav`, `move.wav` and `select.wav`, and a test fails if the committed WAVs drift from the source.

## Scenes

The page opens the `title` scene. `?scene=game` skips the title and starts straight in the hub.

## Test hook

With `?debug` in the URL (for example `http://localhost:3000/?debug&scene=game`), the page exposes `window.__arcade` for deterministic browser checks. It can pause the loop, step fixed ticks with scripted input, seed the RNG, load any scene, and read back the state snapshot, the frame as a PNG data URL at logical resolution, and the sound calls. The full contract is `ArcadeTestHook` in `src/engine/testhook.ts`. Without the parameter the hook is not installed.

## Screenshots and video

`scripts/harness.ts` drives the real page with agent-browser, through the test hook and real keyboard events, and writes screenshots, frames and an mp4 to `out/verify/<name>/`. Agents use it from throwaway capture scripts for the evidence they show the owner; `docs/agents/visual-verification.md` explains how.

## Layout

| Path                                                                 | What                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main.ts`                                                        | Browser entry: preload images, pick the scene, run the fixed 60 TPS loop             |
| `src/engine/`                                                        | Canvas draw API, input, audio, assets, RNG, viewport scaling, test hook              |
| `src/game/`                                                          | Top-level loop (hub and active minigame), scene registry, snapshot types             |
| `src/title/`                                                         | Title scene: title menu, intro, pause menu, save (`SaveStore`)                       |
| `src/ui/`                                                            | Pixel font and logo source, text and panel drawing                                   |
| `src/arcade/`, `src/sweet-sam/`, `src/firefly/`, `src/brass-monkey/` | The hub and the three minigames                                                      |
| `test/fixtures/`                                                     | RNG reference outputs and old-format saves for the unit tests                        |
| `scripts/`                                                           | Capture harness (`scripts/harness.ts`), UI art and sound generators                  |
| `art/cabinet.ase`                                                    | Aseprite source for `art/cabinet.png`, the base of every cabinet strip (not shipped) |
| `docs/`                                                              | Port plan, port notes, ADRs (`docs/adr/`), agent workflow docs (`docs/agents/`)      |

## Port history

This is a port of an earlier Go version of the game. A parity suite once replayed 16 scenarios recorded from Go and checked every tick; it was retired once the games had been reworked on purpose (ADR 0009). Behaviour differences found during the port, and the Go quirks kept on purpose, are listed in `docs/port-notes.md`.
