//go:build js

package main

import (
	"log"
	"time"

	"syscall/js"

	. "github.com/danmcfan/arcade/internal"
)

func main() {
	log.Println("Starting client...")

	location := js.Global().Get("location")
	hostname := location.Get("hostname").String()

	if hostname == "localhost" {
		go RefreshOnDisconnect()
	}

	document := js.Global().Get("document")
	window := js.Global().Get("window")

	root := document.Call("getElementById", "root")
	canvas := document.Call("getElementById", "canvas")
	ctx := canvas.Call("getContext", "2d")

	sprites := []*Sprite{
		NewSprite("Bear.png", 32, 32),
		NewSprite("Bee.png", 16, 16),
		NewSprite("Buttons.png", 16, 16),
		NewSprite("Food.png", 16, 16),
		NewSprite("GrassMiddle.png", 16, 16),
		NewSprite("GrassTiles.png", 16, 16),
		NewSprite("GreenMachine.png", 16, 32),
		NewSprite("InteriorWalls.png", 16, 16),
		NewSprite("PathMiddle.png", 16, 16),
		NewSprite("Player.png", 32, 32),
		NewSprite("WoodFloorTiles.png", 16, 16),
	}

	audioPlayer := NewAudioPlayer()
	game := NewGame(ctx, sprites, audioPlayer)

	HandleResize(window, canvas, game)
	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		HandleResize(window, canvas, game)
		return nil
	}))

	allLoaded := AllSpritesLoaded(sprites)
	for !allLoaded {
		time.Sleep(100 * time.Millisecond)
		allLoaded = AllSpritesLoaded(sprites)
	}

	rootClassList := root.Get("classList")
	rootClassList.Call("remove", "hidden")

	window.Call("addEventListener", "keydown", js.FuncOf(func(this js.Value, args []js.Value) any {
		event := args[0]
		code := event.Get("code").String()
		game.Keys.Add(code)
		return nil
	}))

	window.Call("addEventListener", "keyup", js.FuncOf(func(this js.Value, args []js.Value) any {
		event := args[0]
		code := event.Get("code").String()
		game.Keys.Delete(code)
		return nil
	}))

	animationHandler := CreateAnimationHandler(game)
	window.Call("requestAnimationFrame", animationHandler)

	select {}
}
