package lumberjack

import (
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

var (
	colorRed    = color.RGBA{R: 255, G: 0, B: 0, A: 8}
	colorGreen  = color.RGBA{R: 0, G: 255, B: 0, A: 8}
	colorBlue   = color.RGBA{R: 0, G: 0, B: 255, A: 8}
	colorYellow = color.RGBA{R: 255, G: 255, B: 0, A: 8}
	colorPurple = color.RGBA{R: 255, G: 0, B: 255, A: 8}
	colorOrange = color.RGBA{R: 255, G: 128, B: 0, A: 8}
	colorPink   = color.RGBA{R: 255, G: 0, B: 180, A: 8}
	colorTeal   = color.RGBA{R: 0, G: 255, B: 220, A: 8}
)

type Hitbox struct {
	x, y, w, h float64
}

func NewHitbox(x, y, w, h float64) *Hitbox {
	return &Hitbox{x: x, y: y, w: w, h: h}
}

func Overlaps(a, b Hitbox) bool {
	return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y
}

func Resolve(src, dst Hitbox) (float64, float64) {
	overlapX := 0.0
	if src.x < dst.x {
		overlapX = (src.x + src.w) - dst.x // left side
	} else {
		overlapX = src.x - (dst.x + dst.w) // right side
	}

	overlapY := 0.0
	if src.y < dst.y {
		overlapY = (src.y + src.h) - dst.y // top side
	} else {
		overlapY = src.y - (dst.y + dst.h) // bottom side
	}

	if math.Abs(float64(overlapX)) < math.Abs(float64(overlapY)) {
		return -overlapX, 0.0
	} else {
		return 0.0, -overlapY
	}
}

func Draw(screen *ebiten.Image, h Hitbox, color color.Color) {
	vector.FillRect(screen, float32(h.x), float32(h.y), float32(h.w), float32(h.h), color, false)
}
