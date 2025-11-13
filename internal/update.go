//go:build js

package internal

import "math"

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
	var e *Entity
	switch s.Level {
	case LevelArcade:
		e = s.Gamer
	case LevelHive:
		e = s.Bear
	}

	handleInput(s)

	updateFrame(e)
	updatePosition(e)

	switch s.Level {
	case LevelArcade:
		clampPosition(e)
		s.Title = checkPosition(e)
	case LevelHive:
		for _, e := range s.Bees {
			updateFrame(e)
			updatePosition(e)
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

func updatePosition(e *Entity) {
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
