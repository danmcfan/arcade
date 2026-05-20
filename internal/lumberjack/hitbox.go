package lumberjack

import (
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
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

func Draw(screen *ebiten.Image, h Hitbox) {
	vector.FillRect(screen, float32(h.x), float32(h.y), float32(h.w), float32(h.h), color.RGBA{R: 255, G: 0, B: 0, A: 16}, true)
}
