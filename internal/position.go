package internal

type Position struct {
	X     float64
	Y     float64
	Speed float64
}

func NewPosition(x float64, y float64, speed float64) Position {
	return Position{
		X:     x,
		Y:     y,
		Speed: speed,
	}
}
