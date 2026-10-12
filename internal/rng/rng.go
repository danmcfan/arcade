// Package rng is the shared seedable PRNG (mulberry32) that replaces
// math/rand in hive and wave so the TypeScript port (src/engine/rng.ts) can
// reproduce every random draw bit for bit. test/fixtures/rng.json locks the
// two implementations together.
package rng

import (
	"fmt"
	"time"
)

var a uint32

func init() {
	// Normal play: seed from the clock, like math/rand's auto-seeding and the
	// TS port's Date.now(). The golden harness reseeds explicitly.
	a = uint32(time.Now().UnixNano())
}

// Seed sets the generator state.
func Seed(s uint32) {
	a = s
}

// State returns the current uint32 state (exposed as `rng` in snapshots).
func State() uint32 {
	return a
}

// Float64 returns a uniform value in [0, 1). Replaces rand.Float64.
func Float64() float64 {
	a += 0x6D2B79F5
	t := a
	t = (t ^ (t >> 15)) * (t | 1)
	t ^= t + (t^(t>>7))*(t|61)
	return float64(t^(t>>14)) / 4294967296
}

// Intn returns a uniform integer in [0, n). Replaces rand.Intn and, like it,
// panics if n <= 0.
func Intn(n int) int {
	if n <= 0 {
		panic(fmt.Sprintf("invalid argument to Intn: %d", n))
	}
	return int(Float64() * float64(n))
}
