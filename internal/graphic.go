//go:build js

package internal

import (
	"math"
	"syscall/js"
)

type Graphic struct {
	Sprite         *Sprite
	Frame          float64
	FrameIncrement float64
	FrameTotal     float64
	FrameDirection map[Direction]int
	Radius         float64
}

func (g *Graphic) Update(v Vector) {
	if v.Velocity == 0 {
		g.Frame = 0
		return
	}
	g.Frame += g.FrameIncrement
	g.Frame = math.Mod(g.Frame, g.FrameTotal)
}

func Render(ctx js.Value, v Vector, g Graphic) {
	if g.Sprite == nil {
		return
	}

	if !g.Sprite.Ready {
		return
	}

	row := g.FrameDirection[v.Direction]

	img := g.Sprite.Image

	sx := g.Sprite.Width * int(g.Frame)
	sy := g.Sprite.Height * row
	sw := g.Sprite.Width
	sh := g.Sprite.Height

	dx := v.X - v.OffsetX
	dy := v.Y - v.OffsetY
	dw := g.Sprite.Width
	dh := g.Sprite.Height

	ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}

func GraphicSystem(w *World) {
	for i := range MaxEntities {
		v := w.Vectors[i]
		g := w.Graphics[i]
		g.Update(v)
		w.Graphics[i] = g
	}
}
