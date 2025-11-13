//go:build js

package internal

type keyMapping struct {
	key     string
	command Command
}

type Command interface {
	Execute(s *State)
}

type moveCommand struct {
	direction Direction
	velocity  float64
}

func (c *moveCommand) Execute(s *State) {
	e := s.Gamer
	e.Direction = c.direction
	s.MovementKeyPressed = true
}

type interactCommand struct{}

func (c *interactCommand) Execute(s *State) {
	if !s.Title {
		return
	}

	s.Title = false
	s.Level = LevelHive
	s.LevelSprite = SpriteHive
	HandleResize(s)
}

type exitCommand struct{}

func (c *exitCommand) Execute(s *State) {
	s.Title = true
	s.Level = LevelArcade
	s.LevelSprite = SpriteArcade
	HandleResize(s)
}

var moveUpCommand = &moveCommand{direction: DirectionUp, velocity: 1.0}
var moveDownCommand = &moveCommand{direction: DirectionDown, velocity: 1.0}
var moveLeftCommand = &moveCommand{direction: DirectionLeft, velocity: 1.0}
var moveRightCommand = &moveCommand{direction: DirectionRight, velocity: 1.0}

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

	if s.MovementKeyPressed {
		s.Gamer.Velocity = 1.0
		s.MovementKeyPressed = false
	} else {
		s.Gamer.Velocity = 0
	}
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
