//go:build js

package internal

import (
	"syscall/js"
)

type Box struct {
	X int
	Y int
	W int
	H int
}

func CreateAnimationHandler(g *Game, update GameFunc, draw GameFunc) js.Func {
	var handleAnimation js.Func
	handleAnimation = js.FuncOf(func(this js.Value, args []js.Value) any {
		timestampCurrent := args[0].Float()

		g.TimestampDelta = min(timestampCurrent-g.TimestampPrevious, 15.0)
		g.TimestampPrevious = timestampCurrent

		update(g)
		draw(g)

		js.Global().Call("requestAnimationFrame", handleAnimation)
		return nil
	})
	return handleAnimation
}

func ClearScreen(ctx js.Value, width int, height int) {
	ctx.Call("clearRect", 0, 0, width, height)
}

func DrawImage(ctx js.Value, image js.Value, sb Box, db Box, flip bool) {
	dx := db.X
	if flip {
		ctx.Call("scale", -1, 1)
		dx = -db.X - db.W
	}
	ctx.Call("drawImage", image, sb.X, sb.Y, sb.W, sb.H, dx, db.Y, db.W, db.H)
	if flip {
		ctx.Call("scale", -1, 1)
	}
}
