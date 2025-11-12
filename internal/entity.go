//go:build js

package internal

type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

type Entity struct {
	Sprite *Sprite

	Frame          float64
	FrameTotal     int
	FrameDirection map[Direction]int

	X         float64
	Y         float64
	OffsetX   float64
	OffsetY   float64
	Direction Direction
	Radius    float64
	Velocity  float64
}

func NewEntity(sprite *Sprite) *Entity {
	return &Entity{
		Sprite:         sprite,
		FrameDirection: make(map[Direction]int),
		Direction:      DirectionDown,
	}
}
