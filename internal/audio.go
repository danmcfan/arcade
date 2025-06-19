//go:build js

package internal

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"syscall/js"
	"time"
)

type Sound string

const (
	SoundArcade   Sound = "Arcade"
	SoundFootstep Sound = "Footstep"
)

type AudioPlayer struct {
	ctx        js.Value
	buffers    map[Sound]js.Value
	sources    map[Sound]js.Value
	timestamps map[Sound]time.Time
	durations  map[Sound]time.Duration
}

func NewAudioPlayer() *AudioPlayer {
	ctx := js.Global().Get("AudioContext").New()
	ap := &AudioPlayer{
		ctx:        ctx,
		buffers:    make(map[Sound]js.Value),
		sources:    make(map[Sound]js.Value),
		timestamps: make(map[Sound]time.Time),
		durations:  make(map[Sound]time.Duration),
	}

	ap.loadFile(SoundArcade, time.Duration(1250)*time.Millisecond)
	ap.loadFile(SoundFootstep, time.Duration(1250)*time.Millisecond)

	return ap
}

func (ap *AudioPlayer) loadFile(s Sound, duration time.Duration) {
	go func() { // Run in goroutine to avoid blocking
		resp, err := http.Get(fmt.Sprintf("/audio/%s.mp3", s))
		if err != nil {
			log.Println("HTTP error:", err.Error())
			return
		}
		defer resp.Body.Close()

		// Read response body
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Println("Read error:", err.Error())
			return
		}

		// Convert Go []byte to JS ArrayBuffer
		uint8Array := js.Global().Get("Uint8Array").New(len(data))
		js.CopyBytesToJS(uint8Array, data)
		arrayBuffer := uint8Array.Get("buffer")

		// Decode audio data (must be called on main thread)
		ap.ctx.Call("decodeAudioData", arrayBuffer).Call("then",
			js.FuncOf(func(this js.Value, args []js.Value) any {
				ap.buffers[s] = args[0]
				return nil
			}))

		ap.timestamps[s] = time.Now().Add(-duration)
		ap.durations[s] = duration
	}()
}
func (ap *AudioPlayer) Play(s Sound) {
	buffer, ok := ap.buffers[s]
	if !ok {
		log.Println("Buffer not found:", s)
		return
	}

	if buffer.IsUndefined() {
		log.Println("Buffer is undefined:", s)
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

	// Stop existing source if it exists
	source, ok := ap.sources[s]
	if ok {
		source.Call("stop")
	}

	// Always create a new source since you can't call start() more than once
	source = ap.ctx.Call("createBufferSource")
	source.Set("buffer", buffer)
	ap.sources[s] = source

	source.Call("connect", ap.ctx.Get("destination"))
	source.Call("start")
}

func (ap *AudioPlayer) Pause(s Sound) {
	ap.timestamps[s] = time.Now().Add(-ap.durations[s])
	source, ok := ap.sources[s]
	if ok {
		source.Call("stop")
	}
}
