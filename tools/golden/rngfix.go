package main

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/danmcfan/arcade/internal/rng"
)

// rngFixture is test/fixtures/rng.json (format in test/fixtures/README.md).
type rngFixture struct {
	Algorithm string        `json:"algorithm"`
	Count     int           `json:"count"`
	Sequences []rngSequence `json:"sequences"`
}

type rngSequence struct {
	Seed  uint32    `json:"seed"`
	Float []float64 `json:"float"`
	State []uint32  `json:"state"`
	// Intn: a fresh run from the same seed calling rng.Intn(n) for n = 1, 2,
	// 3, ... 1000 (one call each, so n = i+1 for entry i).
	Intn []int `json:"intn"`
}

func writeRNG(fixtures string) error {
	const count = 1000
	fix := rngFixture{Algorithm: "mulberry32", Count: count}
	for _, seed := range []uint32{1, 42} {
		seq := rngSequence{Seed: seed}
		rng.Seed(seed)
		for range count {
			seq.Float = append(seq.Float, rng.Float64())
			seq.State = append(seq.State, rng.State())
		}
		rng.Seed(seed)
		for i := range count {
			seq.Intn = append(seq.Intn, rng.Intn(i+1))
		}
		fix.Sequences = append(fix.Sequences, seq)
	}
	data, err := json.Marshal(fix)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(fixtures, "rng.json"), append(data, '\n'), 0o644)
}
