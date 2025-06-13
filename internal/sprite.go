//go:build js

package internal

import (
	"fmt"
	"syscall/js"
)

type Sprite struct {
	Filename string
	Image    js.Value
	IsLoaded bool
	Width    int
	Height   int
	Rows     int
	Cols     int
	Total    int
}

func CreateSprite(filename string, width int, height int) *Sprite {
	image := js.Global().Get("Image").New()
	image.Set("src", fmt.Sprintf("/images/%s", filename))

	imageAsset := &Sprite{
		Filename: filename,
		IsLoaded: false,
		Image:    image,
		Width:    width,
		Height:   height,
	}
	image.Call("addEventListener", "load", js.FuncOf(func(this js.Value, args []js.Value) any {
		imageAsset.IsLoaded = true
		imageAsset.Rows = imageAsset.Image.Get("height").Int() / imageAsset.Height
		imageAsset.Cols = imageAsset.Image.Get("width").Int() / imageAsset.Width
		imageAsset.Total = imageAsset.Rows * imageAsset.Cols
		return nil
	}))
	return imageAsset
}
