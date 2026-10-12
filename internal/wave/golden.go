package wave

import "github.com/danmcfan/arcade/internal/snaphash"

// Golden-harness snapshot (read-only). JSON keys follow WaveSnapshot in
// src/game/snapshot.ts; the harness adds `tick` and `rng`.

type CellSnapshot struct {
	Possible  []int `json:"possible"`
	Collapsed bool  `json:"collapsed"`
}

type Snapshot struct {
	Collapsed int              `json:"collapsed"`
	Width     int              `json:"width"`
	CellsHash uint32           `json:"cellsHash"`
	Cells     [][]CellSnapshot `json:"cells,omitempty"`
}

func (g *Game) Snapshot(full bool) Snapshot {
	snap := Snapshot{
		Collapsed: g.grid.CollapsedCount,
		Width:     g.grid.Width,
	}
	var vals []uint32
	for x := range g.grid.Cells {
		for y := range g.grid.Cells[x] {
			cell := &g.grid.Cells[x][y]
			if !cell.Collapsed || len(cell.Possible) != 1 {
				continue
			}
			vals = append(vals, uint32(x), uint32(y), uint32(cell.Possible[0]))
		}
	}
	snap.CellsHash = snaphash.FNV1a32(vals)
	if full {
		snap.Cells = make([][]CellSnapshot, len(g.grid.Cells))
		for x := range g.grid.Cells {
			snap.Cells[x] = make([]CellSnapshot, len(g.grid.Cells[x]))
			for y := range g.grid.Cells[x] {
				cell := &g.grid.Cells[x][y]
				snap.Cells[x][y] = CellSnapshot{
					Possible:  append(make([]int, 0, len(cell.Possible)), cell.Possible...),
					Collapsed: cell.Collapsed,
				}
			}
		}
	}
	return snap
}

// LogicalSize is Layout without the outside size (harness frames mode).
func (g *Game) LogicalSize() (int, int) {
	return g.Layout(0, 0)
}
