package internal

import (
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
)

const (
	buffer = 0.10
)

type Game struct {
	keys []ebiten.Key

	player *Entity
}

func (g *Game) Update() error {
	g.keys = inpututil.AppendPressedKeys(g.keys[:0])

	if slices.Contains(g.keys, ebiten.KeySpace) {
		imageBackground = imageHive
	}

	if slices.Contains(g.keys, ebiten.KeyEscape) {
		imageBackground = imageArcade
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	screenWidth := screen.Bounds().Dx()
	screenHeight := screen.Bounds().Dy()

	drawImage(screen, imageBackground, float64(screenWidth)*buffer/2, float64(screenHeight)*buffer/2)

	imageGamerFrame := getImageFrame(imageGamer, 0, 24, 16, 24)
	drawImage(screen, imageGamerFrame, 81, 81)
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return int(float64(imageBackground.Bounds().Dx()) * (1 + buffer)), int(float64(imageBackground.Bounds().Dy()) * (1 + buffer))
}
