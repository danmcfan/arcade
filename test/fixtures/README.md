# Test fixtures

| Path | What | Read by |
|---|---|---|
| `rng.json` | mulberry32 reference outputs for seeds 1 and 42 | `src/engine/rng.test.ts` |
| `saves/v<n>.json` | A save in an older format, which `parseSave` must upgrade | `src/title/save.test.ts` |

## rng.json

```json
{ "algorithm": "mulberry32", "count": 1000,
  "seeds": { "1": [1000 numbers], "42": [1000 numbers] },
  "state": { "1": [1000 uint32s], "42": [...] },
  "intn":  { "1": [1000 ints],    "42": [...] } }
```

- `seeds[s][i]`: the (i+1)-th `rng.float()` after `rng.seed(s)`; `state[s][i]`:
  `rng.state()` right after that call.
- `intn[s][i]`: a fresh run from `rng.seed(s)` calling `rng.intn(i + 1)` for
  i = 0..999 (one call each, so the bound grows 1, 2, 3, ...).

It was recorded from the Go game's `internal/rng` before the port, and
`src/engine/rng.ts` must reproduce every entry exactly.

The Go-recorded parity fixtures (input scripts, per-tick traces and golden
frames) that used to live here were retired with their harness (ADR 0011).
