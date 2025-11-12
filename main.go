//go:build js

package main

import (
	"log"
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

	state := &internal.State{
		Squares: internal.RandomSquares(SQUARES_COUNT),
	}

	handleResize(parent, canvas, state)
	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		handleResize(parent, canvas, state)
		return nil
	}))

	log.Println("starting game loop")

	loop := internal.CreateLoop(state)
	js.Global().Call("requestAnimationFrame", loop)

	log.Println("initialized")

	select {}
}

func handleResize(parent js.Value, canvas js.Value, state *internal.State) {
	width := parent.Get("clientWidth").Float()
	height := parent.Get("clientHeight").Float()

	log.Println("resizing to", width, "x", height)

	canvas.Set("width", width)
	canvas.Set("height", height)

	state.Width = width
	state.Height = height

	ctx := canvas.Call("getContext", "2d")
	if ctx.IsNull() {
		log.Println("failed to get context")
		return
	}

	state.Ctx = ctx
}
