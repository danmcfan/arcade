package grid

import (
	"math/rand"
	"slices"
)

type TileColor int

const (
	TileColorEmpty TileColor = -1
)

type Grid struct {
	Size           int
	Seed           int64
	Random         *rand.Rand
	Grid           [][]TileColor
	Uncollapsed    []struct{ x, y int }
	UncollapsedIdx map[[2]int]int
	CollapsedCount int
	Patterns       Patterns
}

func NewGrid(size int, seed int64) *Grid {
	grid := make([][]TileColor, size)
	for x := range size {
		grid[x] = make([]TileColor, size)
		for y := range size {
			grid[x][y] = TileColorEmpty
		}
	}

	uncollapsed, uncollapsedIdx := NewUncollapsed(size)

	return &Grid{
		Random:         rand.New(rand.NewSource(seed)),
		Size:           size,
		Grid:           grid,
		Uncollapsed:    uncollapsed,
		UncollapsedIdx: uncollapsedIdx,
		Patterns:       NewPatterns(),
	}
}

func NewUncollapsed(size int) ([]struct{ x, y int }, map[[2]int]int) {
	uncollapsed := make([]struct{ x, y int }, 0, size*size)
	uncollapsedIdx := make(map[[2]int]int, size*size)

	for x := range size {
		for y := range size {
			pos := struct{ x, y int }{x, y}
			uncollapsedIdx[[2]int{x, y}] = len(uncollapsed)
			uncollapsed = append(uncollapsed, pos)
		}
	}

	return uncollapsed, uncollapsedIdx
}

func (g *Grid) Step(count int) {
	for range count {
		if g.filled() {
			return
		}

		if g.empty() {
			x, y := g.Random.Intn(g.Size), g.Random.Intn(g.Size)
			color := TileColor(g.Random.Intn(3))
			g.Grid[x][y] = color

			g.CollapsedCount++
			g.removeFromUncollapsed(x, y)
			return
		}

		g.assignLowestEntropy()
	}
}

func (g *Grid) assignLowestEntropy() {
	lx, ly := -1, -1
	lchoices := map[int]bool{0: true, 1: true, 2: true, 3: true}

	for _, t := range g.Uncollapsed {
		choices := make(map[int]bool)
		for i, neighbor := range neighbors(t.x, t.y) {
			if neighbor.x < 0 || neighbor.x >= g.Size || neighbor.y < 0 || neighbor.y >= g.Size {
				continue
			}

			if g.Grid[neighbor.x][neighbor.y] == TileColorEmpty {
				continue
			}

			j := -1
			switch i {
			case 0:
				j = 2
			case 1:
				j = 3
			case 2:
				j = 0
			case 3:
				j = 1
			}

			ncs := g.Patterns[g.Grid[neighbor.x][neighbor.y]].Choices[j]
			for _, c := range ncs {
				choices[c] = true
			}
		}

		if len(choices) < len(lchoices) && len(choices) > 0 {
			lchoices = choices
			lx, ly = t.x, t.y
		}
	}

	choicesList := make([]int, 0, len(lchoices))
	for choice := range lchoices {
		choicesList = append(choicesList, choice)
	}
	slices.Sort(choicesList)

	g.Grid[lx][ly] = TileColor(choicesList[g.Random.Intn(len(choicesList))])

	g.CollapsedCount++
	g.removeFromUncollapsed(lx, ly)
}

func neighbors(x, y int) [4]struct{ x, y int } {
	return [4]struct{ x, y int }{{x, y - 1}, {x + 1, y}, {x, y + 1}, {x - 1, y}}
}

func (g *Grid) empty() bool {
	return g.CollapsedCount == 0
}

func (g *Grid) filled() bool {
	return g.CollapsedCount == g.Size*g.Size
}

func (g *Grid) removeFromUncollapsed(x, y int) {
	key := [2]int{x, y}
	idx, exists := g.UncollapsedIdx[key]
	if !exists {
		return
	}

	last := len(g.Uncollapsed) - 1
	if idx != last {
		g.Uncollapsed[idx] = g.Uncollapsed[last]
		g.UncollapsedIdx[[2]int{g.Uncollapsed[idx].x, g.Uncollapsed[idx].y}] = idx
	}

	g.Uncollapsed = g.Uncollapsed[:last]
	delete(g.UncollapsedIdx, key)
}

func (g *Grid) Reset() {
	g.Random = rand.New(rand.NewSource(g.Seed))
	for x := range g.Size {
		for y := range g.Size {
			g.Grid[x][y] = TileColorEmpty
		}
	}

	g.CollapsedCount = 0
	g.Uncollapsed, g.UncollapsedIdx = NewUncollapsed(g.Size)
}
