//go:build js

package main

import (
	"log"
	"math"
	"syscall/js"

	"arcade/internal"
)

const (
	SQUARES_COUNT = 10_000
)

func main() {
	window := js.Global().Get("window")
	document := js.Global().Get("document")

	parent := document.Call("getElementById", "parent")
	if parent.IsNull() {
		log.Println("failed to get parent")
		return
	}

	canvas := document.Call("getElementById", "canvas")
	if canvas.IsNull() {
		log.Println("failed to get canvas")
		return
	}

	level := internal.Level{
		Width:  160,
		Height: 144,
	}
	levelSprite := internal.NewSprite("arcade.png", level.Width, level.Height)
	gamerSprite := internal.NewSprite("gamer.png", 16, 24)
	gamer := internal.NewEntity(gamerSprite)
	gamer.X = 80
	gamer.Y = 92
	gamer.OffsetX = 8
	gamer.OffsetY = 16
	gamer.Velocity = 1.0
	gamer.FrameDirection = map[internal.Direction]int{
		internal.DirectionUp:    0,
		internal.DirectionDown:  1,
		internal.DirectionLeft:  2,
		internal.DirectionRight: 3,
	}

	state := internal.NewState(canvas, level, levelSprite, gamer)
	if state == nil {
		log.Println("state is nil")
		return
	}

	handleResize(parent, canvas, state)
	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		handleResize(parent, canvas, state)
		return nil
	}))

	window.Call("addEventListener", "keydown", js.FuncOf(func(this js.Value, args []js.Value) any {
		key := args[0].Get("code").String()
		state.Keys[key] = true
		return nil
	}))
	window.Call("addEventListener", "keyup", js.FuncOf(func(this js.Value, args []js.Value) any {
		key := args[0].Get("code").String()
		delete(state.Keys, key)
		return nil
	}))

	log.Println("starting game loop")

	loop := internal.CreateLoop(state)
	js.Global().Call("requestAnimationFrame", loop)

	log.Println("initialized")

	select {}
}

func handleResize(parent js.Value, canvas js.Value, state *internal.State) {
	parentWidth := parent.Get("clientWidth").Float()
	parentHeight := parent.Get("clientHeight").Float()

	scaleWidth := parentWidth / float64(state.Level.Width)
	scaleHeight := parentHeight / float64(state.Level.Height)
	state.Scale = int(math.Min(scaleWidth, scaleHeight))

	width := int(state.Level.Width * state.Scale)
	height := int(state.Level.Height * state.Scale)

	canvas.Set("width", width)
	canvas.Set("height", height)

	state.Width = float64(width)
	state.Height = float64(height)

	ctx := canvas.Call("getContext", "2d")
	if ctx.IsNull() {
		log.Println("failed to get context")
		return
	}

	ctx.Set("imageSmoothingEnabled", false)

	state.Ctx = ctx
}
