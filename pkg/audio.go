//go:build js

package internal

import (
	"syscall/js"
)

var SoundDeath = NewSound("death.mp3", 1.0)
var SoundMelody = NewSound("melody.mp3", 1.0)
var SoundPower = NewSound("power.mp3", 1.0)
var SoundStart = NewSound("start.mp3", 1.0)

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

	return s
}

func (s *Sound) Play() {
	s.Audio.Call("play")
}

func (s *Sound) Pause() {
	s.Audio.Call("pause")
	s.Audio.Set("currentTime", 0)
}
