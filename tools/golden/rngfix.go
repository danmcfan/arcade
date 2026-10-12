package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"

	"github.com/danmcfan/arcade/internal/rng"
)

// rngFixture is test/fixtures/rng.json (format in test/fixtures/README.md).
// `seeds` is the shape src/engine/rng.test.ts reads: seed -> float() outputs.
type rngFixture struct {
	Algorithm string               `json:"algorithm"`
	Count     int                  `json:"count"`
	Seeds     map[string][]float64 `json:"seeds"`
	// State: seed -> rng.state() right after each float() call above.
	State map[string][]uint32 `json:"state"`
	// Intn: seed -> a fresh run from that seed calling rng.Intn(i+1) for
	// i = 0..count-1 (one call each).
	Intn map[string][]int `json:"intn"`
}

func writeRNG(fixtures string) error {
	const count = 1000
	fix := rngFixture{
		Algorithm: "mulberry32",
		Count:     count,
		Seeds:     map[string][]float64{},
		State:     map[string][]uint32{},
		Intn:      map[string][]int{},
	}
	for _, seed := range []uint32{1, 42} {
		key := strconv.FormatUint(uint64(seed), 10)
		rng.Seed(seed)
		for range count {
			fix.Seeds[key] = append(fix.Seeds[key], rng.Float64())
			fix.State[key] = append(fix.State[key], rng.State())
		}
		rng.Seed(seed)
		for i := range count {
			fix.Intn[key] = append(fix.Intn[key], rng.Intn(i+1))
		}
	}
	data, err := json.Marshal(fix)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(fixtures, "rng.json"), append(data, '\n'), 0o644)
}
