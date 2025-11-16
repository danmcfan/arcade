//go:build js

package internal

import "math"

const (
	DistanceThreshold = 0.25
)

var Corners = []*Entity{
	// ROW 1
	NewCorner(1, 1, DirectionDown, DirectionRight),
	NewCorner(6, 1, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(12, 1, DirectionDown, DirectionLeft),
	NewCorner(15, 1, DirectionDown, DirectionRight),
	NewCorner(21, 1, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(26, 1, DirectionDown, DirectionLeft),
	// ROW 5
	NewCorner(1, 5, DirectionUp, DirectionDown, DirectionRight),
	NewCorner(6, 5, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(9, 5, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(12, 5, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(15, 5, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(18, 5, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(21, 5, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(26, 5, DirectionUp, DirectionDown, DirectionLeft),
	// ROW 8
	NewCorner(1, 8, DirectionUp, DirectionRight),
	NewCorner(6, 8, DirectionUp, DirectionDown, DirectionLeft),
	NewCorner(9, 8, DirectionUp, DirectionRight),
	NewCorner(12, 8, DirectionDown, DirectionLeft),
	NewCorner(15, 8, DirectionDown, DirectionRight),
	NewCorner(18, 8, DirectionUp, DirectionLeft),
	NewCorner(21, 8, DirectionUp, DirectionDown, DirectionRight),
	NewCorner(26, 8, DirectionUp, DirectionLeft),
	// ROW 11
	NewCorner(9, 11, DirectionDown, DirectionRight),
	NewCorner(12, 11, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(15, 11, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(18, 11, DirectionDown, DirectionLeft),
	// ROW 14
	NewCorner(6, 14, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(9, 14, DirectionUp, DirectionDown, DirectionLeft),
	NewCorner(18, 14, DirectionUp, DirectionDown, DirectionRight),
	NewCorner(21, 14, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	// ROW 17
	NewCorner(9, 17, DirectionUp, DirectionDown, DirectionRight),
	NewCorner(18, 17, DirectionUp, DirectionDown, DirectionLeft),
	// ROW 20
	NewCorner(1, 20, DirectionDown, DirectionRight),
	NewCorner(6, 20, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(9, 20, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(12, 20, DirectionDown, DirectionLeft),
	NewCorner(15, 20, DirectionDown, DirectionRight),
	NewCorner(18, 20, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(21, 20, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(26, 20, DirectionDown, DirectionLeft),
	// ROW 23
	NewCorner(1, 23, DirectionUp, DirectionRight),
	NewCorner(3, 23, DirectionDown, DirectionLeft),
	NewCorner(6, 23, DirectionUp, DirectionDown, DirectionRight),
	NewCorner(9, 23, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(12, 23, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(15, 23, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(18, 23, DirectionDown, DirectionLeft, DirectionRight),
	NewCorner(21, 23, DirectionUp, DirectionDown, DirectionLeft),
	NewCorner(24, 23, DirectionDown, DirectionRight),
	NewCorner(26, 23, DirectionUp, DirectionLeft),
	// ROW 26
	NewCorner(1, 26, DirectionDown, DirectionRight),
	NewCorner(3, 26, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(6, 26, DirectionUp, DirectionLeft),
	NewCorner(9, 26, DirectionUp, DirectionRight),
	NewCorner(12, 26, DirectionDown, DirectionLeft),
	NewCorner(15, 26, DirectionDown, DirectionRight),
	NewCorner(18, 26, DirectionUp, DirectionLeft),
	NewCorner(21, 26, DirectionUp, DirectionRight),
	NewCorner(24, 26, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(26, 26, DirectionDown, DirectionLeft),
	// ROW 29
	NewCorner(1, 29, DirectionUp, DirectionRight),
	NewCorner(12, 29, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(15, 29, DirectionUp, DirectionLeft, DirectionRight),
	NewCorner(26, 29, DirectionUp, DirectionLeft),
}

func NewCorner(tx, ty int, ds ...Direction) *Entity {
	return &Entity{
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Radius:     1,
		Directions: ds,
	}
}

func findCorner(e *Entity) *Entity {
	for _, corner := range Corners {
		if collide(e, corner) {
			return corner
		}
	}
	return nil
}

func collide(e1 *Entity, e2 *Entity) bool {
	return math.Abs(e1.X-e2.X) <= DistanceThreshold && math.Abs(e1.Y-e2.Y) <= DistanceThreshold
}

func collideWithDistance(e1 *Entity, e2 *Entity, distance float64) bool {
	return math.Abs(e1.X-e2.X) <= distance && math.Abs(e1.Y-e2.Y) <= distance
}
