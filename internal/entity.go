//go:build js

package internal

type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

type Axis string

const (
	AxisVertical   Axis = "VERTICAL"
	AxisHorizontal Axis = "HORIZONTAL"
)

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

func EntityBear() *Entity {
	return &Entity{
		Sprite:         SpriteBear,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionDown:  0,
			DirectionUp:    1,
			DirectionLeft:  2,
			DirectionRight: 3,
		},
		X:         112,
		Y:         212,
		OffsetX:   8,
		OffsetY:   8,
		Direction: DirectionLeft,
		Radius:    4,
		Velocity:  1.0,
	}
}

func EntityBees() []*Entity {
	return []*Entity{
		NewEntityBee(1, 4, DirectionRight),
		NewEntityBee(26, 4, DirectionLeft),
		NewEntityBee(1, 29, DirectionRight),
		NewEntityBee(26, 29, DirectionLeft),
	}
}

type Entity struct {
	Sprite *Sprite

	Frame          float64
	FrameIncrement float64
	FrameTotal     float64
	FrameDirection map[Direction]int

	X          float64
	Y          float64
	OffsetX    float64
	OffsetY    float64
	Direction  Direction
	Directions []Direction
	Radius     float64
	Velocity   float64

	LastCorner *Entity

	BlueFrames int

	FlashFrames int
	Flash       bool
}

func (e *Entity) IsPower() bool {
	return e.Sprite == SpriteFood && e.Frame == 1
}

func NewEntityBee(tx, ty int, d Direction) *Entity {
	return &Entity{
		Sprite:         SpriteBee,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionDown:  0,
			DirectionUp:    1,
			DirectionLeft:  1,
			DirectionRight: 0,
		},
		X:         float64(8*tx + 4),
		Y:         float64(8*ty + 4),
		OffsetX:   8,
		OffsetY:   8,
		Direction: d,
		Radius:    4,
		Velocity:  0.75,
	}
}
