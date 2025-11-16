//go:build js

package internal

import "math"

type Vector struct {
	X         float64
	Y         float64
	OffsetX   float64
	OffsetY   float64
	Direction Direction
	Velocity  float64
}

func (v *Vector) SetDirection(direction Direction) {
	v.Direction = direction
}

func (v *Vector) SetVelocity(velocity float64) {
	v.Velocity = velocity
}

func (v *Vector) Update() {
	switch v.Direction {
	case DirectionUp:
		v.Y -= v.Velocity
	case DirectionDown:
		v.Y += v.Velocity
	case DirectionLeft:
		v.X -= v.Velocity
	case DirectionRight:
		v.X += v.Velocity
	}
}

func (v *Vector) Clamp() {
	v.X = math.Max(v.X, TileSize*TileMinX+v.OffsetX)
	v.X = math.Min(v.X, TileSize*TileMaxX+v.OffsetX)
	v.Y = math.Max(v.Y, TileSize*TileMinY+v.OffsetY)
	v.Y = math.Min(v.Y, TileSize*TileMaxY+v.OffsetY)
}

func (v *Vector) Check() bool {
	if v.X < TileSize*MachineMinX {
		return false
	}
	if v.X > TileSize*MachineMaxX {
		return false
	}
	if v.Y < TileSize*MachineMinY {
		return false
	}
	if v.Y > TileSize*MachineMaxY {
		return false
	}
	if v.Direction != DirectionUp {
		return false
	}
	return true
}

func VectorSystem(w *World) {
	for i := range MaxEntities {
		v := w.Vectors[i]
		v.Update()
		v.Clamp()

		if i != GamerID {
			continue
		}

		w.MachineActive = v.Check()
		w.Vectors[i] = v
	}
}
