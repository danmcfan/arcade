# Go parity fixtures

Captured from the Go/Ebitengine game before it is deleted (ticket T2, §4 of
`docs/ts-port-plan.md`). The TypeScript port must reproduce them: traces tick
for tick, frames pixel for pixel. Everything here was produced by the
temporary harness in `tools/golden/` (deleted in Phase 5 with the rest of
the Go code; see "Regenerating" below) with `CGO_ENABLED=1 GOARCH=amd64`
(Rosetta on Apple Silicon; default `GOAMD64=v1`). On arm64, or with
`GOAMD64=v3`, Go fuses `x*y+z` into FMA and the firefly beziers come out
different, so the harness refuses to run on any other GOARCH.

| Path | What |
|---|---|
| `inputs/<name>.json` | Input scripts (§4.2, `InputScript` in `src/game/script.ts`) |
| `traces/<name>.jsonl.gz` | Per-tick state snapshots (§4.3, `src/game/snapshot.ts`) |
| `frames/<name>/<tick>.png` | Golden frames at logical resolution for each `captureTicks` entry |
| `rng.json` | mulberry32 reference outputs for seeds 1 and 42 |
| `hive.goReference.json` | Trimmed hive-only Go reference used by `src/hive/hive.test.ts` (not from `tools/golden/`; see below) |

Total size: about 2.9 MB (traces 1.7 MB, frames 0.98 MB, inputs 96 KB, rng 68 KB).

## Input scripts

Exactly the `InputScript` type. Key order is irrelevant; one step per line.

```json
{"name":"hive-fuzz-1","scene":"game","software":"hive","seed":1,"captureTicks":[1],"steps": [
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
  previous tick. Tick 1 also holds construction-time sounds (hive's
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

- Sizes follow the layout: hub 192×176, hive, firefly and gearhead 336×428
  (each plays inside its cabinet; firefly and gearhead were 256×320 and
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
| `arcade-walk` | 1 hub start · 41 hive cabinet title · 70 gearhead title · 359 firefly title · 390 debug panel + overlay · 410 debug + hive title · 432 hub after debug off |
| `arcade-enter-*` | entry tick (software just loaded, before its first update) · last tick inside · tick after Esc (back in the hub) |
| `hive-clear` | 1 tick 1 (READY) · 61 READY wave mid-animation · 383 camera shake (power pellet) · 387 bee-eaten popup + particles · 444 power mode · 601 mid-play · 7977 flashing bees · 9683 last FINALDEATHWAIT tick · 9684 hub after game over |
| `hive-modes` | 3358 flashing bees (unshaken) |
| `hive-fuzz-*` | 1 |
| `hive-highscore` | 2871 hub after game over · 2912 re-entered hive (high score dials) · 3042 later in that hive |
| `firefly-play` | 1 first wave · 60, 360, 685, 1098, 1401 explosions mid-animation |
| `gearhead-walk` | 191 facing left walking · 201 facing left idle |
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
| `arcade-walk` | hub | 1 | 432 | every wall face (top, left, bottom, right), all 3 cabinets approached facing Up (title + `play:melody`, then `pause:melody`/`rewind:melody`), Shift+P on (+120 px) and off, Esc in the hub (no-op) |
| `arcade-enter-gearhead` | hub | 1 | 409 | Up+Space at the cabinet, ~300 ticks inside, Esc (`pause:start`, layout change), back in the hub |
| `arcade-enter-hive` | hub | 1 | 385 | same for hive |
| `arcade-enter-firefly` | hub | 1 | 409 | same for firefly |
| `hive-fuzz-1..4` | `game.New(hive)` | 1..4 | 3616–3650 | random held directions, 10–60 tick holds; after game over the rest drives the hub |
| `hive-clear` | `game.New(hive)` | 11 | 9714 | look-ahead bot eats everything: round win at ~6700, bee chains 200→400→800→1600; then random holds to game over |
| `hive-modes` | `game.New(hive)` | 5 | 6903 | survival bot that never eats the last items, so one round lasts until `modeIndex` 8 (every `modeSequence` entry through index 7) |
| `hive-highscore` | hub | 21 | 3063 | enter hive from the hub, play to game over, hub `highScore` updated, re-enter hive (its high score dials boot from it), Esc |
| `firefly-play` | `game.New(firefly)` | 1 | 1501 | Space held while sweeping: bullets, hits, explosions, wave cleared (`bugs: []`) and respawned, bugs leaving off the top, a bullet hitting an unspawned bug at (0,0) |
| `gearhead-walk` | `game.New(gearhead)` | 1 | 206 | both wall clamps (x 6 and 108), flip left/right, idle frame reset, Up held |
| `wave-64-seed7` | wave 64/5 | 7 | 362 | 40 ticks of the first grid, Space mid-run (applies 64/5: 13 steps/tick), run to full collapse + 5 ticks |
| `wave-128-seed3` | wave 128/5 | 3 | 410 | 100 ticks, Space mid-run, run to full collapse + 5 ticks |
| `lumberjack-chop` | lumberjack | 1 | 621 | walk into tree 0 (Resolve), chop from the right (shakes right) and from below (shakes left) until health ≤ 0, keep chopping to −300, diagonal walk that bumps the invisible tree, Up+Down held, behind tree 1 (transparent), walk into tree 1 from above |

38,930 ticks in total. The hive bot only picked inputs; the scripts replay
without it.

### Coverage

`golden coverage` asserts, across all `hive-*` traces: power pellet eaten,
bee eaten (PAUSE with a 200 and a 400 award), popup + particles, tunnel wrap
(player and bee), death (PLAY → DEATHWAIT → START), final death (PLAY →
FINALDEATHWAIT → back in the hub with the high score taken), round win
(items 0 → START with a fresh set), the hub high score passed to a new hive,
and `modeIndex` 1..8. It also checks the firefly-play and lumberjack-chop
must-cover items above. Note that hive's GAMEOVER state never appears in a
trace: the tick it is entered, `Game.Update` sees `GameOver()` and drops the
software, so that tick's snapshot already has `software: null`.

## hive.goReference.json

A trimmed Go reference for hive on its own: seed 8, 6,000 ticks, driving the
hive software directly (no hub) with the "greedy" input generator in
`src/hive/hive.test.ts`. It holds the state transitions (`trans`), a few
complete snapshots (`snaps`) and the end state (`final`). It was captured during T5
by the hive porter's throwaway Go harness, not by `tools/golden/`: a copy of
`internal/hive` with `math/rand` swapped for mulberry32 at the same call
positions, a `Snapshot()` emitting the §4.3 keys, built with
`CGO_ENABLED=1 GOARCH=amd64`. The full per-tick traces matched the TS port
bit for bit at the time.

That harness was never committed, so **this file cannot be regenerated**.
It is kept as a cheap hive-level regression check (`hive.test.ts` imports
it; it is test-only and not in the bundle). The full `hive-*` traces above
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
| `arcade-enter-gearhead`, `gearhead-walk` | #15: same for Brass Monkey (`gearhead`) |
| `arcade-enter-hive`, `hive-clear`, `hive-fuzz-1`..`4`, `hive-highscore`, `hive-modes` (frames only) | #15: Sweet Sam's marquee is regenerated at the other cabinets' letter height. Only rows 0..53 (the marquee) were copied from the TypeScript capture; the rest of each frame is still the Go original |
| `arcade-walk` (frame 70 only) | #15: the Brass Monkey hub title card reads BRASS MONKEY (`titleCards` in `src/ui/glyphs.ts`). The frame differs from the Go original only in those 1080 title pixels |

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
go run ./tools/golden coverage                             # hive / firefly / lumberjack coverage
```

Traces are byte-for-byte reproducible (deterministic gzip header). The Go
hooks the harness relies on are behavior-neutral: `internal/rng` replaces
`math/rand` (seeded from the clock in normal play), `assets.OnSoundEvent`
and `assets.Silent` (nil/false in the game), `Game.UpdateWithInput`,
`wave.Game.Step`/`DrawCells`/`NewWithPending` (the four wave globals became
fields), `lumberjack.Step`/`ResetState`, firefly's `PatternName`, and
read-only `Snapshot()` methods in `golden.go` files.
