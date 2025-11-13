//go:build js

package internal

import (
	"syscall/js"
)

var LevelArcade = Level{
	Width:  160,
	Height: 144,
}

var LevelHive = Level{
	Width:  224,
	Height: 288,
}

type State struct {
	Window   js.Value
	Document js.Value
	Parent   js.Value
	Canvas   js.Value
	Ctx      js.Value

	Width  float64
	Height float64
	Scale  int

	Previous int
	Lag      int

	Keys               map[string]bool
	MovementKeyPressed bool

	Level       Level
	LevelSprite *Sprite

	Gamer *Entity
	Bear  *Entity
	Bees  []*Entity

	Title bool
}

type Level struct {
	Name   string
	Width  int
	Height int
}

func NewState(window js.Value, document js.Value, parent js.Value, canvas js.Value) *State {
	return &State{
		Window:      window,
		Document:    document,
		Parent:      parent,
		Canvas:      canvas,
		Keys:        make(map[string]bool),
		Level:       LevelArcade,
		LevelSprite: SpriteArcade,
		Gamer:       EntityGamer,
		Bear:        EntityBear,
		Bees:        EntityBees,
	}
}
