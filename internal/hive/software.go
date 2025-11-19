package hive

import (
	"arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	framesPerSecond    = 60
	blueFramesDuration = framesPerSecond * 10
)

type Mode int

const (
	ModeScatter Mode = iota
	ModeChase
)

type HiveSoftware struct {
	player  *Entity
	enemies []*Entity
	items   []*Entity
	corners []*Entity

	modeCurrent Mode
	modeNext    Mode
	modeTicks   int

	startTicks int
	lives      int
	score      int
	highScore  int
}

func NewHiveSoftware(highscore int) *HiveSoftware {
	s := &HiveSoftware{
		modeCurrent: ModeScatter,
		modeNext:    ModeChase,
		modeTicks:   framesPerSecond * 10,
		highScore:   highscore,
		corners:     newCorners(),
	}
	start(s)
	return s
}

func (s *HiveSoftware) Background() *ebiten.Image {
	return assets.ImageHive
}

func (s *HiveSoftware) GameOver() bool {
	return s.lives <= 0
}

func (s *HiveSoftware) Score() int {
	return s.score
}

func (s *HiveSoftware) movingEntities() []*Entity {
	entities := make([]*Entity, 0, len(s.enemies)+1)
	entities = append(entities, s.player)
	entities = append(entities, s.enemies...)
	return entities
}
