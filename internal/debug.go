package internal

import (
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

// DebugColors holds the configurable colors for debug rendering
type DebugColors struct {
	Player   color.Color
	Wall     color.Color
	Machine  color.Color
	Interact color.Color
}

// DefaultDebugColors returns the default color scheme for debug mode
func DefaultDebugColors() DebugColors {
	return DebugColors{
		Player:   color.RGBA{R: 0, G: 255, B: 0, A: 128},   // Green
		Wall:     color.RGBA{R: 255, G: 0, B: 0, A: 128},   // Red
		Machine:  color.RGBA{R: 255, G: 255, B: 0, A: 128}, // Yellow
		Interact: color.RGBA{R: 0, G: 255, B: 255, A: 64},  // Cyan (interaction radius)
	}
}

// DrawDebugRect draws a rectangle outline for rectangular collision shapes
func DrawDebugRect(screen *ebiten.Image, x, y, width, height float32, clr color.Color) {
	vector.StrokeRect(screen, x, y, width-1, height-1, 1, clr, false)
}

// DrawDebugPlayer draws the player's collision bounding box
func DrawDebugPlayer(screen *ebiten.Image, player *Entity, colors DebugColors, offsetX, offsetY float64) {
	// Draw player as a bounding box centered on their position
	// Player X,Y is center, so subtract half width/height to get top-left corner
	halfWidth := float32(player.Width / 2)
	halfHeight := float32(player.Height / 2)
	DrawDebugRect(
		screen,
		float32(player.X+offsetX)-halfWidth,
		float32(player.Y+offsetY)-halfHeight,
		float32(player.Width),
		float32(player.Height),
		colors.Player,
	)
}

// DrawDebugWalls draws all wall collision boxes
func DrawDebugWalls(screen *ebiten.Image, walls []Wall, colors DebugColors, offsetX, offsetY float64) {
	for _, wall := range walls {
		DrawDebugRect(
			screen,
			float32(wall.X+offsetX),
			float32(wall.Y+offsetY),
			float32(wall.Width),
			float32(wall.Height),
			colors.Wall,
		)
	}
}

// DrawDebugMachines draws machine collision boxes and interaction zones
func DrawDebugMachines(screen *ebiten.Image, machines []Machine, colors DebugColors, offsetX, offsetY float64) {
	for _, machine := range machines {
		// Draw machine collision box
		DrawDebugRect(
			screen,
			float32(machine.X+offsetX),
			float32(machine.Y+offsetY),
			float32(machine.Width),
			float32(machine.Height),
			colors.Machine,
		)

		// Draw interaction zone (front of machine only)
		// Assume machines face down, so interaction zone is below
		interactZoneY := float32(machine.Y + machine.Height + offsetY)
		DrawDebugRect(
			screen,
			float32(machine.X+offsetX),
			interactZoneY,
			float32(machine.Width),
			float32(machine.InteractRadius),
			colors.Interact,
		)
	}
}

// DrawDebugOverlay renders all debug visualizations with buffer offset
func DrawDebugOverlay(screen *ebiten.Image, player *Entity, walls []Wall, machines []Machine, colors DebugColors, bufferOffsetX, bufferOffsetY float64) {
	DrawDebugWalls(screen, walls, colors, bufferOffsetX, bufferOffsetY)
	DrawDebugMachines(screen, machines, colors, bufferOffsetX, bufferOffsetY)
	DrawDebugPlayer(screen, player, colors, bufferOffsetX, bufferOffsetY)
}
