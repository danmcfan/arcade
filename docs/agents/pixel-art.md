# Pixel art

Every image in the game is pixel art, and ADR 0006 has it generated from source in the repo; some PNGs are still hand-made. Read this before you draw, redraw or spec art: how the owner steers it, where the source lives, how to draw less of it, how to look at it, and the bar it has to clear.

## Work it out with the owner

Every art change, new or redrawn, starts with the owner, before any PR. Ask which of two modes they want:

- **Prototype**: a few options for an asset, each built from the art the issue names to start from: its references, or the existing art. Put them in a variants file (`bun run pixel` has the format) under `out/studio/variants/`, run `bun run pixel preview <file>` and publish the page with the Artifact tool. That link is how the owner sees prototypes.
- **Tweak**: small changes to an existing asset. Edit its rows in place, show the result with `bun run pixel before`, and adjust from the owner's notes.

Start the studio only when the owner asks for it: run `bun run studio` and give them the URL, with `?spec=path.ts:name` for the first export. It opens any rows export, lists the variants beside it, and draws with the Sweetie 16 palette, frames, onion skin and an animated preview. Saving writes the rows into the export's array literal, formats the file and runs `bun run art`; read the save back with `git diff`.

The owner's picks are the brief either way: finish the change around them, and name them in the PR.

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

## Import before you draw

When the change touches art that already exists as a PNG, hand-made or not, or the issue names reference art, **import** it first: `bun run pixel rows <png>` (or `<png>#x,y,w,h` for one frame of a sheet) prints its rows, and those rows become the source you edit. Art that only git still holds comes out with `git show <rev>:<png> > out/pixel/old.png` first. Hand-made art, the owner's especially (`art/cabinet.ase`, and the Go player `src/ui/playerArt.ts` was imported from), is the quality bar. Keep its look and change only what the issue asks for. A reference sets the style: take its proportions, shading and poses from its pixels, and recolour or redraw only what makes the asset ours.

## Derive what follows

`scripts/pixel-art.ts` makes the pixels that follow from other pixels. Draw the part only a person can decide and **derive** the rest with its helpers (mirror, flip, outline, recolour, overlay, glint; the file's header lists them).

Give each sprite its own export, so a change is an `Edit` of a short block of rows. A rewrite of the whole art file costs more and risks the sprites you did not mean to change. Every export gets a `checkRows` call in its generator's test.

## Look at it

Check art as text first: `bun run pixel rows` and `checkRows` catch size, letters and stray colours without an image. Read a PNG only to judge the look, once per change; every image you read is paid for again on each later call. `bun run pixel` writes a small labelled sheet to `out/pixel/` and prints its path; pass `--scale` only when you need it bigger.

`show` while drawing, `place` to judge a sprite where it stands, `preview` for the owner, `before` for the PR, `rows` and `colours` to import art or find a stray colour. Run `bun run pixel` alone for the usage.

In the running game, the verify check shows the art (`docs/agents/visual-verification.md`). `pixel` is for the drawing loop before that.

## The bar

- **As good as before.** Art that replaces art is at least as good as what it replaces. Attach the `pixel before` sheet to the PR beside the verify check's screenshots, so the owner judges the change at a glance.
- **The owner's picks.** The art matches what the owner picked (Work it out with the owner), and nothing more.
- **Specs name the starting art.** An issue that asks for art says which existing art to import and keep, and which choices the prototypes should offer. To bring a hand-made PNG under ADR 0006, the spec asks to import it with `pixel rows`, so its look stays the same.
