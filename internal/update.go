//go:build js

package internal

import (
	"math"
	"math/rand"
	"slices"
)

const (
	TileSize = 8
	TileMinX = 3
	TileMaxX = 15
	TileMinY = 6
	TileMaxY = 12

	MachineMinX = 9
	MachineMaxX = 11
	MachineMinY = 8
	MachineMaxY = 9
)

func update(s *State) {
	var updatePosition func(*Entity)

	switch s.Level {
	case LevelArcade:
		updatePosition = updatePositionArcade
		e := s.Gamer

		handleInput(s)

		updateFrame(e)
		updatePosition(e)

		clampPosition(e)
		s.Title = checkPosition(e)
	case LevelHive:
		updatePosition = updatePositionHive
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

		updateFrame(e)
		updatePosition(e)

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

			updatePosition(b)

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
}

func updateFrame(e *Entity) {
	if e.Velocity > 0 {
		e.Frame += e.FrameIncrement
		e.Frame = math.Mod(e.Frame, e.FrameTotal)
	} else {
		e.Frame = 0
	}
}

func updatePositionArcade(e *Entity) {
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

func updatePositionHive(e *Entity) {
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

func updateDirection(e *Entity) {
	corner := findCorner(e)
	if corner == nil {
		return
	}

	if corner == e.LastCorner {
		return
	}

	validDirections := make([]Direction, len(corner.Directions))
	copy(validDirections, corner.Directions)

	validDirections = slices.DeleteFunc(validDirections, func(d Direction) bool {
		return d == e.Direction
	})

	e.X = corner.X
	e.Y = corner.Y
	e.Direction = validDirections[rand.Intn(len(validDirections))]
	e.LastCorner = corner
}

func clampPosition(e *Entity) {
	e.X = math.Max(e.X, TileSize*TileMinX+e.OffsetX)
	e.X = math.Min(e.X, TileSize*TileMaxX+e.OffsetX)
	e.Y = math.Max(e.Y, TileSize*TileMinY+e.OffsetY)
	e.Y = math.Min(e.Y, TileSize*TileMaxY+e.OffsetY)
}

func checkPosition(e *Entity) bool {
	if e.X < TileSize*MachineMinX {
		return false
	}
	if e.X > TileSize*MachineMaxX {
		return false
	}
	if e.Y < TileSize*MachineMinY {
		return false
	}
	if e.Y > TileSize*MachineMaxY {
		return false
	}
	if e.Direction != DirectionUp {
		return false
	}
	return true
}
