//go:build js

package internal

import (
	"slices"
)

type keyMapping struct {
	key     string
	command Command
}

type Command interface {
	Execute(s *State)
}

type moveCommand struct {
	direction Direction
}

func (c *moveCommand) Execute(s *State) {
	switch s.Game {
	case GameArcade:
		v := s.World.Vectors[GamerID]
		v.SetDirection(c.direction)
		s.MovementKeyPressed = true
		s.World.Vectors[GamerID] = v
	case GameHive:
		e := s.Bear

		corner := findCorner(e)
		if corner == nil {
			var validDirections []Direction
			switch e.Direction.Axis() {
			case AxisVertical:
				validDirections = []Direction{DirectionUp, DirectionDown}
			case AxisHorizontal:
				validDirections = []Direction{DirectionLeft, DirectionRight}
			}

			if !slices.Contains(validDirections, c.direction) {
				return
			}

			e.Direction = c.direction
			return
		}

		if !slices.Contains(corner.Directions, c.direction) {
			return
		}

		if e.Direction.Axis() != c.direction.Axis() {
			e.X = corner.X
			e.Y = corner.Y
		}

		e.Direction = c.direction
	}
}

type interactCommand struct{}

func (c *interactCommand) Execute(s *State) {
	if !s.World.MachineActive {
		return
	}

	s.SwitchHive()
}

type exitCommand struct{}

func (c *exitCommand) Execute(s *State) {
	s.SwitchArcade()
}

var moveUpCommand = &moveCommand{direction: DirectionUp}
var moveDownCommand = &moveCommand{direction: DirectionDown}
var moveLeftCommand = &moveCommand{direction: DirectionLeft}
var moveRightCommand = &moveCommand{direction: DirectionRight}

var keyMappings = []keyMapping{
	{key: "ArrowUp", command: moveUpCommand},
	{key: "KeyW", command: moveUpCommand},
	{key: "ArrowDown", command: moveDownCommand},
	{key: "KeyS", command: moveDownCommand},
	{key: "ArrowLeft", command: moveLeftCommand},
	{key: "KeyA", command: moveLeftCommand},
	{key: "ArrowRight", command: moveRightCommand},
	{key: "KeyD", command: moveRightCommand},
	{key: "Space", command: &interactCommand{}},
	{key: "Escape", command: &exitCommand{}},
}

func handleInput(s *State) {
	for _, km := range keyMappings {
		if contains(s.Keys, km.key) {
			km.command.Execute(s)
		}
	}

	if s.Game == GameHive {
		return
	}

	v := s.World.Vectors[GamerID]
	if s.MovementKeyPressed {
		v.SetVelocity(1.0)
		s.MovementKeyPressed = false
	} else {
		v.SetVelocity(0)
	}
	s.World.Vectors[GamerID] = v
}

func contains(km map[string]bool, ks ...string) bool {
	for _, k := range ks {
		_, ok := km[k]
		if ok {
			return true
		}
	}
	return false
}
