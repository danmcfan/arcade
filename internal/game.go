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
	Ctx               js.Value
	Sprites           []*Sprite
	Keys              Set
	TimestampDelta    float64
	TimestampPrevious float64
	Direction         Direction
	Moving            bool
	X, Y, Frame       float64
	Width, Height     int
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
		Direction: DirectionDown,
	}
}

func UpdateGame(g *Game) {
	MovePlayer(g)
	g.Frame += g.TimestampDelta / 100.0
}

func MovePlayer(g *Game) {
	delta := g.TimestampDelta / 10.0

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
		g.Y = min(g.Y+delta, float64(g.Height/4-32))
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
		g.X = min(g.X+delta, float64(g.Width/4-32))
		g.Direction = DirectionRight
		g.Moving = true
		return
	}

	g.Moving = false
}

func DrawGame(g *Game) {
	ClearScreen(g.Ctx, g.Width, g.Height)
	sprite := g.Sprites[9]
	scale := 4

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
		X: int(g.X) * scale,
		Y: int(g.Y) * scale,
		W: sprite.Width * scale,
		H: sprite.Height * scale,
	}
	DrawImage(g.Ctx, sprite.Image, sb, db, flip)
}
