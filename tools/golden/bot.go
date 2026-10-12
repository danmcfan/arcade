package main

import (
	"math"
	"math/rand/v2"

	"github.com/danmcfan/arcade/internal/hive"
	"github.com/danmcfan/arcade/internal/input"
	"github.com/danmcfan/arcade/internal/rng"
)

// The hive look-ahead bot used to author the scripted hive routes
// (hive-clear, hive-modes). It only chooses inputs: every candidate is
// simulated on hive.Clone() with the shared RNG state saved and restored, so
// the authored script replays identically without the bot.

type botMode int

const (
	botGreedy  botMode = iota // eat food and scared bees, avoid death
	botSurvive                // avoid death, never eat the last few items
)

const (
	mazeW     = 28
	mazeH     = 36
	tunnelRow = 17
)

type tileXY struct{ x, y int }

// maze is the walkable tile set: every tile on a straight run between two
// junctions (all hive movement is along those runs).
type maze struct {
	walk [mazeH][mazeW]bool
}

func buildMaze(corners []hive.HarnessCorner) *maze {
	m := &maze{}
	isCorner := map[tileXY]bool{}
	for _, c := range corners {
		isCorner[pointTile(c.X, c.Y)] = true
	}
	for _, c := range corners {
		start := pointTile(c.X, c.Y)
		m.walk[start.y][start.x] = true
		for _, d := range c.Directions {
			dx, dy := dirDelta(d)
			t := start
			for {
				t = tileXY{t.x + dx, t.y + dy}
				if t.x < 0 || t.x >= mazeW || t.y < 0 || t.y >= mazeH {
					break
				}
				m.walk[t.y][t.x] = true
				if isCorner[t] {
					break
				}
			}
		}
	}
	return m
}

func pointTile(x, y float64) tileXY {
	t := tileXY{int(x / 8), int(y / 8)}
	if t.x >= mazeW {
		t.x = 0
	}
	if t.x < 0 {
		t.x = mazeW - 1
	}
	return t
}

func dirDelta(d input.Direction) (int, int) {
	switch d {
	case input.DirectionUp:
		return 0, -1
	case input.DirectionDown:
		return 0, 1
	case input.DirectionLeft:
		return -1, 0
	case input.DirectionRight:
		return 1, 0
	}
	return 0, 0
}

// dist is the BFS distance in tiles from `from` to the nearest target, or
// a large number if none is reachable.
func (m *maze) dist(from tileXY, targets map[tileXY]bool) int {
	if len(targets) == 0 {
		return 0
	}
	var seen [mazeH][mazeW]bool
	queue := []tileXY{from}
	seen[from.y][from.x] = true
	for d := 0; len(queue) > 0; d++ {
		next := queue[:0:0]
		for _, t := range queue {
			if targets[t] {
				return d
			}
			for _, n := range [4]tileXY{{t.x, t.y - 1}, {t.x, t.y + 1}, {t.x - 1, t.y}, {t.x + 1, t.y}} {
				if n.y == tunnelRow {
					n.x = (n.x + mazeW) % mazeW
				}
				if n.x < 0 || n.x >= mazeW || n.y < 0 || n.y >= mazeH || seen[n.y][n.x] || !m.walk[n.y][n.x] {
					continue
				}
				seen[n.y][n.x] = true
				next = append(next, n)
			}
		}
		queue = next
	}
	return 1000
}

var botCandidates = []InputJS{{}, {Up: true}, {Down: true}, {Left: true}, {Right: true}}

func dead(h *hive.HiveSoftware) bool {
	st := h.Snapshot().State
	return st == hive.StateIDDeathWait || st == hive.StateIDFinalDeathWait || st == hive.StateIDGameOver
}

// simulate runs ticks of input on a clone; reports whether the player died.
func simulate(h *hive.HiveSoftware, in input.Input, ticks int) (*hive.HiveSoftware, bool) {
	c := h.Clone()
	for range ticks {
		if err := c.Update(in); err != nil {
			panic(err)
		}
		if dead(c) {
			return c, true
		}
	}
	return c, false
}

// planHold picks the input to hold for the next `hold` ticks.
func planHold(h *hive.HiveSoftware, m *maze, mode botMode, hold int, rnd *rand.Rand) InputJS {
	saved := rng.State()
	defer rng.Seed(saved)

	before := h.Snapshot()
	order := rnd.Perm(len(botCandidates))
	best, bestVal := botCandidates[order[0]], math.Inf(-1)
	for _, ci := range order {
		cand := botCandidates[ci]
		rng.Seed(saved)
		c1, died := simulate(h, cand.toInput(), hold)
		val := 0.0
		if died {
			val = -1e9
		} else {
			// Second level: can we still escape afterwards?
			s1 := rng.State()
			survivors := 0
			for _, c2 := range botCandidates {
				rng.Seed(s1)
				if _, d2 := simulate(c1, c2.toInput(), 45); !d2 {
					survivors++
				}
			}
			if survivors == 0 {
				val = -1e6
			}
			val += float64(survivors) * 5
			after := c1.Snapshot()
			items := map[tileXY]bool{}
			for _, p := range c1.HarnessItems() {
				items[pointTile(p.X, p.Y)] = true
			}
			player := pointTile(after.Player.X, after.Player.Y)
			switch mode {
			case botGreedy:
				val += float64(after.Score - before.Score)
				val -= 3 * float64(m.dist(player, items))
				pos, blue := c1.HarnessEnemies()
				scared := map[tileXY]bool{}
				for i := range pos {
					if blue[i] && after.Enemies[i].Blue > 150 {
						scared[pointTile(pos[i].X, pos[i].Y)] = true
					}
				}
				if len(scared) > 0 {
					val -= 6 * float64(m.dist(player, scared))
				}
			case botSurvive:
				if after.Items < 6 && after.Items < before.Items {
					val -= 1e5
				}
				// Keep away from bees that can hurt.
				pos, blue := c1.HarnessEnemies()
				for i := range pos {
					if blue[i] {
						continue
					}
					d := math.Hypot(pos[i].X-after.Player.X, pos[i].Y-after.Player.Y)
					val += math.Min(d, 80) / 8
				}
			}
		}
		if val > bestVal {
			best, bestVal = cand, val
		}
	}
	return best
}
