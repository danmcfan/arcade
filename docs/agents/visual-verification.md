# Visual verification

Every user-visible change (art, UI, menus, gameplay feel, sound) ships with **screenshots and video** of it in the running game, attached to the PR. Unit tests prove the behaviour; the media shows the owner what a player sees, and it is the evidence the reviewer judges.

Capture it with a **throwaway capture script**: written for this PR, run, attached, never committed. Put it in `out/capture/<name>.ts` (git, tsc, lint and format all ignore `out/`) and run it with `bun out/capture/<name>.ts`. It starts its own dev server on a free port (or reuses the one at `ARCADE_PORT`) and writes to `out/verify/<name>/` (the harness keeps its `verify()` name and that folder, which the Sandcastle pipeline collects as evidence).

## Write one

Everything comes from `scripts/harness.ts`:

```ts
import { verify } from "../../scripts/harness.ts";

await verify("pause-menu", (v) => {
  v.openHook("scene=game"); // ?debug: paused, only step() moves time
  v.step(20, { left: true }); // 20 ticks holding left
  v.tap("escape");
  if (v.snapshot<TitleSnapshot>().phase !== "paused") throw new Error("Esc did not pause");
  v.frame("pause"); // canvas at logical res, 4x nearest-neighbour

  v.open(); // real page, real rAF loop
  v.key("Space"); // real keydown, held long enough for a tick
  v.screenshot("intro"); // what a person sees

  v.record(
    "walkthrough",
    () => {
      // mp4 for the PR
      v.wait(800);
      v.key("ArrowRight", 600);
    },
    { storage: { "arcade.save": "..." } },
  );

  v.assertNoErrors(); // page errors / console errors
});
```

| Need                                | Use                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Reach an exact state                | `openHook()`, `step()`, `tap()`, `snapshot()`. The contract is `ArcadeTestHook` in `src/engine/testhook.ts`. |
| Exact pixels at game resolution     | `frame(name, scale)`                                                                                         |
| The page as a player sees it        | `open()`, `key()`, `wait()`, `screenshot()`; `hold(code, play)` keeps one key down (Space while steering)    |
| Motion, animation, a flow           | `record(name, play, { scene, storage })` writes `.mp4` (for the PR) and `.webm`                              |
| A phone or tablet (touch, no hover) | `await phone()` before `open()`; `await recordPhone(name, play, opts)` for its video                         |
| A minigame on a later stage         | `jump(stage)` after the run starts (Firefly); `startFirefly(v, seed)` starts one                             |
| A pass/fail line, the hosted Game   | `check(ok, what, got)`, `gameIn(v)`                                                                          |
| Anything else                       | `v.page.run(...)` / `v.page.eval(js)` (raw agent-browser)                                                    |

## Look at the results

- Read the PNGs directly. `frame()` output is already upscaled, so it is legible.
- For a sprite or sheet on its own, before/after sheets or a sprite placed in the room, use `bun run pixel` (`docs/agents/pixel-art.md`).
- To review a video without reading every frame, make one contact sheet and read that:

  ```sh
  ffmpeg -y -loglevel error -i out/verify/<name>/<clip>.mp4 \
    -vf "fps=1.5,scale=300:-1,tile=5x1" -frames:v 1 -update 1 <scratch>/sheet.png
  ```

- For before/after, run the same capture script on `main` in a worktree (`git worktree add ../arcade-main main`), copy the files out, then remove the worktree.

## Gotchas (all handled by the harness)

- **`agent-browser press` is too short.** Its keyup arrives within one tick, so the game never sees the key. `key()` dispatches a real keydown, holds it, then sends keyup.
- **`agent-browser keydown Space` sends an empty `key` and `code`.** Use `key("Space")`.
- **Recording starts a fresh browser context.** localStorage set before `record start` is gone.
- **Any navigation during a recording freezes the video on one frame**, and that includes `open()` and reloads. `record()` opens the final URL itself and seeds `storage` through the test hook. Inside `play`, drive the page with `key()` and `wait()` only.
- **Audio starts only after a user gesture, and Shift is not one.** Press a real key such as Space before you check that music is playing. Sound is checked through `__arcade.sounds()` or the audio element state; nobody listens to it, so mention in the PR what a person should listen for.
- **zsh does not word-split a command held in a variable** (`B="agent-browser --session x"; $B open` fails). In ad-hoc shell work, use a function: `ab() { agent-browser --session x "$@"; }`.
- **A headless browser can look touch-first** and show the "needs a keyboard" notice instead of the game. `open()` and `record()` add `?keyboard`, which skips it; after `phone()` (and in `recordPhone()`) they leave it off, so a phone still sees the notice.
- **Browser zoom emulation** at fractional device-pixel ratios can lose a device pixel at the edges. That is an emulation artifact, not a game bug (`docs/port-notes.md`, T12).

## Parity frames

Separate from capture scripts: `bun run frames` captures the parity-fixture frames (it starts its own server), and `bun run frames:report` diffs them against the golden frames into `out/frame-report.md`.
