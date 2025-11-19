package software

import (
	"arcade/internal/input"

	"github.com/hajimehoshi/ebiten/v2"
)

type Software interface {
	Background() *ebiten.Image
	Update(input input.Input) error
	Draw(screen *ebiten.Image, buffer float64)
	GameOver() bool
	Score() int
}
