//go:build js

package assets

import (
	"log"
	"strings"
	"syscall/js"
)

type Sound struct {
	Audio js.Value
	Ready bool
	// Name is the file name without extension ("melody", "laser", ...), used
	// for OnSoundEvent.
	Name string
}

func loadSound(filename string, loop bool) *Sound {
	data, err := sounds.ReadFile("sounds/" + filename)
	if err != nil {
		log.Fatal(err)
	}

	uint8Array := js.Global().Get("Uint8Array").New(len(data))
	js.CopyBytesToJS(uint8Array, data)

	array := js.Global().Get("Array").New(uint8Array)
	blobOptions := js.Global().Get("Object").New()

	var mimeType string
	if strings.HasSuffix(filename, ".ogg") {
		mimeType = "audio/ogg"
	} else if strings.HasSuffix(filename, ".wav") {
		mimeType = "audio/wav"
	} else {
		log.Fatal("Unsupported audio format: " + filename)
	}

	blobOptions.Set("type", mimeType)
	blob := js.Global().Get("Blob").New(array, blobOptions)

	url := js.Global().Get("URL").Call("createObjectURL", blob)

	audio := js.Global().Get("Audio").New()
	audio.Set("src", url)
	audio.Set("loop", loop)

	s := &Sound{Audio: audio, Name: soundName(filename)}

	audio.Call("addEventListener", "canplaythrough", js.FuncOf(func(this js.Value, args []js.Value) any {
		s.Ready = true
		return nil
	}))

	return s
}

func (s *Sound) Play() {
	emitSoundEvent("play", s.Name)
	if !s.Ready {
		return
	}
	s.Audio.Call("play")
}

func (s *Sound) Pause() {
	emitSoundEvent("pause", s.Name)
	if !s.Ready {
		return
	}
	s.Audio.Call("pause")
}

func (s *Sound) Rewind() {
	emitSoundEvent("rewind", s.Name)
	if !s.Ready {
		return
	}
	s.Audio.Set("currentTime", 0)
}
