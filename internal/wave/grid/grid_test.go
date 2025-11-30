package grid

import "testing"

func TestStep(t *testing.T) {
	g := NewGrid(16, 123)

	if !g.empty() {
		t.Errorf("grid should be empty")
	}

	g.Step(1)

	if g.empty() {
		t.Errorf("grid should not be empty")
	}

	if g.CollapsedCount != 1 {
		t.Errorf("collapsedCount = %d, want %d", g.CollapsedCount, 1)
	}

	if len(g.Uncollapsed) != g.Size*g.Size-1 {
		t.Errorf("uncollapsed = %d, want %d", len(g.Uncollapsed), g.Size*g.Size-1)
	}

	if len(g.UncollapsedIdx) != g.Size*g.Size-1 {
		t.Errorf("uncollapsedIdx = %d, want %d", len(g.UncollapsedIdx), g.Size*g.Size-1)
	}
}

func BenchmarkAssignLowestEntropy(b *testing.B) {
	g := NewGrid(16, 123)
	for b.Loop() {
		g.Step(2)
		g.Reset()
	}
}

func BenchmarkStep(b *testing.B) {
	g := NewGrid(16, 123)
	for b.Loop() {
		g.Step(100)
	}
}

func BenchmarkNewGame(b *testing.B) {
	for b.Loop() {
		NewGrid(16, 123)
	}
}

func BenchmarkReset(b *testing.B) {
	g := NewGrid(16, 123)
	for b.Loop() {
		g.Reset()
	}
}
