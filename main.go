//go:build js

package main

import (
	"log"
	"syscall/js"

	"arcade/internal"
)

func main() {
	window := js.Global().Get("window")
	if window.IsNull() {
		log.Println("window is null")
		return
	}

	go func() {
		internal.Connect("ws://localhost:8080/ws", window)
	}()

	document := js.Global().Get("document")
	if document.IsNull() {
		log.Println("document is null")
		return
	}

	parent := document.Call("getElementById", "parent")
	if parent.IsNull() {
		log.Println("parent is null")
		return
	}

	canvas := document.Call("getElementById", "canvas")
	if canvas.IsNull() {
		log.Println("canvas is null")
		return
	}

	state := internal.NewState(window, document, parent, canvas)
	if state == nil {
		log.Println("state is nil")
		return
	}

	state.World = internal.NewWorld()

	internal.HandleResize(state)
	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		internal.HandleResize(state)
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
