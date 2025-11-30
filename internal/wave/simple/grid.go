package simple

import (
	"math/rand"
)

var patterns = [4][4][]int{
	{{}, {}, {}, {}},
	{{1}, {1, 2}, {1, 2}, {1, 2, 3}},
	{{1}, {1, 2, 3}, {1, 2, 3}, {3}},
	{{3}, {2, 3}, {2, 3}, {1, 2, 3}},
}

type Grid struct {
	values []int
	size   int
	count  int
	queue  []struct{ x, y int }
}

func NewGrid(size int) *Grid {
	return &Grid{
		values: make([]int, size*size),
		size:   size,
	}
}

func (g *Grid) Get(x, y int) int {
	return g.values[x*g.size+y]
}

func (g *Grid) Set(x, y int, value int) {
	g.values[x*g.size+y] = value
}

func (g *Grid) Reset() {
	for i := range g.values {
		g.values[i] = 0
	}
	g.count = 0
	g.queue = make([]struct{ x, y int }, 0)
}

func (g *Grid) Step() {
	if g.count == g.size*g.size {
		return
	}

	if g.count == 0 {
		x := rand.Intn(int(g.size))
		y := rand.Intn(int(g.size))
		g.Set(int(x), int(y), rand.Intn(3)+1)
		g.count++

		for _, neighbor := range g.Neighbors(int(x), int(y)) {
			if !g.InBounds(neighbor.x, neighbor.y) {
				continue
			}

			if g.Get(neighbor.x, neighbor.y) != 0 {
				continue
			}

			g.queue = append(g.queue, neighbor)
		}

		return
	}

	next := g.queue[0]
	g.queue = g.queue[1:]

	for g.Get(next.x, next.y) != 0 {
		next = g.queue[0]
		g.queue = g.queue[1:]
	}

	choices := [4]bool{false, false, false, false}
	for direction, neighbor := range g.Neighbors(next.x, next.y) {
		if !g.InBounds(neighbor.x, neighbor.y) {
			continue
		}

		ncolor := g.Get(neighbor.x, neighbor.y)
		if ncolor == 0 {
			g.queue = append(g.queue, neighbor)
			continue
		}

		ndirection := -1
		switch direction {
		case 0:
			ndirection = 2
		case 1:
			ndirection = 3
		case 2:
			ndirection = 0
		case 3:
			ndirection = 1
		}

		nchoice := patterns[ncolor][ndirection]
		for _, choice := range nchoice {
			choices[choice] = true
		}
	}

	colors := make([]int, 0)
	for color, ok := range choices {
		if !ok {
			continue
		}
		colors = append(colors, int(color))
	}

	if len(colors) == 0 {
		panic("no colors")
	}

	choice := colors[rand.Intn(len(colors))]
	g.Set(next.x, next.y, choice)
	g.count++
}

func (g *Grid) Neighbors(x, y int) [4]struct{ x, y int } {
	return [4]struct{ x, y int }{{x, y - 1}, {x + 1, y}, {x, y + 1}, {x - 1, y}}
}

func (g *Grid) InBounds(x, y int) bool {
	return x >= 0 && x < g.size && y >= 0 && y < g.size
}
