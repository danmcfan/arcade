# Pixel art

Every image in the game is pixel art, and ADR 0006 has it generated from source in the repo; some PNGs are still hand-made. Read this before you draw, redraw or spec art: how the owner steers it, where the source lives, how to draw less of it, how to look at it, and the bar it has to clear.

## Steer it first

Every art change, new or redrawn, starts with a **playground** the owner steers; the PR comes after. Keep it cheap: the owner judges the look, so you write data, not a viewer.

1. **Copy, don't write, the viewer.** Start from the newest `prototype/<issue>-<slug>` branch (`git show origin/prototype/46-sweet-sam-art:scripts/prototype-sweet-sam-art/viewer.html`) and change only its data: a `scripts/prototype-<slug>.ts` inlines the rows into `viewer.html` and writes `out/prototype-<slug>/index.html`. Publish it as an artifact.
2. **One knob per decision the issue asks for**, each option a set of rows tagged original, current or new, with a **Copy my picks** button. Anything beyond the issue is an opt-in option.
3. **Wait for the picks.** The owner's pasted picks are the brief: commit the playground to `prototype/<issue>-<slug>`, draw the picks into the real source, and name them in the PR.

## Source

Art source is rows of Sweetie 16 letters, `.` blank. Every source uses the one letter map, `sweetie` in `src/ui/sweetie16.ts`. The font is the exception: its glyphs are `#` rows drawn in an ink colour.

| Art                              | Source                                                                                       | Generator                         |
| -------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| Font, logo, title-card lettering | `src/ui/glyphs.ts` (`#` rows plus an ink colour); the cards are in `art/title-cards/`        | `scripts/gen-ui-art.ts`           |
| Hub room, cabinets, desk, player | `src/ui/hubArt.ts`, `deskArt.ts`, `employeeArt.ts`, `playerArt.ts`                           | `scripts/gen-ui-art.ts`           |
| Scoreboard, menu icons, prizes   | `src/ui/tickerArt.ts`, `icons.ts`, `prizeArt.ts`                                             | `scripts/gen-ui-art.ts`           |
| Firefly sprites and sky          | `src/firefly/art.ts`                                                                         | `scripts/gen-firefly-art.ts`      |
| Brass Monkey characters, items   | `src/brass-monkey/art.ts`                                                                    | `scripts/gen-brass-monkey-art.ts` |
| Sweet Sam maze, sprites, text    | `src/sweet-sam/art.ts` (the maze as a tile map; the text in the Go game's lettering)         | `scripts/gen-sweet-sam-art.ts`    |
| Cabinet strips                   | `art/cabinet.png` (hand-drawn in Aseprite, `cabinet.ase`), recoloured by `art/cabinets.json` | `scripts/gen-cabinets.ts`         |

`bun run art` writes the PNGs. Commit the source and the PNGs together: the drift tests fail when they differ. A PNG in `src/assets/images` that no generator writes is hand-made; most came from the Go game.

## Import before you redraw

When the change touches art that already exists as a PNG, hand-made or not, **import** it first: `bun run pixel rows <png>` (or `<png>#x,y,w,h` for one frame of a sheet) prints its rows, and those rows become the source you edit. Art that only git still holds comes out with `git show <rev>:<png> > out/pixel/old.png` first. Hand-made art, the owner's especially (`art/cabinet.ase`, and the Go player `src/ui/playerArt.ts` was imported from), is the quality bar. Keep its look and change only what the issue asks for. Start from a blank grid only for things that do not exist yet.

## Derive what follows

`scripts/pixel-art.ts` makes the pixels that follow from other pixels. Draw the part only a person can decide and **derive** the rest:

| Helper                                | Use it for                                                        |
| ------------------------------------- | ----------------------------------------------------------------- |
| `mirrorX`, `mirrorY`                  | A symmetric sprite: draw the left (or top) half                   |
| `outline(rows, "k")`                  | The 1 px edge round the drawn pixels; leave a blank border for it |
| `flipX`, `flipY`                      | Left-facing frames from right-facing ones                         |
| `recolour(rows, { r: "b" })`          | Colour variants, such as one cabinet per minigame                 |
| `overlay(rows, part, x, y)`           | A sprite built from parts (a head, then headphones on it)         |
| `glint(rows, x, y)`                   | A glint frame: a white + over the sprite's colours, e.g. the bolt |
| `checkRows(name, rows, { w, h })`     | Size and letters; the error names the row and column              |
| `toPng`, `toRows`, `scale`, `colours` | Rows to PNG and back, upscale, colour count                       |

Give each sprite its own export, so a change is an `Edit` of a short block of rows. A rewrite of the whole art file costs more and risks the sprites you did not mean to change. Every export gets a `checkRows` call in its generator's test.

## Look at it

Check art as text first: `bun run pixel rows` and `checkRows` catch size, letters and stray colours without an image. Read a PNG only to judge the look, once per change; every image you read is paid for again on each later call. `bun run pixel` writes a small labelled sheet to `out/pixel/` and prints its path; pass `--scale` only when you need it bigger.

| Command                                           | When                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pixel show <image>...`                           | While drawing. `path.ts:name` reads rows straight from the source, so you need no `bun run art`.                      |
| `pixel place <base> <image>@x,y...`               | To judge a sprite where it stands, e.g. the player in the hub                                                         |
| `pixel before <image>...`                         | For the PR: `origin/main`'s version beside yours, at one scale. Works on PNGs and on `path.ts:name` sources           |
| `pixel rows <image>` / `pixel colours <image>...` | To import art, or to find a stray colour; `rows --nearest` imports art in another palette (the Go game's PICO-8 PNGs) |

An `<image>` is `path.png`, `path.png#x,y,w,h`, `path.ts:name` or `path.ts:name.key`. Run `bun run pixel` alone for the full usage.

In the running game, the verify check shows the art (`docs/agents/visual-verification.md`). `pixel` is for the drawing loop before that.

## The bar

- **As good as before.** Art that replaces art is at least as good as what it replaces. Attach the `pixel before` sheet to the PR beside the verify check's screenshots, so the owner judges the change at a glance.
- **The owner's picks.** The art matches the picks pasted back from the playground (Steer it first), and nothing more.
- **Specs name the starting art.** An issue that asks for art says which existing art to import and keep, and which choices the playground should offer. To bring a hand-made PNG under ADR 0006, the spec asks to import it with `pixel rows`, so its look stays the same.
