//go:build js

package internal

import (
	"log"
	"math"
)

func HandleResize(s *State) {
	p := s.Parent
	pw := p.Get("clientWidth").Float()
	ph := p.Get("clientHeight").Float()

	lw := s.Level.Width
	lh := s.Level.Height

	sw := pw / float64(lw)
	sh := ph / float64(lh)
	s.Scale = int(math.Min(sw, sh))

	w := int(lw * s.Scale)
	h := int(lh * s.Scale)

	s.Canvas.Set("width", w)
	s.Canvas.Set("height", h)

	s.Width = float64(w)
	s.Height = float64(h)

	ctx := s.Canvas.Call("getContext", "2d")
	if ctx.IsNull() {
		log.Println("failed to get context")
		return
	}

	ctx.Set("imageSmoothingEnabled", false)

	s.Ctx = ctx
}
