//go:build js

package internal

import (
	"log"
	"syscall/js"
)

func render(state *State) {
	ctx := state.Ctx

	ctx.Call("save")
	defer ctx.Call("restore")

	ctx.Call("scale", state.Scale, state.Scale)

	ctx.Call("clearRect", 0, 0, state.Level.Width, state.Level.Height)

	if !state.LevelSprite.Ready {
		log.Println("level sprite is not ready")
		return
	}

	img := *state.LevelSprite.Image
	sx := 0
	sy := 0
	sw := state.LevelSprite.Width
	sh := state.LevelSprite.Height
	dx := 0
	dy := 0
	dw := state.Level.Width
	dh := state.Level.Height

	ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)

	renderEntity(ctx, state.GamerEntity)
}

func renderEntity(ctx js.Value, e *Entity) {
	if !e.Sprite.Ready {
		log.Println("entity sprite is not ready")
		return
	}

	row := e.FrameDirection[e.Direction]

	img := *e.Sprite.Image

	sx := e.Sprite.Width * int(e.Frame)
	sy := e.Sprite.Height * row
	sw := e.Sprite.Width
	sh := e.Sprite.Height

	dx := e.X - e.OffsetX
	dy := e.Y - e.OffsetY
	dw := e.Sprite.Width
	dh := e.Sprite.Height

	ctx.Call("drawImage", img, sx, sy, sw, sh, dx, dy, dw, dh)
}
