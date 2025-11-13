//go:build js

package internal

import (
	"log"
)

func render(s *State) {
	s.Ctx.Call("save")
	defer s.Ctx.Call("restore")

	s.Ctx.Call("scale", s.Scale, s.Scale)

	s.Ctx.Call("clearRect", 0, 0, s.Level.Width, s.Level.Height)

	if !s.LevelSprite.Ready {
		log.Println("level sprite is not ready")
		return
	}

	img := s.LevelSprite.Image
	sx := 0
	sy := 0
	sw := s.LevelSprite.Width
	sh := s.LevelSprite.Height
	dx := 0
	dy := 0
	dw := s.Level.Width
	dh := s.Level.Height

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)

	switch s.Level {
	case LevelArcade:
		renderTitle(s)
		renderEntity(s, s.Gamer)
	case LevelHive:
		renderEntity(s, s.Bear)
		for _, bee := range s.Bees {
			renderEntity(s, bee)
		}
	}
}

func renderTitle(s *State) {
	if !s.Title {
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
	dw := s.Level.Width
	dh := s.Level.Height

	s.Ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}

func renderEntity(s *State, e *Entity) {
	if !e.Sprite.Ready {
		log.Println("entity sprite is not ready")
		return
	}

	row := e.FrameDirection[e.Direction]

	img := e.Sprite.Image

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
