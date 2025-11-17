package main

import (
	"log"

	"github.com/hajimehoshi/ebiten/v2"

	"arcade/internal"
)

func main() {
	go func() {
		internal.Connect("ws://localhost:8080/ws")
	}()

	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	ebiten.SetWindowTitle("Arcade")

	game := internal.NewGame()
	if err := ebiten.RunGame(game); err != nil {
		log.Fatal(err)
	}
}
