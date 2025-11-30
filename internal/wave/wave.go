package wave

import (
	"image/color"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"

	"arcade/internal/wave/simple"
)

const (
	tileSize = 1
	gridSize = 256

	stepInterval = 256
)

var (
	tileBlack = newTile(color.RGBA{R: 0, G: 0, B: 0, A: 255})
	tileRed   = newTile(color.RGBA{R: 255, G: 0, B: 0, A: 255})
	tileGreen = newTile(color.RGBA{R: 0, G: 255, B: 0, A: 255})
	tileBlue  = newTile(color.RGBA{R: 0, G: 0, B: 255, A: 255})

	tiles = [4]*ebiten.Image{tileBlack, tileRed, tileGreen, tileBlue}
)

func newTile(color color.Color) *ebiten.Image {
	img := ebiten.NewImage(tileSize, tileSize)
	img.Fill(color)
	return img
}

type Game struct {
	grid *simple.Grid
}

func New() *Game {
	return &Game{
		grid: simple.NewGrid(gridSize),
	}
}

func (g *Game) Update() error {
	keys := make([]ebiten.Key, 0)
	keys = inpututil.AppendJustPressedKeys(keys)

	if slices.Contains(keys, ebiten.KeySpace) {
		g.grid.Reset()
	} else {
		for range stepInterval {
			g.grid.Step()
		}
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	for x := range gridSize {
		for y := range gridSize {
			value := g.grid.Get(x, y)
			if value == 0 {
				continue
			}
			op := &ebiten.DrawImageOptions{}
			op.GeoM.Translate(float64(x*tileSize), float64(y*tileSize))
			screen.DrawImage(tiles[value], op)
		}
	}
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return tileSize * gridSize, tileSize * gridSize
}
