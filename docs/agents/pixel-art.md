# Pixel art

Every image in the game is pixel art, and ADR 0006 has it generated from source in the repo; some PNGs are still hand-made. Read this before you draw, redraw or spec art: where the source lives, how to draw less of it, how to look at it, and the bar it has to clear.

## Source

Art source is rows of Sweetie 16 letters, `.` blank. Every source uses the one letter map, `sweetie` in `src/ui/sweetie16.ts`. The font is the exception: its glyphs are `#` rows drawn in an ink colour.

| Art                              | Source                                                                                       | Generator                    |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
| Font, logo, title-card lettering | `src/ui/glyphs.ts` (`#` rows plus an ink colour)                                             | `scripts/gen-ui-art.ts`      |
| Hub room and cabinets, player    | `src/ui/hubArt.ts`, `playerArt.ts`                                                           | `scripts/gen-ui-art.ts`      |
| HUD icons, prize counter, prizes | `src/ui/icons.ts`, `counterArt.ts`, `prizeArt.ts`                                            | `scripts/gen-ui-art.ts`      |
| Firefly sprites and sky          | `src/firefly/art.ts`                                                                         | `scripts/gen-firefly-art.ts` |
| Cabinet strips                   | `art/cabinet.png` (hand-drawn in Aseprite, `cabinet.ase`), recoloured by `art/cabinets.json` | `scripts/gen-cabinets.ts`    |

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
| `checkRows(name, rows, { w, h })`     | Size and letters; the error names the row and column              |
| `toPng`, `toRows`, `scale`, `colours` | Rows to PNG and back, upscale, colour count                       |

Give each sprite its own export, so a change is an `Edit` of a short block of rows. A rewrite of the whole art file costs more and risks the sprites you did not mean to change. Every export gets a `checkRows` call in its generator's test.

## Look at it

`bun run pixel` writes a labelled sheet to `out/pixel/` and prints its path. Read that PNG.

| Command                                           | When                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pixel show <image>...`                           | While drawing. `path.ts:name` reads rows straight from the source, so you need no `bun run art`.            |
| `pixel place <base> <image>@x,y...`               | To judge a sprite where it stands, e.g. the player in the hub                                               |
| `pixel before <image>...`                         | For the PR: `origin/main`'s version beside yours, at one scale. Works on PNGs and on `path.ts:name` sources |
| `pixel rows <image>` / `pixel colours <image>...` | To import art, or to find a stray colour                                                                    |

An `<image>` is `path.png`, `path.png#x,y,w,h`, `path.ts:name` or `path.ts:name.key`. Run `bun run pixel` alone for the full usage.

In the running game, the verify check shows the art (`docs/agents/visual-verification.md`). `pixel` is for the drawing loop before that.

## The bar

- **As good as before.** Art that replaces art is at least as good as what it replaces. Attach the `pixel before` sheet to the PR beside the verify check's screenshots, so the owner judges the change at a glance.
- **Options for a new look.** When an issue leaves the look open (a redesign, a new character), draw two or three options as a prototype (`/prototype`) and build the one the owner picks.
- **Specs name the starting art.** An issue that asks for art says which existing art to import and keep, and asks for options when the look is open. To bring a hand-made PNG under ADR 0006, the spec asks to import it with `pixel rows`, so its look stays the same.
