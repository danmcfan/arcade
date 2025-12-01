package wave

import (
	"bytes"
	_ "embed"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"slices"

	"github.com/ebitengine/debugui"
	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"

	"arcade/internal/wave/grid"
)

const (
	framesPerSecond = 60
	seconds         = 5

	gridSize = 128
	tileSize = 16

	gridCount    = gridSize * gridSize
	stepInterval = gridCount / (framesPerSecond * seconds)
)

//go:embed three.png
var imageData []byte

var (
	pngImg, _ = png.Decode(bytes.NewReader(imageData))
	img       = ebiten.NewImageFromImage(pngImg)

	tileBlack = newTile(color.RGBA{R: 0, G: 0, B: 0, A: 255})
	tileGrass = img.SubImage(image.Rect(0, 0, 16, 16)).(*ebiten.Image)
	tileSand  = img.SubImage(image.Rect(16, 0, 32, 16)).(*ebiten.Image)
	tileWater = img.SubImage(image.Rect(32, 0, 48, 16)).(*ebiten.Image)

	tiles = [4]*ebiten.Image{tileBlack, tileGrass, tileSand, tileWater}

	ui = debugui.DebugUI{}
)

func newTile(color color.Color) *ebiten.Image {
	img := ebiten.NewImage(tileSize, tileSize)
	img.Fill(color)
	return img
}

type Game struct {
	grid *grid.Grid
}

func New() *Game {
	return &Game{
		grid: grid.New(gridSize, gridSize),
	}
}

func (g *Game) Update() error {
	if _, err := ui.Update(func(ctx *debugui.Context) error {
		ctx.Window("Wave", image.Rect(10, 10, 120, 120), func(layout debugui.ContainerLayout) {
			ctx.SetScale(gridSize / 64)
			ctx.Text(fmt.Sprintf("FPS: %0.2f", ebiten.ActualFPS()))
			ctx.Text(fmt.Sprintf("TPS: %0.2f", ebiten.ActualTPS()))
			ctx.Text(fmt.Sprintf("%d / %d", g.grid.CollapsedCount, gridCount))
		})
		return nil
	}); err != nil {
		return err
	}

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
	for x := range g.grid.Cells {
		for y := range g.grid.Cells[x] {
			cell := &g.grid.Cells[x][y]
			if !cell.Collapsed || len(cell.Possible) != 1 {
				continue
			}
			op := &ebiten.DrawImageOptions{}
			op.GeoM.Translate(float64(x*tileSize), float64(y*tileSize))
			screen.DrawImage(tiles[cell.Possible[0]], op)
		}
	}
	ui.Draw(screen)
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return tileSize * gridSize, tileSize * gridSize
}
