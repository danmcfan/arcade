package simple

import "testing"

func TestGrid(t *testing.T) {
	g := NewGrid(16)

	if g.Get(0, 0) != 0 {
		t.Errorf("grid should be empty")
	}

	g.Set(0, 0, 1)

	if g.Get(0, 0) != 1 {
		t.Errorf("grid should be 1")
	}

	g.Reset()

	if g.Get(0, 0) != 0 {
		t.Errorf("grid should be empty")
	}
}

func BenchmarkReset(b *testing.B) {
	g := NewGrid(16)
	for b.Loop() {
		g.Reset()
	}
}

func BenchmarkGet(b *testing.B) {
	g := NewGrid(16)
	for b.Loop() {
		g.Get(0, 0)
	}
}

func BenchmarkSet(b *testing.B) {
	g := NewGrid(16)
	for b.Loop() {
		g.Set(0, 0, 1)
	}
}
