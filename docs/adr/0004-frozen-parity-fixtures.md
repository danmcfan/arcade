# Parity fixtures are frozen and cannot be re-recorded

Superseded by ADR 0009: the parity fixtures and their harness were removed.

`test/fixtures/` holds 16 scenarios recorded from the Go game: input scripts, a state trace for every tick, and golden frames. `bun test` replays them and must match every field on every tick. The Go game and its capture harness were deleted after the port (they survive only at commit `34840f8`), so the fixtures cannot be regenerated from this tree. During the port, behaviour was copied as is, bugs included (D11). Known quirks are listed in `docs/port-notes.md`.

The Go recordings stay frozen. When behaviour changes on purpose, the affected fixtures are re-recorded from the TypeScript game instead (first done for tokens and tickets, #16).

## Consequences

- Changing gameplay on purpose (the Firefly and Brass Monkey reworks, the hub visual pass) means updating or retiring the affected fixtures in the same PR, with a sentence explaining why.
- An updated fixture is re-recorded from the TypeScript game: `bun run traces <scenario>` for the trace and `bun run frames <scenario>` for the golden frames (`test/fixtures/README.md`). From then on it pins the TS behaviour, not Go's. Name only the scenarios that changed, and when only snapshot keys were added, first check that the old trace equals the new one with those keys removed.
- Loosening a parity assertion just to make a test pass is never an acceptable fix.
- Updating a fixture means re-recording it from the TypeScript game: `bun run traces <scenario>` for the trace and `bun run frames <scenario>` for the golden frames, with the input script unchanged (`test/fixtures/README.md`, "Regenerating"). The Go originals of every other fixture still cannot be regenerated.
