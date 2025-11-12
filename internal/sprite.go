//go:build js

package internal

import "syscall/js"

type Sprite struct {
	Image  *js.Value
	Width  int
	Height int
	Ready  bool
}

func NewSprite(filename string, width int, height int) *Sprite {
	image := js.Global().Get("Image").New()
	image.Set("src", "/assets/"+filename)

	s := &Sprite{
		Image:  &image,
		Width:  width,
		Height: height,
		Ready:  false,
	}

	image.Set("onload", js.FuncOf(func(this js.Value, args []js.Value) any {
		s.Ready = true
		return nil
	}))

	return s
}
