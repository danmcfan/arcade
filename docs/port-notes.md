# Port notes

Oddities found while porting Go to TypeScript (D11): Go behavior preserved as is, intentional deviations, and anything that needs orchestrator sign-off. Append only; one bullet per finding, prefixed with the ticket, e.g. `- [T5 hive] ...`.

- [T3 engine] `Surface.fillPremul` (D15) matches Go only over an opaque destination. Over transparent pixels the "lighter" pass makes the result opaque, where Go would leave alpha `a`. Every planned use (hive particles, hub debug panel and overlay) draws over opaque pixels.
- [T3 engine] Debug primitives use a provisional pixel rule for Phase 4 to confirm against golden frames. `strokeRect(x, y, w, h)` outlines the pixels of `[x, x+w] × [y, y+h]` inclusive, so Go's `StrokeRect(x, y, w-1, h-1)` gives a `w × h` box. Edges don't overlap, so each corner blends once. `line` is Bresenham between the snapped endpoints. `fillCircle` fills the pixels whose centres fall inside the circle. None of them antialias.
- [T3 engine] `fillRect`, `fillPremul` and `clearRect` cover the pixels whose centres fall inside the rect: edges at `snap(x)` and `snap(x + w)`, which is the same rule as D13. Integer rects are unaffected.
- [T3 engine] Keyboard: when `KeyboardEvent.code` is empty, the code is derived from `key` (`"ArrowRight"`, `" "` → `Space`, `"d"` → `KeyD`, `"Shift"` → `ShiftLeft`). agent-browser's `keydown`/`press` send synthetic CDP events with `code: ""`, so without this fallback T10 could not move anything. Real keyboards always set `code`.
- [T3 engine] Loop: a frame that arrives up to 1 ms early still counts as a full tick, and the deficit carries over as negative accumulated time. This way 60 Hz rAF jitter gives exactly 1 update per frame instead of an occasional 0-then-2. The long-run rate stays 60 TPS, and the 5-update cap still discards any backlog (D2).
- [T3 engine] Parity differ: numbers compare with `===`, so `-0` equals `0`. A key whose value is `undefined` counts as absent, as it would in JSON. Everything else is exact, floats included.

