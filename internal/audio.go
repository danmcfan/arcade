//go:build js

package internal

import (
	"fmt"
	"log"
	"syscall/js"
	"time"
)

type Sound string

const (
	SoundArcade   Sound = "Arcade"
	SoundFootstep Sound = "Footstep"
)

type AudioPlayer struct {
	elements   map[Sound]js.Value
	timestamps map[Sound]time.Time
	durations  map[Sound]time.Duration
}

func NewAudioPlayer() *AudioPlayer {
	ap := &AudioPlayer{
		elements:   make(map[Sound]js.Value),
		timestamps: make(map[Sound]time.Time),
		durations:  make(map[Sound]time.Duration),
	}

	ap.loadFile(SoundArcade, 0.40, time.Duration(1250)*time.Millisecond)
	ap.loadFile(SoundFootstep, 0.25, time.Duration(1250)*time.Millisecond)

	return ap
}

func (ap *AudioPlayer) loadFile(s Sound, volume float64, duration time.Duration) {
	audio := js.Global().Get("Audio").New()
	audio.Set("src", fmt.Sprintf("/audio/%s.mp3", s))
	audio.Set("preload", "auto")
	audio.Set("volume", volume)

	ap.elements[s] = audio
	ap.timestamps[s] = time.Now().Add(-duration)
	ap.durations[s] = duration
}

func (ap *AudioPlayer) Play(s Sound) {
	element, ok := ap.elements[s]
	if !ok {
		log.Println("Audio element not found:", s)
		return
	}
	if element.IsUndefined() {
		log.Println("Audio element is undefined:", s)
		return
	}

	// Track when the last footstep was played to prevent overlapping
	now := time.Now()
	timestamp := ap.timestamps[s]
	duration := ap.durations[s]
	if now.Sub(timestamp) < duration {
		return
	}
	ap.timestamps[s] = now

	element.Set("currentTime", 0)
	element.Call("play")
}

func (ap *AudioPlayer) Pause(s Sound) {
	ap.timestamps[s] = time.Now().Add(-ap.durations[s])
	element, ok := ap.elements[s]
	if !ok {
		log.Println("Audio element not found:", s)
		return
	}
	element.Call("pause")
	element.Set("currentTime", 0)
}

func (ap *AudioPlayer) PauseAll() {
	for _, element := range ap.elements {
		element.Call("pause")
		element.Set("currentTime", 0)
	}
}
