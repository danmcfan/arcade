package hive

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"math"
	"math/rand"
	"slices"
)

func (s *HiveSoftware) Update(i input.Input) error {
	if s.startFrames > 0 {
		s.startFrames--
		return nil
	}

	if winner(s) {
		s.items = newItems()
		restart(s)

		assets.SoundStart.Rewind()
		assets.SoundStart.Play()

		return nil
	}

	applyInput(s, i)

	for _, e := range s.enemies {
		updateBlue(e)
		updateDirection(e, s.corners)

		if !collideWithDistance(e, s.player, 1.0) {
			continue
		}

		if e.BlueFrames > 0 {
			s.score += 200
			resetEnemy(e)
			continue
		}

		assets.SoundDeath.Rewind()
		assets.SoundDeath.Play()

		s.lives--
		if s.lives <= 0 {
			return nil
		}
		restart(s)
	}

	for _, e := range s.movingEntities() {
		updateFrame(e)
		updatePosition(e, s.corners)
	}

	for i, item := range s.items {
		if item == nil {
			continue
		}

		if !collide(item, s.player) {
			continue
		}

		if item.IsPellet() {
			s.score += 10
		}

		if item.IsPower() {
			assets.SoundPower.Rewind()
			assets.SoundPower.Play()

			s.score += 50

			for _, e := range s.enemies {
				e.BlueFrames = blueFramesDuration
				e.FlashFrames = 0
				e.Flash = false
			}
		}

		s.items[i] = nil
		break
	}

	return nil
}

func start(s *HiveSoftware) {
	s.lives = 3
	s.score = 0
	s.player = NewPlayer()
	s.enemies = newEnemies()
	s.items = newItems()
	s.startFrames = framesPerSecond * 2

	assets.SoundStart.Rewind()
	assets.SoundStart.Play()
}

func winner(s *HiveSoftware) bool {
	for _, item := range s.items {
		if item != nil {
			return false
		}
	}
	return true
}

func applyInput(s *HiveSoftware, i input.Input) {
	newDirection := i.Direction()
	corner := findCorner(s.player, s.corners)
	if corner == nil {
		validDirections := []input.Direction{}
		switch s.player.Direction.Axis() {
		case input.AxisVertical:
			validDirections = []input.Direction{input.DirectionUp, input.DirectionDown}
		case input.AxisHorizontal:
			validDirections = []input.Direction{input.DirectionLeft, input.DirectionRight}
		}

		if !slices.Contains(validDirections, newDirection) {
			return
		}

		s.player.Direction = newDirection
		return
	}

	if !slices.Contains(corner.Directions, newDirection) {
		return
	}

	if s.player.Direction.Axis() != newDirection.Axis() {
		s.player.X = corner.X
		s.player.Y = corner.Y
	}

	s.player.Direction = newDirection
}

func updateFrame(e *Entity) {
	if e.Velocity > 0 {
		e.Frame += e.FrameIncrement
		e.Frame = math.Mod(e.Frame, e.FrameTotal)
	} else {
		e.Frame = 0
	}
}

func updateBlue(e *Entity) {
	if e.BlueFrames > 0 {
		e.BlueFrames--
		if e.BlueFrames <= framesPerSecond*2 {
			if e.FlashFrames != 0 {
				e.FlashFrames--
			} else {
				e.Flash = !e.Flash
				e.FlashFrames = 5
			}
		}
	} else {
		e.FlashFrames = 0
		e.Flash = false
	}
}

func updatePosition(e *Entity, cs []*Entity) {
	validDirections := []input.Direction{e.Direction}

	corner := findCorner(e, cs)
	if corner != nil {
		validDirections = corner.Directions
	}

	if slices.Contains(validDirections, e.Direction) {
		switch e.Direction {
		case input.DirectionUp:
			e.Y -= e.Velocity
		case input.DirectionDown:
			e.Y += e.Velocity
		case input.DirectionLeft:
			e.X -= e.Velocity
		case input.DirectionRight:
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

func updateDirection(e *Entity, cs []*Entity) {
	corner := findCorner(e, cs)
	if corner == nil {
		return
	}

	if corner == e.LastCorner {
		return
	}

	validDirections := make([]input.Direction, len(corner.Directions))
	copy(validDirections, corner.Directions)

	validDirections = slices.DeleteFunc(validDirections, func(d input.Direction) bool {
		return d == e.Direction
	})

	if len(validDirections) == 0 {
		return
	}

	e.X = corner.X
	e.Y = corner.Y
	e.Direction = validDirections[rand.Intn(len(validDirections))]
	e.LastCorner = corner
}

func restart(s *HiveSoftware) {
	s.startFrames = framesPerSecond * 2
	s.player = NewPlayer()
	s.enemies = newEnemies()
}

func resetEnemy(e *Entity) {
	e.X = 8*13 + 4
	e.Y = 8*14 + 4
	e.Direction = []input.Direction{input.DirectionLeft, input.DirectionRight}[rand.Intn(2)]
	e.LastCorner = nil
	e.BlueFrames = 0
	e.FlashFrames = 0
	e.Flash = false
}

func findCorner(e *Entity, cs []*Entity) *Entity {
	for _, c := range cs {
		if collide(c, e) {
			return c
		}
	}
	return nil
}

func collide(a *Entity, b *Entity) bool {
	return math.Abs(a.X-b.X) <= DistanceThreshold && math.Abs(a.Y-b.Y) <= DistanceThreshold
}

func collideWithDistance(a *Entity, b *Entity, distance float64) bool {
	return math.Abs(a.X-b.X) <= distance && math.Abs(a.Y-b.Y) <= distance
}
