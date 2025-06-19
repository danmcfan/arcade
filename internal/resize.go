//go:build js

package internal

import (
	"syscall/js"
)

const MARGIN = 32

func HandleResize(window js.Value, canvas js.Value, g *Game) {
	windowWidth := window.Get("innerWidth").Int()
	windowHeight := window.Get("innerHeight").Int()

	availableWidth := windowWidth - MARGIN*2
	availableHeight := windowHeight - MARGIN*2

	width := 3200
	height := 1800

	if width > availableWidth || height > availableHeight {
		scaleWidth := float64(availableWidth) / float64(width)
		scaleHeight := float64(availableHeight) / float64(height)

		scale := min(scaleWidth, scaleHeight)
		g.Scale = max(min(int(scale/0.1), 8), 1)

		width = int(float64(width) * scale)
		height = int(float64(height) * scale)
	}

	canvas.Set("width", width)
	canvas.Set("height", height)

	g.Width = width
	g.Height = height

	g.Ctx.Set("imageSmoothingEnabled", false)

	ResetTransform(g.Ctx)
	ScaleScreen(g.Ctx, g.Scale)

	gameWidth := g.GridWidth * g.CellSize
	CenterScreen(g.Ctx, g.Scale, g.Width, gameWidth)
}
