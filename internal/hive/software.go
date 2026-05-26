package hive

import (
	"github.com/danmcfan/arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	framesPerSecond    = 60
	blueFramesDuration = framesPerSecond * 10
)

type HiveSoftware struct {
	stateMachine *StateMachine
	camera       *CameraSystem
	particles    *ParticleSystem

	player  *Entity
	enemies []*Entity
	items   []*Entity
	corners []*Entity

	modeIndex   int
	modeCurrent mode
	modeTicks   int

	pauseTicks int

	startTicks int

	lives     int
	score     int
	highScore int
}

func NewHiveSoftware(highscore int) *HiveSoftware {
	s := &HiveSoftware{
		highScore: highscore,
		corners:   newCorners(),
	}

	s.camera = NewCameraSystem()
	s.particles = NewParticleSystem()

	s.stateMachine = NewStateMachine()
	s.stateMachine.RegisterState(StateIDStart, &StartState{s: s})
	s.stateMachine.RegisterState(StateIDPlay, &PlayState{s: s})
	s.stateMachine.RegisterState(StateIDPause, &PauseState{s: s})
	s.stateMachine.RegisterState(StateIDGameOver, &GameOverState{s: s})

	s.lives = 3
	s.score = 0
	s.items = newItems()
	s.restartRound()

	s.stateMachine.ChangeState(StateIDStart)

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

func (s *HiveSoftware) Camera() *CameraSystem {
	return s.camera
}

func (s *HiveSoftware) Particles() *ParticleSystem {
	return s.particles
}

func (s *HiveSoftware) movingEntities() []*Entity {
	entities := make([]*Entity, 0, len(s.enemies)+1)
	entities = append(entities, s.player)
	entities = append(entities, s.enemies...)
	return entities
}
