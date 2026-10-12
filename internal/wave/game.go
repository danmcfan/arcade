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

// Package-init defaults of the former globals gridSize, activeGridSize,
// seconds and activeSeconds (now Game fields so the golden harness can set
// them; there is only ever one Game, so behavior is unchanged).
const (
	defaultGridSize = 128
	defaultSeconds  = 5
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

func (g *Game) StepInterval() int {
	return (g.activeGridSize * g.activeGridSize) / (framesPerSecond * g.activeSeconds)
}

func newTile(color color.Color) *ebiten.Image {
	img := ebiten.NewImage(tileSize, tileSize)
	img.Fill(color)
	return img
}

type Game struct {
	grid *grid.Grid

	// Pending slider values and the values applied on the last Space press.
	gridSize       int
	activeGridSize int
	seconds        int
	activeSeconds  int
}

func New() *Game {
	return NewWithPending(defaultGridSize, defaultSeconds)
}

// NewWithPending is New with the pending slider values (the former globals
// gridSize and seconds) preset, as if the sliders had been moved before New.
// The active values keep their defaults; the first grid uses the pending
// gridSize, exactly like New reading the gridSize global.
func NewWithPending(gridSize, seconds int) *Game {
	return &Game{
		grid:           grid.New(gridSize, gridSize),
		gridSize:       gridSize,
		activeGridSize: defaultGridSize,
		seconds:        seconds,
		activeSeconds:  defaultSeconds,
	}
}

func (g *Game) Update() error {
	keys := inpututil.AppendJustPressedKeys(nil)
	if _, err := ui.Update(func(ctx *debugui.Context) error {
		ctx.Window("Wave", image.Rect(10, 10, 160, 160), func(layout debugui.ContainerLayout) {
			ctx.SetScale(g.activeGridSize / 64)
			ctx.Slider(&g.gridSize, 64, 256, 64)
			ctx.Slider(&g.seconds, 1, 30, 1)
			ctx.Text(fmt.Sprintf("FPS: %0.2f", ebiten.ActualFPS()))
			ctx.Text(fmt.Sprintf("TPS: %0.2f", ebiten.ActualTPS()))
			ctx.Text(fmt.Sprintf("%d / %d", g.grid.CollapsedCount, g.activeGridSize*g.activeGridSize))
		})
		return nil
	}); err != nil {
		return err
	}

	g.Step(slices.Contains(keys, ebiten.KeySpace))

	return nil
}

// Step runs one tick of the simulation without debugui: on a Space press it
// applies the pending settings and rebuilds the grid (no grid steps that
// tick), otherwise it runs StepInterval grid steps.
func (g *Game) Step(spaceJustPressed bool) {
	if spaceJustPressed {
		g.activeGridSize = g.gridSize
		g.activeSeconds = g.seconds
		g.grid = grid.New(g.activeGridSize, g.activeGridSize)
	} else {
		for range g.StepInterval() {
			g.grid.Step()
		}
	}
}

func (g *Game) Draw(screen *ebiten.Image) {
	g.DrawCells(screen)
	ui.Draw(screen)
}

// DrawCells draws the collapsed cells (everything but the debugui window).
func (g *Game) DrawCells(screen *ebiten.Image) {
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
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return tileSize * g.activeGridSize, tileSize * g.activeGridSize
}
