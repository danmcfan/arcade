# Port notes

Oddities found while porting Go to TypeScript (D11): Go behavior preserved as is, intentional deviations, and anything that needs orchestrator sign-off. Append only; one bullet per finding, prefixed with the ticket, e.g. `- [T5 hive] ...`.

- [T8 lumberjack] Unused assets: Go loads `Trees/Oak_Leaf_Particle.png` (`tree.go:25`) and builds `treeTrunkFrame` (frame 0,0) and `treeCanopyFrame` (frame 2,0) (`tree.go:27-28`), but never draws any of them. They are not imported or ported; only frame (1,0) is used, split into the top and bottom images.
- [T8 lumberjack] Chop damage is per tick, not per swing: every tick with `Acting && FrameX == 2` and an overlapping action hitbox costs 10 health and re-triggers `Shake` (8 ticks = 80 per swing). Health is never clamped and goes negative; a tree at health <= 0 is no longer drawn but still blocks the player and can still be chopped (and shaken, invisibly). Ported as is.
- [T8 lumberjack] `Tree.Behind` is just `player.Y < tree.Y + 16`, with no X check, so every tree in the row flips to "behind" (drawn over the player) at once. Only `Transparent` checks X. Ported as is.
- [T8 lumberjack] Up+Down held together: the Y moves cancel out, but `Moving` stays true, so the walk animation plays in place, facing DOWN (the last direction applied), and Space can't start a chop. With a horizontal key added, speed drops to the diagonal 1.5 px/tick. Ported as is.
- [T8 lumberjack] Out-of-range `Spritesheet.Frame` returns nil in Go, and `DrawImage(nil)` would panic. It can't happen with the current sheets (body max FrameY 34 of 56, tools 0..2 of 12). TS `mustFrame` throws instead.
- [T8 lumberjack] Layout: game.go's `const` block (`debug`, `width`, `height`, `tileWidth/Height`, `scale`) lives in `src/lab/lumberjack/constants.ts` instead of `game.ts`, so `tree.ts`/`player.ts` can import it without an import cycle. `thetaMax`/`thetaInterval` are hard-coded literals equal to the values Go folds at compile time (checked in `tree.test.ts`). Debug hitbox drawing (`debug = false` in Go) uses `fillPremul` on a snapped rect; it is never drawn.

