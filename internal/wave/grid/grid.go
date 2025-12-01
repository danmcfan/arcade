package grid

import (
	"fmt"
	"math/rand"
	"slices"
)

var constraints = [4][4][]int{
	{{1, 2, 3}, {1, 2, 3}, {1, 2, 3}, {1, 2, 3}},
	{{1, 2}, {1, 2}, {1, 2}, {1, 2}},
	{{1, 2, 3}, {1, 2, 3}, {1, 2, 3}, {1, 2, 3}},
	{{2, 3}, {2, 3}, {2, 3}, {2, 3}},
}

type Cell struct {
	Possible  []int
	Collapsed bool
}

type Grid struct {
	Width          int
	Height         int
	Cells          [][]Cell
	CollapsedCount int
	Patterns       []int
	Constraints    [4][4][]int

	EntropyBuckets map[int][]struct{ x, y int }
	Entropy        [][]int
	BucketIndex    [][]int
}

func New(width, height int) *Grid {
	grid := &Grid{
		Width:       width,
		Height:      height,
		Patterns:    []int{1, 2, 3},
		Constraints: constraints,
	}

	grid.Cells = make([][]Cell, width)
	for x := range width {
		grid.Cells[x] = make([]Cell, height)
	}

	grid.Entropy = make([][]int, grid.Width)
	for x := range grid.Width {
		grid.Entropy[x] = make([]int, grid.Height)
	}

	grid.BucketIndex = make([][]int, grid.Width)
	for x := range grid.Width {
		grid.BucketIndex[x] = make([]int, grid.Height)
	}

	grid.EntropyBuckets = make(map[int][]struct{ x, y int })

	grid.Reset()

	return grid
}

func (g *Grid) Reset() {
	for e := range len(g.Patterns) + 1 {
		g.EntropyBuckets[e] = make([]struct{ x, y int }, 0, g.Width*g.Height)
	}

	for x := range g.Width {
		for y := range g.Height {
			g.Cells[x][y].Possible = slices.Clone(g.Patterns)
			g.Cells[x][y].Collapsed = false

			g.BucketIndex[x][y] = len(g.EntropyBuckets[len(g.Patterns)])
			g.Entropy[x][y] = len(g.Patterns)
			g.EntropyBuckets[len(g.Patterns)] = append(g.EntropyBuckets[len(g.Patterns)], struct{ x, y int }{x, y})
		}
	}

	g.CollapsedCount = 0
}

func (g *Grid) Step() {
	if g.CollapsedCount == g.Width*g.Height {
		return
	}

	var x, y int
	if g.CollapsedCount == 0 {
		x, y = rand.Intn(g.Width), rand.Intn(g.Height)
	} else {
		x, y = g.Next()
	}

	g.Collapse(x, y)
	g.Propogate(x, y)
}

func (g *Grid) Next() (int, int) {
	for e := 1; e <= len(g.Patterns); e++ {
		if cells := g.EntropyBuckets[e]; len(cells) > 0 {
			sel := cells[rand.Intn(len(cells))]
			return sel.x, sel.y
		}
	}
	panic("no next cell found")
}

func (g *Grid) Collapse(x, y int) {
	cell := &g.Cells[x][y]
	g.UpdateEntropy(x, y, len(cell.Possible), 0)
	selection := cell.Possible[rand.Intn(len(cell.Possible))]
	cell.Possible = []int{selection}
	cell.Collapsed = true
	g.CollapsedCount++
}

func (g *Grid) Propogate(x, y int) {
	cell := &g.Cells[x][y]

	if len(cell.Possible) != 1 {
		panic(fmt.Sprintf("cell (%d, %d) has %d possible values", x, y, len(cell.Possible)))
	}
	value := cell.Possible[0]

	for direction, neighbor := range g.Neighbors(x, y) {
		if !g.InBounds(neighbor.x, neighbor.y) {
			continue
		}

		if g.Cells[neighbor.x][neighbor.y].Collapsed {
			continue
		}

		nDirection := -1
		switch direction {
		case 0:
			nDirection = 2
		case 1:
			nDirection = 3
		case 2:
			nDirection = 0
		case 3:
			nDirection = 1
		}

		nCell := &g.Cells[neighbor.x][neighbor.y]
		newPossible := g.Constraints[value][nDirection]

		if len(newPossible) < len(nCell.Possible) {
			g.UpdateEntropy(neighbor.x, neighbor.y, len(nCell.Possible), len(newPossible))
			nCell.Possible = newPossible
		}
	}
}

func (g *Grid) UpdateEntropy(x, y int, oldEntropy, newEntropy int) {
	oldBucket := g.EntropyBuckets[oldEntropy]
	idx := g.BucketIndex[x][y]

	lastIdx := len(oldBucket) - 1
	if idx != lastIdx {
		lastCell := oldBucket[lastIdx]
		oldBucket[idx] = lastCell
		g.BucketIndex[lastCell.x][lastCell.y] = idx
	}
	g.EntropyBuckets[oldEntropy] = oldBucket[:lastIdx]

	newBucket := g.EntropyBuckets[newEntropy]
	g.BucketIndex[x][y] = len(newBucket)
	g.EntropyBuckets[newEntropy] = append(newBucket, struct{ x, y int }{x, y})
	g.Entropy[x][y] = newEntropy
}

func (g *Grid) Neighbors(x, y int) [4]struct{ x, y int } {
	return [4]struct{ x, y int }{{x, y - 1}, {x + 1, y}, {x, y + 1}, {x - 1, y}}
}

func (g *Grid) InBounds(x, y int) bool {
	return x >= 0 && x < g.Width && y >= 0 && y < g.Height
}
