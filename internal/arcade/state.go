package arcade

import (
	"fmt"

	"github.com/danmcfan/arcade/internal/software"

	"github.com/hajimehoshi/ebiten/v2"
)

const tileSize = 8

type State struct {
	player   *entity
	walls    []rect
	machines []machine

	melodyPlaying  bool
	imageTitle     *ebiten.Image
	LoadedSoftware software.Software

	HighScore int
}

func NewState(initialSoftware software.Software) *State {
	return &State{
		player:         newPlayer(),
		walls:          newWalls(),
		machines:       newMachines(),
		LoadedSoftware: initialSoftware,
		HighScore:      0,
	}
}

func (s *State) DebugInfo() []string {
	lines := []string{}

	if s.player != nil {
		lines = append(lines, fmt.Sprintf("Player: (%.0f,%.0f)", s.player.X, s.player.Y))
	}

	return lines
}
