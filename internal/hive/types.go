package hive

import "github.com/hajimehoshi/ebiten/v2"

// Direction represents a movement direction
type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

// Axis represents horizontal or vertical alignment
type Axis string

const (
	AxisVertical   Axis = "VERTICAL"
	AxisHorizontal Axis = "HORIZONTAL"
)

// Axis returns the axis for a direction
func (d Direction) Axis() Axis {
	switch d {
	case DirectionUp, DirectionDown:
		return AxisVertical
	case DirectionLeft, DirectionRight:
		return AxisHorizontal
	default:
		return AxisVertical
	}
}

// Entity represents a game object in the hive game
type Entity struct {
	Sprite *ebiten.Image

	Frame          float64
	FrameIncrement float64
	FrameTotal     float64
	FrameDirection map[Direction]int

	X          float64
	Y          float64
	Width      float64
	Height     float64
	Direction  Direction
	Directions []Direction
	Velocity   float64

	LastCorner *Entity

	BlueFrames  int
	FlashFrames int
	Flash       bool
}

// IsPower returns true if this entity is a power pellet
func (e *Entity) IsPower() bool {
	return e.Frame == 1
}
