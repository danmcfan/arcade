package main

import (
	"log"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"

	"arcade/internal/game"
	"arcade/internal/reload"
	"arcade/internal/wave"
)

const (
	tps   = 60
	start = 0
)

type Game struct {
	games   []ebiten.Game
	index   int
	current ebiten.Game
}

func NewGame(start int, games ...ebiten.Game) *Game {
	return &Game{
		games:   games,
		index:   start,
		current: games[start],
	}
}

func (g *Game) Update() error {
	justPressedKeys := inpututil.AppendJustPressedKeys(nil)
	pressedKeys := inpututil.AppendPressedKeys(nil)

	if slices.Contains(justPressedKeys, ebiten.KeyM) && slices.Contains(pressedKeys, ebiten.KeyShift) {
		g.index = (g.index + 1) % len(g.games)
		g.current = g.games[g.index]
		return nil
	}

	return g.current.Update()
}

func (g *Game) Draw(screen *ebiten.Image) {
	g.current.Draw(screen)
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return g.current.Layout(outsideWidth, outsideHeight)
}

func main() {
	reload.Connect("ws://localhost:8080/ws")

	ebiten.SetTPS(tps)

	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	ebiten.SetWindowTitle("Arcade")

	gameArcade := game.New()
	gameWave := wave.New()

	gameToggle := NewGame(start, gameArcade, gameWave)

	if err := ebiten.RunGame(gameToggle); err != nil {
		log.Fatal(err)
	}
}
