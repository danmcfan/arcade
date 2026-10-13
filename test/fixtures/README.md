# Parity fixtures

Most of these were captured from the Go/Ebitengine game before it was deleted (ticket T2, §4 of
`docs/ts-port-plan.md`). The TypeScript port must reproduce them: traces tick
for tick, frames pixel for pixel. Everything here was produced by the
temporary harness in `tools/golden/` (deleted in Phase 5 with the rest of
the Go code; see "Regenerating" below) with `CGO_ENABLED=1 GOARCH=amd64`
(Rosetta on Apple Silicon; default `GOAMD64=v1`). On arm64, or with
`GOAMD64=v3`, Go fuses `x*y+z` into FMA and the firefly beziers come out
different, so the harness refuses to run on any other GOARCH.

Some were re-recorded later from the TypeScript game, when behaviour changed
on purpose (ADR 0004; see "Re-recorded from the TypeScript game" below).

| Path | What |
|---|---|
| `inputs/<name>.json` | Input scripts (§4.2, `InputScript` in `src/game/script.ts`) |
| `traces/<name>.jsonl.gz` | Per-tick state snapshots (§4.3, `src/game/snapshot.ts`) |
| `frames/<name>/<tick>.png` | Golden frames at logical resolution for each `captureTicks` entry |
| `rng.json` | mulberry32 reference outputs for seeds 1 and 42 |
| `sweet-sam.goReference.json` | Trimmed Sweet Sam Go reference used by `src/sweet-sam/sweet-sam.test.ts` (not from `tools/golden/`; see below) |

Total size: about 2.9 MB (traces 1.7 MB, frames 0.98 MB, inputs 96 KB, rng 68 KB).

## Input scripts

Exactly the `InputScript` type. Key order is irrelevant; one step per line.

```json
{"name":"sweet-sam-fuzz-1","scene":"game","software":"sweetSam","seed":1,"captureTicks":[1],"steps": [
  {"ticks":1,"input":{}},
  {"ticks":37,"input":{"left":true}}
]}
```

- `seed` is applied with `rng.seed(seed)` **before** the scene is constructed.
- `input` is `Partial<Input>`; missing keys are false. All keys are held
  state except `shiftP`, which is "just pressed" on the step's first tick
  only (`expandSteps`).
- `scene: "game"` with `software` = `game.New(<software>)`: tick 1 is a hub
  tick with that tick's input; the software runs from tick 2. Without
  `software` the game starts in the hub.
- `scene: "wave"`: `wave` holds the **pending** slider values. The first grid
  is `gridSize²`, but `StepInterval` and the layout use the active values,
  which start at 128 and 5 until a Space rising edge copies pending to
  active (so `wave-64-seed7` runs a 64² grid at 54 steps/tick on a 2048²
  canvas until its Space press). `space` is held; the scene acts on its
  rising edge (the first tick is a rising edge if `space` is held).
- `scene: "lumberjack"`: up/down/left/right/space map 1:1 to its own held
  `Input`.

## Traces

`traces/<name>.jsonl.gz` is gzipped JSONL (decompress with `Bun.gunzipSync`).
Line k (0-based) is the snapshot taken **after** tick k+1, so the first line
has `tick: 1` and there is one line per expanded input tick. Keys and types
are exactly those in `src/game/snapshot.ts`:

- `game` scenes: `GameSnapshot`. `sw` is the active software's snapshot or
  `null`; `sounds` lists sound calls in call order since the end of the
  previous tick. Tick 1 also holds construction-time sounds (Sweet Sam's
  `rewind:start`, `play:start`), because the harness installs its sound hook
  before constructing anything.
- `wave`: `WaveSnapshot`; only the **last** line carries `cells` (the full
  grid, `cells[x][y]`).
- `lumberjack`: `LumberjackSnapshot`.

Number formatting is Go's `encoding/json` (shortest round-trip), so
`JSON.parse` gives the exact float64 Go had. Traces re-recorded from
TypeScript (see "Regenerating") use `JSON.stringify` instead, which parses
to the same values. Watch for:

- **Exponent notation** for tiny or huge floats (e.g. a lumberjack `theta` of
  `-5.204170427930421e-18`). `JSON.parse` handles it.
- **Negative zero** is written as `-0` (firefly bugs L0 and R0 start with
  `duration: -0` because Go computes `-durationStep*60*0`; it shows on the
  tick firefly is entered, before its first update). JS computes the same
  `-0`; compare with `===` (treats `-0 === 0`) or make sure both sides agree
  under `Object.is`.
- Empty slices are always `[]`, never `null`. `null` appears only where the
  contract says so (`software`, `sw`, `title`).

## Frames

`frames/<name>/<tick>.png` is what Go's `Draw` produces for the state after
tick `<tick>`, rendered into a cleared (transparent) offscreen image at the
scene's logical size at that tick (`Layout`), read back with `ReadPixels`
and written as a normal non-premultiplied RGBA PNG. Pixels Go never draws
are transparent (alpha 0), not black.

- Sizes follow the layout: hub 192×176, Sweet Sam, firefly and Brass Monkey 336×428
  (each plays inside its cabinet; firefly and Brass Monkey were 256×320 and
  256×288 in the Go capture, before #15), lumberjack 512×288, plus 120 px
  of width while debug mode is on. Wave is `16 × activeGridSize` square (2048² before a restart, 1024²
  after Space with `gridSize` 64).
- Wave frames contain `drawCells` only (no debugui window; that becomes an
  HTML overlay in TS).
- `golden verify` replays every script and checks each PNG exists with the
  scene's size at that tick.

What the capture ticks show:

| Scenario | Ticks |
|---|---|
| `arcade-walk` | 1 hub start (token and ticket counts on top, the prize counter on the bottom wall) · 41 Sweet Sam cabinet title · 70 Brass Monkey title · 389 firefly title · 420 debug panel + overlay · 440 debug + Sweet Sam title · 462 hub after debug off |
| `arcade-enter-*` | entry tick (software just loaded, before its first update) · last tick inside · Esc tick (minigame pause menu opens) · QUIT GAME selected (NO TICKETS) · hub after Quit game (1 token spent) |
| `sweet-sam-clear` | 1 tick 1 (READY) · 61 READY wave mid-animation · 383 camera shake (power pellet) · 387 bee-eaten popup + particles · 444 power mode · 601 mid-play · 7977 flashing bees · 9683 last FINALDEATHWAIT tick · 9684 hub after game over |
| `sweet-sam-modes` | 3358 flashing bees (unshaken) |
| `sweet-sam-fuzz-*` | 1 |
| `sweet-sam-highscore` | 2871 game over: the payout opens · 2900 mid-count (1 ticket) · 2943 hub after the payout (5 tickets) · 2994 re-entered Sweet Sam (high score dials) · 3124 later in that game · 3125 minigame pause menu · 3158 hub after Quit game |
| `firefly-play` | 1 first wave · 60, 360, 685, 1098, 1401 hit effects mid-animation |
| `brass-monkey-play` | 190 climbing the first ladder · 612 mid-jump over a gear · 1030 girder floor finished · 1400 the conveyor floor · 1662 a life lost · 8040 the escaped scene |
| `lumberjack-chop` | 108 tree top rotated mid-shake · 556, 561 player behind tree 1 (alpha 0.5) |
| `wave-64-seed7` | 40 mid-run before Space (2048² canvas) · 199 50% collapsed · 357 100% collapsed |
| `wave-128-seed3` | 100 mid-run before Space · 253 50% · 405 100% |

## rng.json

```json
{ "algorithm": "mulberry32", "count": 1000,
  "seeds": { "1": [1000 numbers], "42": [1000 numbers] },
  "state": { "1": [1000 uint32s], "42": [...] },
  "intn":  { "1": [1000 ints],    "42": [...] } }
```

- `seeds[s][i]`: the (i+1)-th `rng.float()` after `rng.seed(s)` (the shape
  `src/engine/rng.test.ts` reads); `state[s][i]`: `rng.state()` right after
  that call.
- `intn[s][i]`: a fresh run from `rng.seed(s)` calling `rng.intn(i + 1)` for
  i = 0..999 (one call each, so the bound grows 1, 2, 3, ...).

The Go side is `internal/rng` (uint32 arithmetic); `src/engine/rng.ts` must
reproduce every entry exactly.

## Scenarios

| Scenario | Scene | Seed | Ticks | Purpose |
|---|---|---|---|---|
| `arcade-walk` | hub | 1 | 462 | every wall face (top, left, bottom, right), the prize counter's left side (then round it), all 3 cabinets approached facing Up (title + `play:melody`, then `pause:melody`/`rewind:melody`), Shift+P on (+120 px) and off, Esc in the hub (no-op) |
| `arcade-enter-brass-monkey` | hub | 1 | 442 | Up+Space at the cabinet (1 token), ~300 ticks inside, Esc opens the minigame pause menu (minigame sounds paused), Down, Down, Space: Quit game, back in the hub (layout change) |
| `arcade-enter-sweet-sam` | hub | 1 | 418 | same for Sweet Sam |
| `arcade-enter-firefly` | hub | 1 | 442 | same for firefly |
| `sweet-sam-fuzz-1..4` | `game.New(sweetSam)` | 1..4 | 3616–3650 | random held directions, 10–60 tick holds; after game over the rest drives the hub |
| `sweet-sam-clear` | `game.New(sweetSam)` | 11 | 9714 | look-ahead bot eats everything: round win at ~6700, bee chains 200→400→800→1600; then random holds to game over |
| `sweet-sam-modes` | `game.New(sweetSam)` | 5 | 6903 | survival bot that never eats the last items, so one round lasts until `modeIndex` 8 (every `modeSequence` entry through index 7) |
| `sweet-sam-highscore` | hub | 21 | 3178 | enter Sweet Sam from the hub, play to game over, hub `highScore` updated, payout (560 points: 5 tickets; Space skips, Space closes), re-enter Sweet Sam (its high score dials boot from it), Esc and Quit game |
| `firefly-play` | `game.New(firefly)` | 1 | 1501 | Space held while sweeping: bullets, hits, explosions, wave cleared (`bugs: []`) and respawned, bugs leaving off the top, a bullet hitting an unspawned bug at (0,0) |
| `brass-monkey-play` | `game.New(brassMonkey)` | 163 | 9136 | recorded from TypeScript (#39); inputs written by `scripts/gen-brass-monkey-play.ts`'s bot: climbs, jumps (hazards jumped), bolts, both floors finished, 2 lives lost, the escape, then standing still to game over and back in the hub |
| `wave-64-seed7` | wave 64/5 | 7 | 362 | 40 ticks of the first grid, Space mid-run (applies 64/5: 13 steps/tick), run to full collapse + 5 ticks |
| `wave-128-seed3` | wave 128/5 | 3 | 410 | 100 ticks, Space mid-run, run to full collapse + 5 ticks |
| `lumberjack-chop` | lumberjack | 1 | 621 | walk into tree 0 (Resolve), chop from the right (shakes right) and from below (shakes left) until health ≤ 0, keep chopping to −300, diagonal walk that bumps the invisible tree, Up+Down held, behind tree 1 (transparent), walk into tree 1 from above |

48,104 ticks in total. The Sweet Sam bot only picked inputs; the scripts replay
without it.

### Coverage

`golden coverage` asserts, across all `sweet-sam-*` traces: power pellet eaten,
bee eaten (PAUSE with a 200 and a 400 award), popup + particles, tunnel wrap
(player and bee), death (PLAY → DEATHWAIT → START), final death (PLAY →
FINALDEATHWAIT → back in the hub with the high score taken), round win
(items 0 → START with a fresh set), the hub high score passed to a new Sweet Sam game,
and `modeIndex` 1..8. It also checks the firefly-play and lumberjack-chop
must-cover items above. Note that in the Go-recorded traces Sweet Sam's GAMEOVER
state never appears: the tick it is entered, `Game.Update` sees `GameOver()`
and drops the software, so that tick's snapshot already has
`software: null`. In the TS-recorded `sweet-sam-highscore` it shows for as long
as the payout is open.

## sweet-sam.goReference.json

A trimmed Go reference for Sweet Sam on its own: seed 8, 6,000 ticks, driving the
Sweet Sam software directly (no hub) with the "greedy" input generator in
`src/sweet-sam/sweet-sam.test.ts`. It holds the state transitions (`trans`), a few
complete snapshots (`snaps`) and the end state (`final`). It was captured during T5
by the Sweet Sam porter's throwaway Go harness, not by `tools/golden/`: a copy of
the Go Sweet Sam package with `math/rand` swapped for mulberry32 at the same call
positions, a `Snapshot()` emitting the §4.3 keys, built with
`CGO_ENABLED=1 GOARCH=amd64`. The full per-tick traces matched the TS port
bit for bit at the time.

That harness was never committed, so **this file cannot be regenerated**.
It is kept as a cheap Sweet Sam regression check (`sweet-sam.test.ts` imports
it; it is test-only and not in the bundle). The full `sweet-sam-*` traces above
supersede it for regression purposes: if the two ever disagree, the traces
win.

## Regenerating

**The Go captures can no longer be regenerated from the current tree.** The
Go game, `internal/rng` and the harness in `tools/golden/` were deleted in
Phase 5 (ticket #12). Fixtures that nothing has changed since are still the
Go originals.

### Re-recording a deliberately changed fixture from TypeScript

When a change alters what a scenario records (ADR 0004: the PR says which
fixtures and why), re-record just those scenarios from the TypeScript game,
keeping their input scripts as they are:

```sh
bun run traces <scenario> [scenario ...]   # traces/<scenario>.jsonl.gz (scripts/record-traces.ts)
bun run frames <scenario> [scenario ...]   # out/frames/<scenario>/*.png
cp out/frames/<scenario>/*.png test/fixtures/frames/<scenario>/
bun run frames:report                      # every other scenario still matches
```

`bun run traces` has no "all" default, so untouched fixtures are never
rewritten. Its JSONL is `JSON.stringify` output, not Go's: `-0` is written
as `0` and exponents look different. Both parse to values the harness's
`===` compare treats as equal.

Re-recorded from TypeScript so far:

| Scenario | Why |
|---|---|
| `arcade-enter-firefly`, `firefly-play` | #15: Firefly plays inside its cabinet bezel (336×428 layout) and its snapshot gains `joystick` |
| `arcade-enter-brass-monkey`, `brass-monkey-walk` | #15: same for Brass Monkey |
| `arcade-enter-sweet-sam`, `sweet-sam-clear`, `sweet-sam-fuzz-1`..`4`, `sweet-sam-highscore`, `sweet-sam-modes` (frames only) | #15: Sweet Sam's marquee is regenerated at the other cabinets' letter height. Only rows 0..53 (the marquee) were copied from the TypeScript capture; the rest of each frame is still the Go original |
| `arcade-walk` (frame 70 only) | #15: the Brass Monkey hub title card reads BRASS MONKEY (`titleCards` in `src/ui/glyphs.ts`). The frame differs from the Go original only in those 1080 title pixels |
| `arcade-walk`, `arcade-enter-sweet-sam`, `arcade-enter-firefly`, `arcade-enter-brass-monkey`, `sweet-sam-highscore` | #16: the hub draws a coin and the token count, a ticket and the ticket count; Esc in a minigame opens the minigame pause menu (inputs add Down, Down, Space: Quit game), and game over opens the payout (`sweet-sam-highscore` adds Space, Space). Traces and changed frames re-recorded |
| `sweet-sam-fuzz-1`..`4`, `sweet-sam-clear`, `sweet-sam-modes`, `firefly-play`, `brass-monkey-walk` | #16: inputs and behaviour unchanged; `GameSnapshot` gained `arcade.tokens`, `arcade.tickets`, `run`, `menu`, `cursor` and `payout`, so the traces were re-recorded. Frames unchanged except `sweet-sam-clear/9684` (the hub shows the counts) |
| `arcade-walk` | #21: the prize counter stands on the bottom wall and is solid. The walk along the bottom wall now stops at the counter, goes up round it and comes back down to the bottom wall (the 110-tick Right step became Right 24, Up 16, Right 80, Down 20), so every capture after tick 70 moved 30 ticks later (359, 390, 410, 432 became 389, 420, 440, 462). Trace and every frame re-recorded |
| `sweet-sam-fuzz-1`..`3` | #21: after game over the random walk in the hub runs into the prize counter. Traces re-recorded; inputs and frames unchanged |
| `arcade-enter-*` (hub frame after Quit game), `sweet-sam-clear` (9684), `sweet-sam-highscore` (2943, 3158) | #21: hub frames show the prize counter. Only those frames were re-recorded; they differ from the old ones only in the counter's 556 pixels. Traces unchanged |
| `firefly-play` (every frame), `arcade-enter-firefly` (58, 358, 359, 381) | #33: Firefly's art is regenerated from `src/firefly/art.ts`: the firefly, sparks, Moths and hit effect on a night sky with grass. Only the frames that show the Firefly playfield were re-recorded, and they differ only inside it (x 56..279, y 56..343). Inputs and traces unchanged |
| `arcade-enter-brass-monkey`, `brass-monkey-walk` | #37: the code name became `brassMonkey` (fixtures renamed from their old code name). The only input change is `software`; every key press is the same. Traces re-recorded and equal to the old ones with only the software and title name changed. Frames moved, byte-identical |
| `arcade-walk` | #37: the walk passes the Brass Monkey cabinet, so its trace names the hub title. Trace re-recorded and equal to the old one with only the title name changed; input and frames unchanged |
| `arcade-walk` (every frame), `arcade-enter-*` (hub frame after Quit game), `sweet-sam-clear` (9684), `sweet-sam-highscore` (2943, 3158) | #17: the hub room, the cabinets, the player and the prize counter are redrawn as generated pixel art from the options the owner picked (arcade carpet and neon wall, classic upright cabinets, the original player in headphones, the glass-case counter; `src/ui/hubArt.ts`, `src/ui/playerArt.ts`, `src/ui/counterArt.ts`). Only the hub frames were re-recorded; inputs and traces unchanged |
| `arcade-walk`, `arcade-enter-*`, `sweet-sam-highscore`, `sweet-sam-fuzz-1`..`3`, `sweet-sam-clear` | Hub screens and song: the hub song loops whenever no minigame runs (`play:hub` on the first hub tick, `pause:hub` entering a cabinet, `play:hub` back in the hub), and Go's hub melody became the faced cabinet's attract loop plus a screen-on sound (`play:melody` became `play:attract<Name>`, `rewind:screenOn`, `play:screenOn`). Traces re-recorded; each equals the old one in every field but `sounds`. The cabinet screens are dark glass until faced and then switch on like a CRT with light on the carpet, so the hub frames were re-recorded too (`arcade-walk` every frame, `arcade-enter-*` the hub frame after Quit game, `sweet-sam-clear` 9684, `sweet-sam-highscore` 2943 and 3158); they differ only on the three screens and the carpet in front of them. Inputs unchanged |
| `sweet-sam-clear`, `sweet-sam-fuzz-1`..`4`, `sweet-sam-highscore`, `sweet-sam-modes`, `arcade-enter-sweet-sam` | #45: the code name became `sweetSam` (fixtures renamed from their old code name). The only input change is `software`; every key press is the same. Traces re-recorded and equal to the old ones with only the software name changed. Frames moved, byte-identical |
| `sweet-sam-clear`, `sweet-sam-fuzz-1`..`4`, `sweet-sam-modes`, `sweet-sam-highscore`, `arcade-enter-sweet-sam` (every frame that shows the maze) | #46: Sweet Sam's art is regenerated from `src/sweet-sam/art.ts`: honeycomb wax maze, the bear, four different bees, sleepy and waking bees, honey drops, honey pots and Sweetie 16 particles; "1UP", "HIGH SCORE", READY! and the points for a sleepy bee are drawn in the pixel font. Only frames showing the Sweet Sam playfield were re-recorded (hub frames unchanged). Inputs and traces unchanged |
| the same frames | #46, the owner's second picks: "1UP" and "HIGH SCORE" (baked into the maze), READY!, the score digits and the points are the Go game's thick lettering again, generated from `src/sweet-sam/art.ts`, READY! in yellow and the points in white. Sweet Sam's cabinet gains a bevelled edge and a black joystick base (`art/cabinets.json`). Re-recorded again; hub frames, inputs and traces unchanged |
| the same frames | #46, the owner's maze pick: the wax is solid yellow with a 1 px orange border and rounded outer corners, in place of the honeycomb. Only the 17 frames whose maze changed were re-recorded; hub frames, inputs and traces unchanged |
| `arcade-enter-firefly` (58, 358), `arcade-enter-brass-monkey` (58, 358), `firefly-play` (1, 60, 360, 685, 1098, 1401), `brass-monkey-walk` (191, 201) | #61: Firefly's and Brass Monkey's cabinets gain Sweet Sam's bevelled edge (lit in the letter-shadow colour, shaded in the old joystick-base colour) and a black joystick base (`art/cabinets.json`). Only the 12 frames that show those bezels were re-recorded; they differ only on the bezel's edge, the screen's lip and the joystick base. Inputs and traces unchanged |
| `brass-monkey-walk` (every frame), `arcade-enter-brass-monkey` (58, 358, 359, 381) | #38: Brass Monkey's characters are generated from `src/brass-monkey/art.ts` (the owner's picks): the brass robot monkey replaces the Go player sprite on the same path, and the Gnome stands still on the workshop's top girder. Only the frames inside Brass Monkey were re-recorded; they differ only where the two sprites are drawn (x 64..141, y 130..319). Inputs and traces unchanged |
| `brass-monkey-walk` (191, 201), `arcade-enter-brass-monkey` (58, 358, 359, 381) | #38, phase 1: Brass Monkey's girder floor is generated from `src/brass-monkey/art.ts` and `floors.ts` (the owner's picks: red I-beam girders, steel ladders, the steel exit door with a green lamp on the top platform, a riveted panel wall) in place of the green Go workshop, its "1UP HIGH SCORE 2UP" and bonus box; the bands above and below are Sweetie 16 black. The layout is the old workshop's. Only frames showing Brass Monkey were re-recorded; 58, 358, 191 and 201 differ only inside its screen (x 56..279, y 56..343). 359 and 381 (the pause menu) also pick up #61's bezel, which that re-recording missed. Inputs and traces unchanged |

| `brass-monkey-walk` (deleted), `brass-monkey-play` (new), `arcade-enter-brass-monkey` | #39: Brass Monkey became a real game (run, jump, climb two floors past gears and embers, lives, score, bonus, the escape). The Go-recorded walk no longer describes the game (Up no longer walks, the snapshot grew), so it was deleted and `brass-monkey-play` recorded from TypeScript in its place. `arcade-enter-brass-monkey`'s inputs are unchanged; its trace (the new snapshot) and every frame inside Brass Monkey (the game fills the screen with its scores band) were re-recorded |

A minigame started straight from `game.New(software)` (every scenario with
`software`) costs no token and has no payout, so those scenarios still end
straight back in the hub.

### The original Go capture

Commit `34840f8` is the last commit that still has the Go harness. Check it
out (for example in a separate worktree:
`git worktree add ../arcade-golden 34840f8`), run the commands below from
its root, and copy the resulting `test/fixtures/` back. You need Go 1.26
with `CGO_ENABLED=1 GOARCH=amd64` (Rosetta on Apple Silicon). This would
overwrite the TypeScript re-recordings above with the older Go behaviour.

```sh
./tools/golden/capture.sh          # rng.json, traces, frames (one window per scenario), verify, coverage
./tools/golden/capture.sh --gen    # same, but first rewrite inputs/*.json from tools/golden/gen.go
```

Or step by step:

```sh
export CGO_ENABLED=1 GOARCH=amd64
go run ./tools/golden rng                                  # test/fixtures/rng.json
go run ./tools/golden gen                                  # test/fixtures/inputs/*.json
go run ./tools/golden trace all                            # every trace (or list script paths)
go run ./tools/golden frames test/fixtures/inputs/X.json   # one scenario per process (opens a window)
go run ./tools/golden verify                               # every captureTicks PNG exists, right size
go run ./tools/golden coverage                             # sweetSam / firefly / lumberjack coverage
```

Traces are byte-for-byte reproducible (deterministic gzip header). The Go
hooks the harness relies on are behavior-neutral: `internal/rng` replaces
`math/rand` (seeded from the clock in normal play), `assets.OnSoundEvent`
and `assets.Silent` (nil/false in the game), `Game.UpdateWithInput`,
`wave.Game.Step`/`DrawCells`/`NewWithPending` (the four wave globals became
fields), `lumberjack.Step`/`ResetState`, firefly's `PatternName`, and
read-only `Snapshot()` methods in `golden.go` files.
