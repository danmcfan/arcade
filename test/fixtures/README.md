# Test fixtures

| Path | What | Read by |
|---|---|---|
| `saves/v<n>.json` | A save in an older format, which `parseSave` must upgrade | `src/title/save.test.ts` |
| `gate/game.png`, `gate/notice-phone.png` | A desktop game screenshot and a phone screenshot of the keyboard notice | `test/gates.test.ts` |

The Go-recorded parity fixtures (input scripts, per-tick traces and golden
frames) and the Go RNG reference `rng.json` that used to live here were
retired with their harness (ADR 0011).
