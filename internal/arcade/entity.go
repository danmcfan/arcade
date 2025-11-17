package arcade

import (
	"arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

type entity struct {
	Image *ebiten.Image

	Frame          float64
	FrameIncrement float64
	FrameTotal     float64
	FrameDirection map[Direction]int

	X         float64
	Y         float64
	Width     float64
	Height    float64
	Direction Direction
	Velocity  float64
}

func newPlayer() *entity {
	return &entity{
		Image:          assets.ImageGamer,
		Frame:          0,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionUp:    0,
			DirectionDown:  1,
			DirectionLeft:  2,
			DirectionRight: 3,
		},
		X:         80,
		Y:         92,
		Width:     16,
		Height:    24,
		Direction: DirectionDown,
		Velocity:  0,
	}
}
