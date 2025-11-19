package draw

import (
	"image"

	"github.com/hajimehoshi/ebiten/v2"
)

type Vector struct {
	X float64
	Y float64
}

func NewVector(x, y float64) Vector {
	return Vector{X: x, Y: y}
}

func CutImage(img *ebiten.Image, rect image.Rectangle) *ebiten.Image {
	return img.SubImage(rect).(*ebiten.Image)
}

func DrawImage(screen *ebiten.Image, img *ebiten.Image, position Vector) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(position.X, position.Y)
	screen.DrawImage(img, op)
}

func Add(a, b Vector) Vector {
	return NewVector(a.X+b.X, a.Y+b.Y)
}

func Sub(a, b Vector) Vector {
	return NewVector(a.X-b.X, a.Y-b.Y)
}
