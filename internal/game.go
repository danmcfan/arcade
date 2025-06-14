//go:build js

package internal

import (
	"syscall/js"
)

type Empty struct{}

type Set map[string]Empty

type Direction int

const (
	DirectionUp Direction = iota
	DirectionDown
	DirectionLeft
	DirectionRight
)

type Game struct {
	Ctx                  js.Value
	Sprites              []*Sprite
	Keys                 Set
	Lag, Previous, Speed float64
	Direction            Direction
	Moving               bool
	X, Y, Frame          float64
	Width, Height, Scale int
}

type GameFunc func(g *Game)

func (s Set) Add(key string) {
	s[key] = Empty{}
}

func (s Set) Delete(key string) {
	delete(s, key)
}

func (s Set) Contains(key string) bool {
	_, ok := s[key]
	return ok
}

func NewGame(ctx js.Value, sprites []*Sprite) *Game {
	return &Game{
		Ctx:       ctx,
		Sprites:   sprites,
		Keys:      make(Set),
		Speed:     1.0,
		Direction: DirectionDown,
	}
}

func (g *Game) Update() {
	g.Frame += 0.15 * g.Speed
	g.MovePlayer()
}

func (g *Game) MovePlayer() {
	delta := 1.5 * g.Speed

	isUpPressed := g.Keys.Contains("KeyW") || g.Keys.Contains("ArrowUp")
	isDownPressed := g.Keys.Contains("KeyS") || g.Keys.Contains("ArrowDown")
	isLeftPressed := g.Keys.Contains("KeyA") || g.Keys.Contains("ArrowLeft")
	isRightPressed := g.Keys.Contains("KeyD") || g.Keys.Contains("ArrowRight")

	if isUpPressed {
		g.Y = max(g.Y-delta, 0)
		g.Direction = DirectionUp
		g.Moving = true
		return
	}
	if isDownPressed {
		limit := float64((g.Height - (32 * g.Scale)) / g.Scale)
		g.Y = min(g.Y+delta, limit)
		g.Direction = DirectionDown
		g.Moving = true
		return
	}
	if isLeftPressed {
		g.X = max(g.X-delta, 0)
		g.Direction = DirectionLeft
		g.Moving = true
		return
	}
	if isRightPressed {
		limit := float64((g.Width - (32 * g.Scale)) / g.Scale)
		g.X = min(g.X+delta, limit)
		g.Direction = DirectionRight
		g.Moving = true
		return
	}

	g.Moving = false
}

func (g *Game) Draw() {
	ClearScreen(g.Ctx, g.Width, g.Height)
	sprite := g.Sprites[9]

	row := 0
	switch g.Direction {
	case DirectionUp:
		row = 2
	case DirectionDown:
		row = 0
	case DirectionLeft:
		row = 1
	case DirectionRight:
		row = 1
	}

	if g.Moving {
		row += 3
	}

	flip := false
	if g.Direction == DirectionLeft {
		flip = true
	}

	sb := Box{
		X: (int(g.Frame) % 6) * sprite.Width,
		Y: row * sprite.Height,
		W: sprite.Width,
		H: sprite.Height,
	}
	db := Box{
		X: int(g.X) * g.Scale,
		Y: int(g.Y) * g.Scale,
		W: sprite.Width * g.Scale,
		H: sprite.Height * g.Scale,
	}
	DrawImage(g.Ctx, sprite.Image, sb, db, flip)
}
