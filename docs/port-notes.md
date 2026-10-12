# Port notes

Oddities found while porting Go to TypeScript (D11): Go behavior preserved as is, intentional deviations, and anything that needs orchestrator sign-off. Append only; one bullet per finding, prefixed with the ticket, e.g. `- [T5 hive] ...`.

- [T6 firefly] Bullets flagged dead at `y <= 0` (they are 0×0, so `Height/2` is 0) still collide on that same tick: the collision loop (`game.go:167-183`) does not skip `Dead` bullets. Preserved.
- [T6 firefly] Bugs that have not spawned yet (`Duration < 0`) sit at (0,0) and are collidable (only `DeadFrames` is checked). A bullet near the top-left corner can kill a waiting bug. Preserved.
- [T6 firefly] The first bug of each side gets delay `-durationStep*60*0`, which is `-0`; `-0 < 0` is false, so it flies on the very first update. Same in JS. `-0` never reaches a snapshot (the first update adds `durationStep`).
- [T6 firefly] Explosion column is `5 - trunc(deadFrames/15)`: column 0 is never shown (75 is decremented on the tick it is set), and for `deadFrames` 1..14 column 5 is off the 160 px sheet, so the empty sub-image draws nothing. The exploding bug is invisible for its last 14 ticks but still holds up the wave respawn. Preserved.
- [T6 firefly] Player X clamp is asymmetric: `[8, 217]` (`224 - 8 + 1`). Preserved.
- [T6 firefly] A bug flying off the top is culled from drawing at `y <= 0` but only removed at `y < 0`; dead bugs are removed at the end of the tick, so one snapshot shows `bugs: []` before the next update respawns the wave.
- [T6 firefly] `debug.go` (unreachable, `debug = false`): `colorControlLine` is premultiplied `RGBA{255,255,0,128}`, which `Surface.line` (CSS colour) cannot express exactly; ported as `rgba(255,255,0,0.5)`. Dead code, no parity impact.
- [T6 gearhead] Holding only Up or Down still walks: `Moving()` is true and the gnome moves 1 px in its current facing. Direction priority (Up, Down, Left, Right) also means Up+Right does not turn the gnome right. Preserved.
- [T6 gearhead] `Frame += 0.2` drifts in float64: frame 2 starts on tick 11 (not 10), frame 3 on tick 15, and the wrap (`>= 4`) happens on tick 20 at `4.000000000000001`, so the walk cycle is uneven. Same arithmetic in JS; preserved.
- [T6 gearhead] Y never changes (240) and X is clamped to `[6, 108]`, so the gnome only walks the left half of the 224 px workshop. Preserved.
