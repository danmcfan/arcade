# Coding standards

Read at review time (`/code-review`, Standards axis). These rules are judgement calls that no linter catches; `bun run check` already covers types, tests and the build. Each rule names the ADR behind it, where there is one. Terms follow `GLOSSARY.md`.

## Game logic

- **Time is in ticks.** Durations, cooldowns, speeds and animations are counted in ticks or per tick, never in milliseconds, `setTimeout` or `Date.now()` (ADR 0002). Flag any wall-clock timing in `src/` outside `src/engine/loop.ts` and the RNG seed in `src/main.ts`.
- **Headless.** Game modules do not touch `window`, `document`, `localStorage`, `Image` or `Audio` at import time or in `step()`/`update()`/`snapshot()`. Browser access goes through an injected dependency, the way the title scene gets its save through `SaveStore` (ADR 0003).
- **Randomness goes through `src/engine/rng.ts`.** A `Math.random()` in game code breaks replays.
- **New state is visible in `snapshot()`.** When a scene or minigame gains state that a check would assert on, its snapshot type in `src/game/snapshot.ts` includes it.
- **Parity is changed deliberately.** A PR that changes behaviour covered by a parity fixture updates or retires that fixture and says why in the PR body. Watch for tolerances widened, scenarios skipped or assertions dropped just to get green (ADR 0004).

## Look, sound and feel

- **Everything is pixel art at logical resolution.** No `fillText`, web fonts, CSS-drawn UI, anti-aliased shapes or smooth scaling in the game. Text goes through `src/ui/text.ts` (ADR 0006).
- **Generated assets change at their source.** Font, logo and sound changes edit `src/ui/glyphs.ts` / `src/ui/sounds.ts` and commit the regenerated PNG/WAV in the same change. Watch for a hand-edited generated file.
- **Controls are shown as key caps.** Any on-screen control hint uses the key-cap style of the intro and Controls panel (`drawKey` in `src/ui/text.ts`), with the same labels everywhere.
- **Destructive choices confirm, safe option first.** Anything that deletes progress (New game over a save) asks first, with No selected by default. A menu offers only the choices that are possible right now: Continue is hidden, not greyed out, when there is no save.
- **Player-facing names come from the glossary.** Use Sweet Sam, Firefly, Brass Monkey, token and ticket in on-screen text and docs. Code names (`hive`, `gearhead`) stay in code.

## Structure

- **Shared code is shared, not copied per minigame.** Logic two minigames both need (cabinet bezel, HUD, payout) lives in one module that both use. Flag a near-duplicate of an existing module.
- **Follow the existing layout.** One folder per minigame under `src/`, shared engine code in `src/engine/`, UI drawing in `src/ui/`, top-level loop and contracts in `src/game/`. Tests sit next to their source as `*.test.ts`.
- **Persisted formats are versioned.** A change to the save's shape bumps `v` in `src/title/save.ts` and decides, in code and in a test, what happens to older saves.

## Verification and PRs

- **User-visible changes come with a verify check.** Every change a player can see or hear adds or updates a script in `scripts/verify/` that asserts on the new behaviour. Screenshots or a video from it are attached to the PR (`docs/agents/visual-verification.md`, `docs/agents/delivery.md`).
- **One-off scripts become shared tools.** A browser or art helper written for a single change belongs in `scripts/harness.ts` or a `bun run` script when it is general, not duplicated in a scratch file.
