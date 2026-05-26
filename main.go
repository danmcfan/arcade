package main

import (
	"log"

	"github.com/danmcfan/arcade/internal/game"
	"github.com/hajimehoshi/ebiten/v2"
)

func main() {
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	ebiten.SetWindowTitle("Arcade")

	if err := ebiten.RunGame(game.New(nil)); err != nil {
		log.Fatal(err)
	}
}
