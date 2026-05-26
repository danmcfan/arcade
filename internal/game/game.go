package game

import (
	"math"

	"github.com/danmcfan/arcade/internal/arcade"
	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/debug"
	"github.com/danmcfan/arcade/internal/input"
	"github.com/danmcfan/arcade/internal/software"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
)

const (
	buffer = 16

	initialDebugMode = false
)

type Game struct {
	arcade *arcade.State

	software software.Software

	debugMode  bool
	debugPanel *debug.Panel
}

func New(initialSoftware software.Software) *Game {
	return &Game{
		arcade:     arcade.NewState(initialSoftware),
		debugMode:  initialDebugMode,
		debugPanel: debug.NewDebugPanel(0, 0, 120),
	}
}

func (g *Game) Update() error {
	pressedKeys := inpututil.AppendPressedKeys(nil)
	justPressedKeys := inpututil.AppendJustPressedKeys(nil)
	input := input.ReadInput(pressedKeys, justPressedKeys)

	if input.ShiftP {
		g.debugMode = !g.debugMode
	}

	if input.Escape && g.software != nil {
		assets.SoundStart.Pause()
		g.software = nil
		return nil
	}

	if g.software != nil {
		g.software.Update(input)
		if g.software.GameOver() {
			g.arcade.HighScore = int(math.Max(float64(g.arcade.HighScore), float64(g.software.Score())))
			g.software = nil
		}
		return nil
	}

	err := arcade.Update(g.arcade, input)
	if err != nil {
		return err
	}

	if g.arcade.LoadedSoftware != nil {
		g.software = g.arcade.LoadedSoftware
		g.arcade.LoadedSoftware = nil
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	if g.software != nil {
		g.software.Draw(screen, buffer)
		return
	}

	arcade.Draw(screen, g.arcade, buffer, g.debugMode)

	if g.debugMode {
		gameWidth := float64(assets.ImageArcade.Bounds().Dx()) + buffer*2
		gameHeight := float64(assets.ImageArcade.Bounds().Dy()) + buffer*2
		g.debugPanel.Draw(screen, g.arcade, gameWidth, gameHeight)
	}
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	baseWidth := assets.ImageArcade.Bounds().Dx() + buffer*2
	baseHeight := assets.ImageArcade.Bounds().Dy() + buffer*2

	if g.software != nil {
		baseWidth = g.software.Background().Bounds().Dx() + buffer*2
		baseHeight = g.software.Background().Bounds().Dy() + buffer*2
	}

	if g.debugMode {
		baseWidth += int(g.debugPanel.Width())
	}

	return baseWidth, baseHeight
}
