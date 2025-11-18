package firefly

import (
	"image/color"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

var (
	colorCurve        = color.RGBA{R: 0, G: 255, B: 255, A: 255} // Cyan for curve
	colorControlPoint = color.RGBA{R: 255, G: 0, B: 255, A: 255} // Magenta for control points
	colorControlLine  = color.RGBA{R: 255, G: 255, B: 0, A: 128} // Yellow for control lines
)

// DrawBezierDebug draws a bezier curve with its control points
func DrawBezierDebug(screen *ebiten.Image, bezierConfig bezierConfig, buffer float64, steps int) {
	patternFunc := NewBezierPatternFunc(bezierConfig)

	// Draw control point lines
	drawLine(screen, bezierConfig.p0.x+buffer, bezierConfig.p0.y+buffer, bezierConfig.p1.x+buffer, bezierConfig.p1.y+buffer, colorControlLine)
	drawLine(screen, bezierConfig.p1.x+buffer, bezierConfig.p1.y+buffer, bezierConfig.p2.x+buffer, bezierConfig.p2.y+buffer, colorControlLine)
	drawLine(screen, bezierConfig.p2.x+buffer, bezierConfig.p2.y+buffer, bezierConfig.p3.x+buffer, bezierConfig.p3.y+buffer, colorControlLine)

	// Draw the bezier curve by sampling points
	prevPoint := patternFunc(0)
	for i := 1; i <= steps; i++ {
		t := float64(i) / float64(steps)
		currentPoint := patternFunc(t)

		drawLine(screen,
			prevPoint.x+buffer, prevPoint.y+buffer,
			currentPoint.x+buffer, currentPoint.y+buffer,
			colorCurve,
		)

		prevPoint = currentPoint
	}

	// Draw control points as circles
	drawCircle(screen, bezierConfig.p0.x+buffer, bezierConfig.p0.y+buffer, 3, colorControlPoint)
	drawCircle(screen, bezierConfig.p1.x+buffer, bezierConfig.p1.y+buffer, 3, colorControlPoint)
	drawCircle(screen, bezierConfig.p2.x+buffer, bezierConfig.p2.y+buffer, 3, colorControlPoint)
	drawCircle(screen, bezierConfig.p3.x+buffer, bezierConfig.p3.y+buffer, 3, colorControlPoint)
}

func drawLine(screen *ebiten.Image, x1, y1, x2, y2 float64, clr color.Color) {
	vector.StrokeLine(screen, float32(x1), float32(y1), float32(x2), float32(y2), 1, clr, false)
}

func drawCircle(screen *ebiten.Image, x, y, radius float64, clr color.Color) {
	vector.DrawFilledCircle(screen, float32(x), float32(y), float32(radius), clr, false)
}
