//go:build js

package internal

import (
	"log"
	"syscall/js"
)

type State struct {
	Ctx js.Value

	Width  float64
	Height float64
	Scale  int

	Previous int
	Lag      int

	Keys map[string]bool

	Level       Level
	LevelSprite *Sprite

	GamerEntity *Entity
}

type Level struct {
	Width  int
	Height int
}

func NewState(ctx js.Value, level Level, levelSprite *Sprite, gamerEntity *Entity) *State {
	if ctx.IsNull() {
		log.Println("context is null")
		return nil
	}

	if levelSprite == nil {
		log.Println("level sprite is nil")
		return nil
	}

	if gamerEntity == nil {
		log.Println("gamer entity is nil")
		return nil
	}

	return &State{
		Ctx:         ctx,
		Keys:        make(map[string]bool),
		Level:       level,
		LevelSprite: levelSprite,
		GamerEntity: gamerEntity,
	}
}
