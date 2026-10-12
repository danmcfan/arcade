package rng

import "testing"

// Reference values: the published mulberry32 sequence (seed 1 starts
// 0.6270739405881613), cross-checked against src/engine/rng.ts.
func TestFloat64MatchesMulberry32(t *testing.T) {
	cases := []struct {
		seed  uint32
		want  []float64
		state []uint32
	}{
		{1, []float64{0.6270739405881613, 0.002735721180215478, 0.5274470399599522}, []uint32{1831565814, 3663131627, 1199730144}},
		{42, []float64{0.6011037519201636, 0.44829055899754167, 0.8524657934904099}, []uint32{1831565855, 3663131668, 1199730185}},
	}
	for _, c := range cases {
		Seed(c.seed)
		if State() != c.seed {
			t.Fatalf("seed %d: State() = %d", c.seed, State())
		}
		for i := range c.want {
			got := Float64()
			if got != c.want[i] {
				t.Errorf("seed %d #%d: Float64() = %v, want %v", c.seed, i, got, c.want[i])
			}
			if State() != c.state[i] {
				t.Errorf("seed %d #%d: State() = %d, want %d", c.seed, i, State(), c.state[i])
			}
		}
	}
}

func TestIntnFloorsTheScaledFloat(t *testing.T) {
	Seed(7)
	if got := Intn(10); got != 0 {
		t.Errorf("Intn(10) = %d, want 0", got)
	}
	if got := Intn(1000); got != 61 {
		t.Errorf("Intn(1000) = %d, want 61", got)
	}
	if State() != 3663131633 {
		t.Errorf("State() = %d, want 3663131633", State())
	}
}

func TestStateWrapsAtUint32(t *testing.T) {
	Seed(0xffffffff)
	Float64()
	if State() != 0x6d2b79f4 {
		t.Errorf("State() = %#x, want 0x6d2b79f4", State())
	}
}

func TestIntnPanicsOnNonPositive(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Error("Intn(0) did not panic (math/rand.Intn does)")
		}
	}()
	Intn(0)
}
