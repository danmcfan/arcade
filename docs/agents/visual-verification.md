# Visual verification

Every user-visible change (art, UI, menus, gameplay feel, sound) gets a **verify check**: a script in `scripts/verify/<name>.ts` that drives the real page in a browser, asserts on game state, and writes the screenshots and video the PR needs. Tests prove the logic. The verify check proves what a player sees, and its files are the evidence the reviewer judges.

## Run

```sh
bun run verify            # every check in scripts/verify/
bun run verify title      # one check
```

- Each check starts its own dev server on a free port and closes it when done. If a server is already running at `ARCADE_PORT`, the check reuses it.
- Each check writes to `out/verify/<name>/`, which git ignores.
- A failing check prints `verify <name>: FAILED` and exits non-zero.

## Write one

Copy the shape of `scripts/verify/title.ts`. Everything comes from `scripts/harness.ts`:

```ts
import { verify } from "../harness.ts";

await verify("pause-menu", (v) => {
  v.openHook("scene=game");            // ?debug: paused, only step() moves time
  v.step(20, { left: true });          // 20 ticks holding left
  v.tap("escape");
  if (v.snapshot<TitleSnapshot>().phase !== "paused") throw new Error("Esc did not pause");
  v.frame("pause");                    // canvas at logical res, 4x nearest-neighbour

  v.open();                            // real page, real rAF loop
  v.key("Space");                      // real keydown, held long enough for a tick
  v.screenshot("intro");               // what a person sees

  v.record("walkthrough", () => {      // mp4 for the PR
    v.wait(800);
    v.key("ArrowRight", 600);
  }, { storage: { "arcade.save": "..." } });

  v.assertNoErrors();                  // page errors / console errors
});
```

| Need | Use |
| --- | --- |
| Deterministic state checks | `openHook()`, `step()`, `tap()`, `snapshot()`. The contract is `ArcadeTestHook` in `src/engine/testhook.ts`. |
| Exact pixels at game resolution | `frame(name, scale)` |
| The page as a player sees it | `open()`, `key()`, `wait()`, `screenshot()`; `hold(code, play)` keeps one key down (Space while steering) |
| Motion, animation, a flow | `record(name, play, { scene, storage })` writes `.mp4` (for the PR) and `.webm` |
| A phone or tablet (touch, no hover) | `await phone()` before `open()`; `await recordPhone(name, play, opts)` for its video |
| Anything else | `v.page.run(...)` / `v.page.eval(js)` (raw agent-browser) |

Keep the check in the repo and in the PR, so the next change to that screen can rerun it.

## Look at the results

- Read the PNGs directly. `frame()` output is already upscaled, so it is legible.
- For a sprite or sheet on its own, before/after sheets or a sprite placed in the room, use `bun run pixel` (`docs/agents/pixel-art.md`).
- To review a video without reading every frame, make one contact sheet and read that:

  ```sh
  ffmpeg -y -loglevel error -i out/verify/<name>/<clip>.mp4 \
    -vf "fps=1.5,scale=300:-1,tile=5x1" -frames:v 1 -update 1 <scratch>/sheet.png
  ```

- For before/after, run the same check on `main` in a worktree (`git worktree add ../arcade-main main`), copy the files out, then remove the worktree.

## Gotchas (all handled by the harness)

- **`agent-browser press` is too short.** Its keyup arrives within one tick, so the game never sees the key. `key()` dispatches a real keydown, holds it, then sends keyup.
- **`agent-browser keydown Space` sends an empty `key` and `code`.** Use `key("Space")`.
- **Recording starts a fresh browser context.** localStorage set before `record start` is gone.
- **Any navigation during a recording freezes the video on one frame**, and that includes `open()` and reloads. `record()` opens the final URL itself and seeds `storage` through the test hook. Inside `play`, drive the page with `key()` and `wait()` only.
- **Audio starts only after a user gesture, and Shift is not one.** Press a real key such as Space before you check that music is playing. Sound is checked through `__arcade.sounds()` or the audio element state; nobody listens to it, so mention in the PR what a person should listen for.
- **zsh does not word-split a command held in a variable** (`B="agent-browser --session x"; $B open` fails). In ad-hoc shell work, use a function: `ab() { agent-browser --session x "$@"; }`.
- **Browser zoom emulation** at fractional device-pixel ratios can lose a device pixel at the edges. That is an emulation artifact, not a game bug (`docs/port-notes.md`, T12).

## Parity frames

Separate from verify checks: `bun run frames` captures the parity-fixture frames (it starts its own server), and `bun run frames:report` diffs them against the golden frames into `out/frame-report.md`.
