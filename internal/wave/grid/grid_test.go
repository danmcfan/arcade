package grid

import (
	"testing"
)

func BenchmarkGrid512(b *testing.B) {
	benchmarkGrid(b, 512)
}

func BenchmarkGrid1024(b *testing.B) {
	benchmarkGrid(b, 1024)
}

func BenchmarkGrid2048(b *testing.B) {
	benchmarkGrid(b, 2048)
}

func BenchmarkGrid4096(b *testing.B) {
	benchmarkGrid(b, 4096)
}

func benchmarkGrid(b *testing.B, size int) {
	b.Logf("size: %d", size)
	for b.Loop() {
		grid := New(size, size)
		for range grid.Width * grid.Height {
			grid.Step()
		}
	}
	b.Logf("time per loop: %.2fs", float64(b.Elapsed().Seconds())/float64(b.N))
}
