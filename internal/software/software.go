package software

import (
	"github.com/danmcfan/arcade/internal/input"

	"github.com/hajimehoshi/ebiten/v2"
)

type Software interface {
	Background() *ebiten.Image
	Update(input input.Input) error
	Draw(screen *ebiten.Image, buffer float64)
	GameOver() bool
	Score() int
}

// FixedViewport is implemented by software that fills the window without the
// standard playfield margin (e.g. hive draws a cabinet bezel at 0,0).
type FixedViewport interface {
	Software
	FixedViewportSize() (width, height int)
}
