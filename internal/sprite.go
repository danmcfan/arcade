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

func NewSprite(filename string, width int, height int) *Sprite {
	image := js.Global().Get("Image").New()
	image.Set("src", fmt.Sprintf("/image/%s", filename))

	sprite := &Sprite{
		Filename: filename,
		IsLoaded: false,
		Image:    image,
		Width:    width,
		Height:   height,
	}
	image.Call("addEventListener", "load", js.FuncOf(func(this js.Value, args []js.Value) any {
		sprite.IsLoaded = true
		sprite.Rows = sprite.Image.Get("height").Int() / sprite.Height
		sprite.Cols = sprite.Image.Get("width").Int() / sprite.Width
		sprite.Total = sprite.Rows * sprite.Cols
		return nil
	}))
	return sprite
}

func AllSpritesLoaded(sprites []*Sprite) bool {
	for _, sprite := range sprites {
		if !sprite.IsLoaded {
			return false
		}
	}
	return true
}
