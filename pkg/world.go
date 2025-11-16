//go:build js

package internal

const (
	MaxEntities = 128
	GamerID     = 0
)

type ID int

type World struct {
	Next ID

	Vectors  [MaxEntities]Vector
	Graphics [MaxEntities]Graphic

	MachineActive bool
}

func NewWorld() *World {
	w := &World{}
	id := w.AddEntity()
	w.SetVector(id, Vector{
		X:         80,
		Y:         92,
		OffsetX:   8,
		OffsetY:   16,
		Direction: DirectionDown,
		Velocity:  1.0,
	})
	w.SetGraphic(id, Graphic{
		Sprite:         SpriteGamer,
		Frame:          0,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionUp:    0,
			DirectionDown:  1,
			DirectionLeft:  2,
			DirectionRight: 3,
		},
		Radius: 4,
	})
	return w
}

func (w *World) AddEntity() ID {
	if w.Next == MaxEntities {
		panic("world is full")
	}

	id := w.Next
	w.Next++
	return id
}

func (w *World) SetVector(id ID, v Vector) {
	w.Vectors[id] = v
}

func (w *World) SetGraphic(id ID, g Graphic) {
	w.Graphics[id] = g
}
