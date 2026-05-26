package debug

import (
	_ "embed"
	"image/color"

	"github.com/danmcfan/arcade/internal/arcade"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
)

type Panel struct {
	enabled bool
	x       float64 // X position where panel starts (relative)
	y       float64 // Y position where panel starts
	width   float64
}

// Width returns the panel width (exported for layout calculations)
func (dp *Panel) Width() float64 {
	return dp.width
}

// NewDebugPanel creates a new debug panel
func NewDebugPanel(x, y, width float64) *Panel {
	return &Panel{
		enabled: true,
		x:       x,
		y:       y,
		width:   width,
	}
}

// Draw renders the debug panel with game state information
func (dp *Panel) Draw(screen *ebiten.Image, arcade *arcade.State, gameWidth, gameHeight float64) {
	if !dp.enabled {
		return
	}

	// Calculate panel position (right side of the game area)
	panelX := gameWidth

	// Background for the debug panel - match game height
	panelBg := ebiten.NewImage(int(dp.width), int(gameHeight))
	panelBg.Fill(color.RGBA{R: 20, G: 20, B: 20, A: 200})

	opts := &ebiten.DrawImageOptions{}
	opts.GeoM.Translate(panelX, dp.y)
	screen.DrawImage(panelBg, opts)

	// Prepare debug info text
	lines := arcade.DebugInfo()

	// Draw each line of text
	// ebitenutil.DebugPrint uses a font that's about 8 pixels tall with 8 pixels line height
	lineHeight := 12.0 // Adjusted line height for built-in font
	padding := 8.0

	for i, line := range lines {
		yPos := dp.y + padding + float64(i)*lineHeight
		ebitenutil.DebugPrintAt(screen, line, int(panelX+padding), int(yPos))
	}
}

// Toggle enables or disables the debug panel
func (dp *Panel) Toggle() {
	dp.enabled = !dp.enabled
}

// IsEnabled returns whether the panel is currently enabled
func (dp *Panel) IsEnabled() bool {
	return dp.enabled
}
