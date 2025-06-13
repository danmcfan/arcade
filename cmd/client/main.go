//go:build js

package main

import (
	"log"
	"time"

	"syscall/js"

	. "github.com/danmcfan/arcade/internal"
)

const MARGIN = 32

func main() {
	log.Println("Starting client...")

	document := js.Global().Get("document")
	window := js.Global().Get("window")

	root := document.Call("getElementById", "root")
	canvas := document.Call("getElementById", "canvas")
	ctx := canvas.Call("getContext", "2d")

	sprites := []*Sprite{
		CreateSprite("Bear.png", 32, 32),
		CreateSprite("Bee.png", 16, 16),
		CreateSprite("Buttons.png", 16, 16),
		CreateSprite("Food.png", 16, 16),
		CreateSprite("GrassMiddle.png", 16, 16),
		CreateSprite("GrassTiles.png", 16, 16),
		CreateSprite("GreenMachine.png", 16, 32),
		CreateSprite("InteriorWalls.png", 16, 16),
		CreateSprite("PathMiddle.png", 16, 16),
		CreateSprite("Player.png", 32, 32),
		CreateSprite("WoodFloorTiles.png", 16, 16),
	}
	game := NewGame(ctx, sprites)

	handleResize(window, canvas, game)
	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		handleResize(window, canvas, game)
		return nil
	}))

	allLoaded := isAllLoaded(sprites)
	for !allLoaded {
		time.Sleep(100 * time.Millisecond)
		allLoaded = isAllLoaded(sprites)
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

	animationHandler := CreateAnimationHandler(game, UpdateGame, DrawGame)
	window.Call("requestAnimationFrame", animationHandler)

	select {}
}

func handleResize(window js.Value, canvas js.Value, game *Game) {
	windowWidth := window.Get("innerWidth").Int()
	windowHeight := window.Get("innerHeight").Int()

	availableWidth := windowWidth - MARGIN*2
	availableHeight := windowHeight - MARGIN*2

	width := 3200
	height := 1800

	if width > availableWidth || height > availableHeight {
		scaleWidth := float64(availableWidth) / float64(width)
		scaleHeight := float64(availableHeight) / float64(height)

		scale := min(scaleWidth, scaleHeight)

		width = int(float64(width) * scale)
		height = int(float64(height) * scale)
	}

	canvas.Set("width", width)
	canvas.Set("height", height)

	game.Width = width
	game.Height = height

	devicePixelRatio := max(window.Get("devicePixelRatio").Float(), 1.0)
	game.Ctx.Set("imageSmoothingEnabled", false)
	game.Ctx.Call("scale", devicePixelRatio, devicePixelRatio)
}

func isAllLoaded(imageAssets []*Sprite) bool {
	for _, imageAsset := range imageAssets {
		if !imageAsset.IsLoaded {
			return false
		}
	}
	return true
}
