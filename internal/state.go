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
	Food  []*Entity

	Title       bool
	BlueFrames  int
	StartFrames int

	Lives     int
	Score     int
	HighScore int
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
		BlueFrames:  FRAMES_PER_SECOND * 10,
	}
}

func (s *State) SwitchArcade() {
	s.Title = true
	s.Level = LevelArcade
	s.LevelSprite = SpriteArcade
	HandleResize(s)
}

func (s *State) SwitchHive() {
	s.Title = true
	s.Level = LevelHive
	s.LevelSprite = SpriteHive

	s.Lives = 3
	s.Score = 0

	s.Food = NewFood()
	s.Reset()

	HandleResize(s)
}

func (s *State) Reset() {
	s.StartFrames = FRAMES_PER_SECOND * 2
	s.Bear = EntityBear()
	s.Bees = EntityBees()
}
