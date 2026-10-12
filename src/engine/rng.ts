// Shared seedable PRNG (§3.3): mulberry32. The Go harness replicates it in
// `internal/rng` with uint32 arithmetic; `test/fixtures/rng.json` locks both
// together. Every random call in the port goes through this module, in the
// same order as Go's `math/rand` calls.

let a = 0;

/** Normal play seeds from `Date.now()`; parity replays use the script seed. */
export function seed(s: number): void {
  a = s >>> 0;
}

/** Current uint32 state; exposed as `rng` in every scene snapshot (§4.3). */
export function state(): number {
  return a;
}

/** Uniform in [0, 1). Replaces Go `rand.Float64()`. */
export function float(): number {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Uniform integer in [0, n). Replaces Go `rand.Intn(n)`. */
export function intn(n: number): number {
  return Math.floor(float() * n);
}
