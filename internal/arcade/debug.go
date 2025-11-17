package arcade

import (
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

var colorPlayer = color.RGBA{R: 0, G: 255, B: 0, A: 64}
var colorWall = color.RGBA{R: 255, G: 0, B: 0, A: 64}
var colorMachine = color.RGBA{R: 255, G: 255, B: 0, A: 64}

func drawDebugOverlay(screen *ebiten.Image, s *State, buffer float64) {
	player := s.player
	playerRect := rect{x: player.X, y: player.Y, w: player.Width, h: player.Height}
	playerRect.x += buffer - player.Width/2
	playerRect.y += buffer - player.Height/2
	drawDebugRect(screen, playerRect, colorPlayer)

	for _, rect := range s.walls {
		rect.x += buffer
		rect.y += buffer
		drawDebugRect(screen, rect, colorWall)
	}

	for _, machine := range s.machines {
		machine.rect.x += buffer
		machine.rect.y += buffer
		drawDebugRect(screen, machine.rect, colorMachine)
	}
}

func drawDebugRect(screen *ebiten.Image, rect rect, clr color.Color) {
	vector.StrokeRect(screen, float32(rect.x), float32(rect.y), float32(rect.w-1), float32(rect.h-1), 1, clr, false)
}
