# Parity fixtures are retired

`test/fixtures/` held 16 scenarios recorded from the Go game (input scripts, a state trace for every tick and golden frames), and `test/parity/` replayed them on every `bun test` (ADR 0004). They proved the TypeScript port matched Go tick for tick. Since then every game has been reworked on purpose: Sweet Sam follows the arcade Pac-Man, Firefly and Brass Monkey were redesigned, and the hub gained prizes and a wallet. Most fixtures had already been re-recorded from the TypeScript game, so they pinned whatever the game did last time rather than a reference, and each deliberate change meant re-recording traces and frames in the same PR.

So the parity harness, its fixtures and their tooling (`bun run traces`, `bun run frames`, `bun run frames:report`, the fixture replay, the Sweet Sam bot and the Brass Monkey play generator) are removed. This supersedes ADR 0004. Behaviour is proven by unit tests through the headless game (ADR 0003), and what a player sees by capture scripts (ADR 0010). So is `rng.json`, the Go RNG reference: the RNG tests already pin its sequence per seed, and nothing needs it to match Go any more.

The fixtures survive in history: the last commit that has them is the parent of the commit that adds this ADR.
