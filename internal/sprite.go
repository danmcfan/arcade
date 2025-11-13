//go:build js

package internal

import "syscall/js"

var SpriteArcade = NewSprite("arcade.png", 160, 144)
var SpriteBear = NewSprite("bear.png", 16, 16)
var SpriteBee = NewSprite("bee.png", 16, 16)
var SpriteDigits = NewSprite("digits.png", 8, 8)
var SpriteFood = NewSprite("food.png", 8, 8)
var SpriteGamer = NewSprite("gamer.png", 16, 24)
var SpriteHive = NewSprite("hive.png", 224, 288)
var SpriteReady = NewSprite("ready.png", 48, 8)
var SpriteSweetSamTitle = NewSprite("sweet-sam-title.png", 160, 144)

type Sprite struct {
	Image  js.Value
	Width  int
	Height int
	Ready  bool
}

func NewSprite(filename string, width int, height int) *Sprite {
	image := js.Global().Get("Image").New()
	image.Set("src", "/assets/"+filename)

	s := &Sprite{
		Image:  image,
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
