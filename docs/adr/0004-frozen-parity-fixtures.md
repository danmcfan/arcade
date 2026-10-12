# Parity fixtures are frozen and cannot be re-recorded

`test/fixtures/` holds 16 scenarios recorded from the Go game: input scripts, a state trace for every tick, and golden frames. `bun test` replays them and must match every field on every tick. The Go game and its capture harness were deleted after the port (they survive only at commit `34840f8`), so the fixtures cannot be regenerated from this tree. During the port, behaviour was copied as is, bugs included (D11). Known quirks are listed in `docs/port-notes.md`.

## Consequences

- Changing gameplay on purpose (the Firefly and Brass Monkey reworks, the hub visual pass) means updating or retiring the affected fixtures in the same PR, with a sentence explaining why.
- Loosening a parity assertion just to make a test pass is never an acceptable fix.
