//go:build js

package internal

import (
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

		graphic := g.Graphics[g.Player]
		if graphic.Moving {
			g.AudioPlayer.Play(SoundFootstep)
		} else {
			g.AudioPlayer.Pause(SoundFootstep)
		}

		machinePlaying := false
		for _, machine := range g.Machines {
			graphic := g.Graphics[machine]
			if graphic.Moving {
				machinePlaying = true
				break
			}
		}

		if machinePlaying {
			g.AudioPlayer.Play(SoundArcade)
		} else {
			g.AudioPlayer.Pause(SoundArcade)
		}

		g.Draw()

		js.Global().Call("requestAnimationFrame", handleAnimation)
		return nil
	})
	return handleAnimation
}

func ClearScreen(ctx js.Value, width int, height int) {
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
