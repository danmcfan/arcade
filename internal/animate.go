//go:build js

package internal

import (
	"fmt"
	"syscall/js"
)

const MS_PER_FRAME = 1000.0 / 60.0

func CreateAnimationHandler(g *Game) js.Func {
	var handleAnimation js.Func
	handleAnimation = js.FuncOf(func(this js.Value, args []js.Value) any {
		current := args[0].Float()
		elapsed := min(current-g.Previous, MS_PER_FRAME*5)

		g.Previous = current
		g.Lag += elapsed

		for g.Lag > MS_PER_FRAME {
			g.Update()
			g.Lag -= MS_PER_FRAME
		}

		g.Render()

		js.Global().Call("requestAnimationFrame", handleAnimation)
		return nil
	})
	return handleAnimation
}

func ClearScreen(ctx js.Value, width, height int) {
	ctx.Call("clearRect", 0, 0, width, height)
}

func ResetTransform(ctx js.Value) {
	ctx.Call("setTransform", 1, 0, 0, 1, 0, 0)
}

func ScaleScreen(ctx js.Value, scale int) {
	ctx.Call("scale", scale, scale)
}

func CenterScreen(ctx js.Value, scale, width, gameWidth int) {
	x := (width/scale - gameWidth) / 2
	ctx.Call("translate", x, 0)
}

func FadeScreen(ctx js.Value, width, height int, alpha float64) {
	ctx.Set("fillStyle", fmt.Sprintf("rgba(0, 0, 0, %f)", alpha))
	ctx.Call("fillRect", 0, 0, width, height)
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
