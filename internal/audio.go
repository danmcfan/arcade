//go:build js

package internal

import (
	"syscall/js"
)

var SoundDeath = NewSound("death.mp3", 1.0)
var SoundMelody = NewSound("melody.mp3", 1.0)
var SoundPower = NewSound("power.mp3", 1.0)
var SoundStart = NewSound("start.mp3", 1.0)

var Sounds = []*Sound{
	SoundDeath,
	SoundMelody,
	SoundPower,
	SoundStart,
}

type Sound struct {
	Audio js.Value
	Ready bool
}

func NewSound(filename string, volume float64) *Sound {
	audio := js.Global().Get("Audio").New()
	audio.Set("src", "/assets/"+filename)
	audio.Set("volume", volume)

	s := &Sound{
		Audio: audio,
	}

	audio.Set("onload", js.FuncOf(func(this js.Value, args []js.Value) any {
		s.Ready = true
		return nil
	}))

	return s
}

func (s *Sound) Play() {
	for _, sound := range Sounds {
		if sound != s {
			sound.Stop()
		}
	}

	s.Audio.Call("play")
}

func (s *Sound) Stop() {
	s.Audio.Call("pause")
	s.Audio.Set("currentTime", 0)
}
