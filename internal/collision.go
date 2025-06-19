//go:build js

package internal

type Box struct {
	X, Y, W, H float64
}

func NewBox(x, y, w, h float64) Box {
	return Box{X: x, Y: y, W: w, H: h}
}

type Rectangle struct {
	X, Y, W, H float64
}

func NewRectangle(x, y, w, h float64) Rectangle {
	return Rectangle{X: x, Y: y, W: w, H: h}
}

type Side int

const (
	SideTop Side = iota
	SideBottom
	SideLeft
	SideRight
)

func Collides(a, b Rectangle) bool {
	return a.X < b.X+b.W && a.X+a.W > b.X && a.Y < b.Y+b.H && a.Y+a.H > b.Y
}

func CollisionSide(a, b Rectangle) Side {
	sourceOverlapX := a.X + a.W - b.X
	sourceOverlapY := a.Y + a.H - b.Y

	targetOverlapX := b.X + b.W - a.X
	targetOverlapY := b.Y + b.H - a.Y

	overlapX := min(sourceOverlapX, targetOverlapX)
	overlapY := min(sourceOverlapY, targetOverlapY)

	if overlapX < overlapY {
		if sourceOverlapX < targetOverlapX {
			return SideLeft
		} else {
			return SideRight
		}
	} else {
		if sourceOverlapY < targetOverlapY {
			return SideTop
		} else {
			return SideBottom
		}
	}
}
