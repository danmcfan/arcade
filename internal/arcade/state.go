package arcade

import (
	"arcade/internal/software"
	"fmt"
)

const tileSize = 8

type State struct {
	player   *entity
	walls    []rect
	machines []machine

	melodyPlaying  bool
	LoadedSoftware software.Software

	HighScore int
}

func NewState() *State {
	return &State{
		player:    newPlayer(),
		walls:     newWalls(),
		machines:  newMachines(),
		HighScore: 0,
	}
}

func (s *State) DebugInfo() []string {
	lines := []string{}

	if s.player != nil {
		lines = append(lines, fmt.Sprintf("Player: (%.0f,%.0f)", s.player.X, s.player.Y))
	}

	return lines
}
