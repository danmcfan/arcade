package hive

import (
	"arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	framesPerSecond    = 60
	blueFramesDuration = framesPerSecond * 10
)

type HiveSoftware struct {
	player  *Entity
	enemies []*Entity
	items   []*Entity
	corners []*Entity

	startFrames int
	lives       int
	score       int
	highScore   int
}

func NewHiveSoftware(highscore int) *HiveSoftware {
	s := &HiveSoftware{
		highScore: highscore,
		corners:   newCorners(),
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
