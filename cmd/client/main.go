//go:build js

package main

import (
	"log"
	"time"

	"syscall/js"

	"github.com/danmcfan/arcade/internal"
)

const MARGIN = 32

type Screen struct {
	Width  int
	Height int
}

func main() {
	log.Println("Starting client...")

	imageAssets := []*internal.Sprite{
		internal.CreateSprite("Bear.png", 32, 32),
		internal.CreateSprite("Bee.png", 16, 16),
		internal.CreateSprite("Buttons.png", 16, 16),
		internal.CreateSprite("Food.png", 16, 16),
		internal.CreateSprite("GrassMiddle.png", 16, 16),
		internal.CreateSprite("GrassTiles.png", 16, 16),
		internal.CreateSprite("GreenMachine.png", 16, 32),
		internal.CreateSprite("InteriorWalls.png", 16, 16),
		internal.CreateSprite("PathMiddle.png", 16, 16),
		internal.CreateSprite("Player.png", 32, 32),
		internal.CreateSprite("WoodFloorTiles.png", 16, 16),
	}

	document := js.Global().Get("document")
	window := js.Global().Get("window")

	root := document.Call("getElementById", "root")
	canvas := document.Call("getElementById", "canvas")
	ctx := canvas.Call("getContext", "2d")

	handleResize(window, canvas, ctx)

	window.Call("addEventListener", "resize", js.FuncOf(func(this js.Value, args []js.Value) any {
		handleResize(window, canvas, ctx)
		return nil
	}))

	allLoaded := isAllLoaded(imageAssets)
	for !allLoaded {
		time.Sleep(100 * time.Millisecond)
		allLoaded = isAllLoaded(imageAssets)
	}

	rootClassList := root.Get("classList")
	rootClassList.Call("remove", "hidden")

	select {}
}

func handleResize(window js.Value, canvas js.Value, ctx js.Value) {
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
	ctx.Set("fillStyle", "red")
	ctx.Call("fillRect", 0, 0, width, height)
}

func isAllLoaded(imageAssets []*internal.Sprite) bool {
	for _, imageAsset := range imageAssets {
		if !imageAsset.IsLoaded {
			return false
		}
	}
	return true
}
