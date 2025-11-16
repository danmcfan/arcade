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
	if s.Game == nil {
		return
	}
	s.Game.Update(s)
}

func updateFrame(e *Entity) {
	if e.Velocity > 0 {
		e.Frame += e.FrameIncrement
		e.Frame = math.Mod(e.Frame, e.FrameTotal)
	} else {
		e.Frame = 0
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
