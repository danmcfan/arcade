//go:build !js

package assets

import (
	"bytes"
	"io"
	"log"
	"path/filepath"

	"github.com/hajimehoshi/ebiten/v2/audio"
	"github.com/hajimehoshi/ebiten/v2/audio/vorbis"
	"github.com/hajimehoshi/ebiten/v2/audio/wav"
)

type Sound struct {
	Player *audio.Player
}

func loadSound(filename string, loop bool) *Sound {
	data, err := sounds.ReadFile("sounds/" + filename)
	if err != nil {
		log.Fatal(err)
	}

	// Decode based on file extension
	var stream io.ReadSeeker
	var length int64
	ext := filepath.Ext(filename)

	switch ext {
	case ".ogg":
		s, err := vorbis.DecodeWithoutResampling(bytes.NewReader(data))
		if err != nil {
			log.Fatal(err)
		}
		// Check if resampling is needed
		if s.SampleRate() != sampleRate {
			s, err = vorbis.DecodeWithSampleRate(sampleRate, bytes.NewReader(data))
			if err != nil {
				log.Fatal(err)
			}
		}
		stream = s
		length = s.Length()
	case ".wav":
		s, err := wav.DecodeWithoutResampling(bytes.NewReader(data))
		if err != nil {
			log.Fatal(err)
		}
		// Check if resampling is needed
		if s.SampleRate() != sampleRate {
			s, err = wav.DecodeWithSampleRate(sampleRate, bytes.NewReader(data))
			if err != nil {
				log.Fatal(err)
			}
		}
		stream = s
		length = s.Length()
	default:
		log.Fatalf("Unsupported audio format: %s", ext)
	}

	// Handle looping
	if loop {
		player, err := audioContext.NewPlayer(audio.NewInfiniteLoop(stream, length))
		if err != nil {
			log.Fatal(err)
		}
		return &Sound{Player: player}
	}

	player, err := audioContext.NewPlayer(stream)
	if err != nil {
		log.Fatal(err)
	}
	return &Sound{Player: player}
}

func (s *Sound) Play() {
	s.Player.Play()
}

func (s *Sound) Pause() {
	s.Player.Pause()
}

func (s *Sound) Rewind() {
	s.Player.Rewind()
}
