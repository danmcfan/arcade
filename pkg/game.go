//go:build js

package internal

import (
	"math"
	"math/rand"
	"slices"
)

const FRAMES_PER_SECOND = 60

var GameArcade = &ArcadeGame{}
var GameHive = &HiveGame{}

type Game interface {
	Width() int
	Height() int
	Sprite() *Sprite
	Update(s *State)
	Render(s *State)
}

type BaseGame struct {
	player   *Entity
	entities []*Entity
}

type ArcadeGame struct {
	BaseGame
}

func (g *ArcadeGame) Width() int {
	return 160
}

func (g *ArcadeGame) Height() int {
	return 144
}

func (g *ArcadeGame) Sprite() *Sprite {
	return SpriteArcade
}

func (g *ArcadeGame) Update(s *State) {
	handleInput(s)

	if s.Game != GameArcade {
		return
	}

	GraphicSystem(s.World)
	VectorSystem(s.World)

	if s.World.MachineActive {
		SoundMelody.Play()
	} else {
		SoundMelody.Pause()
	}
}

func (g *ArcadeGame) Render(s *State) {
	renderTitle(s)

	for i := range MaxEntities {
		v := s.World.Vectors[i]
		g := s.World.Graphics[i]
		Render(s.Ctx, v, g)
	}
}

type HiveGame struct {
	BaseGame
}

func (g *HiveGame) Width() int {
	return 224
}

func (g *HiveGame) Height() int {
	return 288
}

func (g *HiveGame) Sprite() *Sprite {
	return SpriteHive
}

func (g *HiveGame) Update(s *State) {
	e := s.Bear

	if s.StartFrames > 0 {
		s.StartFrames--
		return
	}

	winner := true
	for _, f := range s.Food {
		if f != nil {
			winner = false
			break
		}
	}

	if winner {
		s.Food = NewFood()
		s.Reset()
		return
	}

	handleInput(s)

	if s.Game != GameHive {
		return
	}

	updateFrame(e)
	g.updatePosition(e)

	for _, bee := range s.Bees {
		if collideWithDistance(e, bee, 1.0) {
			if bee.BlueFrames > 0 {
				s.Score += 200
				bee.X = 8*13 + 4
				bee.Y = 8*14 + 4
				bee.Direction = []Direction{DirectionLeft, DirectionRight}[rand.Intn(2)]
				bee.LastCorner = nil
				bee.BlueFrames = 0
				bee.FlashFrames = 0
				bee.Flash = false
			} else {
				SoundDeath.Play()
				s.Lives--
				if s.Lives <= 0 {
					s.HighScore = int(math.Max(float64(s.Score), float64(s.HighScore)))
					s.SwitchArcade()
				}

				s.Reset()
			}
		}
	}

	for i, f := range s.Food {
		if f == nil {
			continue
		}

		if collide(e, f) {
			if f.IsPower() {
				SoundPower.Play()
				s.Score += 50
				for _, bee := range s.Bees {
					bee.BlueFrames = s.BlueFrames
					bee.FlashFrames = 0
					bee.Flash = false
				}
			} else {
				s.Score += 10
			}

			s.Food[i] = nil
			break
		}
	}

	for _, b := range s.Bees {
		updateFrame(b)

		updateDirection(b)

		g.updatePosition(b)

		if b.BlueFrames == 0 {
			continue
		}

		b.BlueFrames--
		if b.BlueFrames > FRAMES_PER_SECOND*2 {
			continue
		}

		if b.FlashFrames != 0 {
			b.FlashFrames--
			continue
		}

		b.Flash = !b.Flash
		b.FlashFrames += 5
	}
}

func (g *HiveGame) updatePosition(e *Entity) {
	validDirections := []Direction{e.Direction}

	corner := findCorner(e)
	if corner != nil {
		validDirections = corner.Directions
	}

	if slices.Contains(validDirections, e.Direction) {
		switch e.Direction {
		case DirectionUp:
			e.Y -= e.Velocity
		case DirectionDown:
			e.Y += e.Velocity
		case DirectionLeft:
			e.X -= e.Velocity
		case DirectionRight:
			e.X += e.Velocity
		}
	}

	if e.Y == float64(8*17+4) {
		if e.X <= 0 {
			e.X = float64(8 * 28)
		} else if e.X >= float64(8*28) {
			e.X = 0
		}
	}
}

func (g *HiveGame) Render(s *State) {
	renderScore(s)
	renderHighScore(s)
	renderLives(s)

	if s.StartFrames > 0 {
		renderReady(s)
	}

	for _, food := range s.Food {
		renderEntity(s, food)
	}

	renderEntity(s, s.Bear)
	for _, bee := range s.Bees {
		renderEntity(s, bee)
	}

	for _, c := range Corners {
		renderCorner(s, c)
	}
}
