# Port notes

Oddities found while porting Go to TypeScript (D11): Go behavior preserved as is, intentional deviations, and anything that needs orchestrator sign-off. Append only; one bullet per finding, prefixed with the ticket, e.g. `- [T5 hive] ...`.

- [T4 hub] Entering a machine (Up+Space) clears `melodyPlaying` but not `imageTitle` (`arcade/update.go:38-44`), so the snapshot's `title` keeps the cabinet's name while `melodyPlaying` is false, until the next melody start/stop. Preserved.
- [T4 hub] After Esc (or game over) the player is still facing Up under the cabinet, so the first hub tick back restarts the melody (`play:melody`). Esc pauses only `start`; `power`/`death`/`laser`/`boom` are left playing. Preserved.
- [T4 hub] On the Esc tick neither the software nor the hub updates (`game.go:49-53`); Esc held in the hub does nothing. Shift+P is handled first and does not end the tick.
- [T4 hub] `game.New(software)`: tick 1 is a full hub update with tick 1's input, so the player can move, start the melody or even load a different machine on that tick (which would replace the initial software after its START sound already played). Preserved.
- [T4 hub] Go `Software.Update` returns an `error` that `Game.Update` ignores; the TS `Software.update` returns `void`. `debug.Panel.x` is never read, `enabled` is always true and `Toggle` is never called; ported anyway.
- [T4 hub] `State.DebugInfo` formats with `%.0f` (ties to even); ported as `formatFloat0`. Hub positions are always integers, so it only matters in principle.
- [T4 hub] Test infra: Bun's `mock.module` leaks into every test file that runs after it in the same `bun test` process (verified on 1.4.2). The hub injects its collaborators (`new Game(software, { createSoftware, debugPrint })`) instead of mocking modules.

