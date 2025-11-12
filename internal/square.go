package internal

import (
	"fmt"
	"math/rand"
)

type Square struct {
	X         float64
	Y         float64
	W         float64
	H         float64
	VelocityX float64
	VelocityY float64
	Color     string
}

func RandomSquares(count int) []*Square {
	squares := make([]*Square, count)
	for i := range count {
		size := rand.Intn(100)
		squares[i] = &Square{
			X:         float64(rand.Intn(100)),
			Y:         float64(rand.Intn(100)),
			W:         float64(size),
			H:         float64(size),
			VelocityX: float64(rand.Intn(10)),
			VelocityY: float64(rand.Intn(10)),
			Color:     fmt.Sprintf("rgb(%d, %d, %d)", rand.Intn(256), rand.Intn(256), rand.Intn(256)),
		}
	}
	return squares
}
