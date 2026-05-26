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

	"github.com/danmcfan/arcade/internal/wave/grid"
)

const (
	tileSize        = 16
	framesPerSecond = 60
)

var gridSize int = 128
var activeGridSize int = gridSize

var seconds int = 5
var activeSeconds int = seconds

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

func StepInterval() int {
	return (activeGridSize * activeGridSize) / (framesPerSecond * activeSeconds)
}

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
	keys := inpututil.AppendJustPressedKeys(nil)
	if _, err := ui.Update(func(ctx *debugui.Context) error {
		ctx.Window("Wave", image.Rect(10, 10, 160, 160), func(layout debugui.ContainerLayout) {
			ctx.SetScale(activeGridSize / 64)
			ctx.Slider(&gridSize, 64, 256, 64)
			ctx.Slider(&seconds, 1, 30, 1)
			ctx.Text(fmt.Sprintf("FPS: %0.2f", ebiten.ActualFPS()))
			ctx.Text(fmt.Sprintf("TPS: %0.2f", ebiten.ActualTPS()))
			ctx.Text(fmt.Sprintf("%d / %d", g.grid.CollapsedCount, activeGridSize*activeGridSize))
		})
		return nil
	}); err != nil {
		return err
	}

	if slices.Contains(keys, ebiten.KeySpace) {
		activeGridSize = gridSize
		activeSeconds = seconds
		g.grid = grid.New(activeGridSize, activeGridSize)
	} else {
		for range StepInterval() {
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
	return tileSize * activeGridSize, tileSize * activeGridSize
}
