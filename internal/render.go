//go:build js

package internal

import (
	"log"
	"math"
)

const Debug = false

func render(s *State) {
	s.Ctx.Call("save")
	defer s.Ctx.Call("restore")

	s.Ctx.Call("scale", s.Scale, s.Scale)

	s.Ctx.Call("clearRect", 0, 0, s.Game.Width(), s.Game.Height())

	sprite := s.Game.Sprite()
	if !sprite.Ready {
		log.Println("level sprite is not ready")
		return
	}

	img := sprite.Image
	sx := 0
	sy := 0
	sw := sprite.Width
	sh := sprite.Height
	dx := 0
	dy := 0
	dw := s.Game.Width()
	dh := s.Game.Height()

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)

	if s.Game == nil {
		return
	}
	s.Game.Render(s)
}

func renderTitle(s *State) {
	if !s.World.MachineActive {
		return
	}

	if !SpriteSweetSamTitle.Ready {
		log.Println("title sprite is not ready")
		return
	}

	img := SpriteSweetSamTitle.Image
	sx := 0
	sy := 0
	sw := SpriteSweetSamTitle.Width
	sh := SpriteSweetSamTitle.Height
	dx := 0
	dy := 0
	dw := s.Game.Width()
	dh := s.Game.Height()

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}

func renderEntity(s *State, e *Entity) {
	if e == nil {
		return
	}

	if !e.Sprite.Ready {
		log.Println("entity sprite is not ready")
		return
	}

	row := e.FrameDirection[e.Direction]

	img := e.Sprite.Image

	if e.BlueFrames > 0 {
		row += 2
		if e.Flash {
			row += 2
		}
	}

	sx := e.Sprite.Width * int(e.Frame)
	sy := e.Sprite.Height * row
	sw := e.Sprite.Width
	sh := e.Sprite.Height

	dx := e.X - e.OffsetX
	dy := e.Y - e.OffsetY
	dw := e.Sprite.Width
	dh := e.Sprite.Height

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}

func renderCorner(s *State, e *Entity) {
	if !Debug {
		return
	}

	s.Ctx.Set("fillStyle", "white")
	s.Ctx.Set("strokeStyle", "white")
	s.Ctx.Set("lineWidth", 1)
	s.Ctx.Call("beginPath")
	s.Ctx.Call("arc", e.X, e.Y, e.Radius, 0, math.Pi*2)
	s.Ctx.Call("fill")
	s.Ctx.Call("stroke")

	for _, d := range e.Directions {
		dx, dy := e.X, e.Y
		switch d {
		case DirectionUp:
			dy -= 4
		case DirectionDown:
			dy += 4
		case DirectionLeft:
			dx -= 4
		case DirectionRight:
			dx += 4
		}

		s.Ctx.Call("beginPath")
		s.Ctx.Call("moveTo", e.X, e.Y)
		s.Ctx.Call("lineTo", dx, dy)
		s.Ctx.Call("fill")
		s.Ctx.Call("stroke")
	}
}

func renderReady(s *State) {
	if !SpriteReady.Ready {
		log.Println("ready sprite is not ready")
		return
	}

	img := SpriteReady.Image
	sx := 0
	sy := 0
	sw := SpriteReady.Width
	sh := SpriteReady.Height
	dx := 8 * 11
	dy := 8 * 20
	dw := SpriteReady.Width
	dh := SpriteReady.Height

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}

func renderLives(s *State) {
	if !SpriteBear.Ready {
		log.Println("bear sprite is not ready")
		return
	}

	for i := range s.Lives - 1 {
		img := SpriteBear.Image
		sx := 0
		sy := 0
		sw := SpriteBear.Width
		sh := SpriteBear.Height
		dx := 8 * (2 + i*2)
		dy := (8 * 34) + 1
		dw := SpriteBear.Width
		dh := SpriteBear.Height

		s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
	}
}

func renderScore(s *State) {
	renderInteger(s, s.Score, 1, 1)
}

func renderHighScore(s *State) {
	highScore := int(math.Max(float64(s.Score), float64(s.HighScore)))
	renderInteger(s, highScore, 11, 1)
}

func renderInteger(s *State, value int, tx int, ty int) {
	if !SpriteDigits.Ready {
		log.Println("digits sprite is not ready")
		return
	}

	digits := []int{value / 100_000, (value % 100_000) / 10_000, (value % 10_000) / 1_000, (value % 1_000) / 100, (value % 100) / 10, value % 10}
	leadingZero := true
	for i, digit := range digits {
		if i >= len(digits)-2 {
			leadingZero = false
		}

		if digit == 0 && leadingZero {
			continue
		}

		if digit != 0 {
			leadingZero = false
		}

		img := SpriteDigits.Image

		sx := digit * SpriteDigits.Width
		sy := 0
		sw := SpriteDigits.Width
		sh := SpriteDigits.Height

		dx := 8 * (tx + i)
		dy := 8 * ty
		dw := SpriteDigits.Width
		dh := SpriteDigits.Height

		s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
	}
}
