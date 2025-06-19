//go:build js

package internal

import (
	"fmt"
	"syscall/js"
)

type Sprite string

const (
	SpriteBear           Sprite = "Bear"
	SpriteBee            Sprite = "Bee"
	SpriteButtons        Sprite = "Buttons"
	SpriteFood           Sprite = "Food"
	SpriteGrassMiddle    Sprite = "GrassMiddle"
	SpriteGrassTiles     Sprite = "GrassTiles"
	SpriteGreenMachine   Sprite = "GreenMachine"
	SpriteInteriorWalls  Sprite = "InteriorWalls"
	SpritePathMiddle     Sprite = "PathMiddle"
	SpritePlayer         Sprite = "Player"
	SpriteWoodFloorTiles Sprite = "WoodFloorTiles"
)

type SpriteManager struct {
	sprites map[Sprite]*SpriteSheet
}

func NewSpriteManager() *SpriteManager {
	sm := &SpriteManager{
		sprites: make(map[Sprite]*SpriteSheet),
	}

	sm.sprites[SpriteBear] = NewSpriteSheet(SpriteBear, 32, 32)
	sm.sprites[SpriteBee] = NewSpriteSheet(SpriteBee, 16, 16)
	sm.sprites[SpriteButtons] = NewSpriteSheet(SpriteButtons, 16, 16)
	sm.sprites[SpriteFood] = NewSpriteSheet(SpriteFood, 16, 16)
	sm.sprites[SpriteGrassMiddle] = NewSpriteSheet(SpriteGrassMiddle, 16, 16)
	sm.sprites[SpriteGrassTiles] = NewSpriteSheet(SpriteGrassTiles, 16, 16)
	sm.sprites[SpriteGreenMachine] = NewSpriteSheet(SpriteGreenMachine, 16, 32)
	sm.sprites[SpriteInteriorWalls] = NewSpriteSheet(SpriteInteriorWalls, 16, 16)
	sm.sprites[SpritePathMiddle] = NewSpriteSheet(SpritePathMiddle, 16, 16)
	sm.sprites[SpritePlayer] = NewSpriteSheet(SpritePlayer, 32, 32)
	sm.sprites[SpriteWoodFloorTiles] = NewSpriteSheet(SpriteWoodFloorTiles, 16, 16)

	return sm
}

func (sm *SpriteManager) AllLoaded() bool {
	for _, ss := range sm.sprites {
		if !ss.IsLoaded {
			return false
		}
	}
	return true
}

func (sm *SpriteManager) GetSpriteSheet(sprite Sprite) *SpriteSheet {
	return sm.sprites[sprite]
}

type SpriteSheet struct {
	Filename string
	Image    js.Value
	IsLoaded bool
	Width    int
	Height   int
	Rows     int
	Cols     int
	Total    int
}

func NewSpriteSheet(sprite Sprite, width int, height int) *SpriteSheet {
	filename := fmt.Sprintf("/image/%s.png", sprite)

	image := js.Global().Get("Image").New()
	image.Set("src", filename)

	ss := &SpriteSheet{
		Filename: filename,
		IsLoaded: false,
		Image:    image,
		Width:    width,
		Height:   height,
	}

	image.Call("addEventListener", "load", js.FuncOf(func(this js.Value, args []js.Value) any {
		ss.IsLoaded = true
		ss.Rows = ss.Image.Get("height").Int() / ss.Height
		ss.Cols = ss.Image.Get("width").Int() / ss.Width
		ss.Total = ss.Rows * ss.Cols
		return nil
	}))

	return ss
}
