package arcade

import "github.com/danmcfan/arcade/internal/assets"

// Golden-harness snapshot (read-only). JSON keys follow ArcadeSnapshot in
// src/game/snapshot.ts.

type PlayerSnapshot struct {
	X     float64   `json:"x"`
	Y     float64   `json:"y"`
	Dir   Direction `json:"dir"`
	Frame float64   `json:"frame"`
}

type Snapshot struct {
	Player        PlayerSnapshot `json:"player"`
	MelodyPlaying bool           `json:"melodyPlaying"`
	Title         *string        `json:"title"`
	HighScore     int            `json:"highScore"`
}

func (s *State) Snapshot() Snapshot {
	var title *string
	name := ""
	switch s.imageTitle {
	case assets.ImageTitleGearhead:
		name = "gearhead"
	case assets.ImageTitleSweet:
		name = "sweet"
	case assets.ImageTitleFirefly:
		name = "firefly"
	}
	if name != "" {
		title = &name
	}
	return Snapshot{
		Player: PlayerSnapshot{
			X:     s.player.X,
			Y:     s.player.Y,
			Dir:   s.player.Direction,
			Frame: s.player.Frame,
		},
		MelodyPlaying: s.melodyPlaying,
		Title:         title,
		HighScore:     s.HighScore,
	}
}
