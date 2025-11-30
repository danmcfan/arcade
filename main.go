package main

import (
	"log"

	"github.com/hajimehoshi/ebiten/v2"

	"arcade/internal/reload"
	"arcade/internal/wave"
)

const tps = 60

func main() {
	reload.Connect("ws://localhost:8080/ws")

	ebiten.SetTPS(tps)

	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	ebiten.SetWindowTitle("Arcade")

	g := wave.New()
	if err := ebiten.RunGame(g); err != nil {
		log.Fatal(err)
	}
}
