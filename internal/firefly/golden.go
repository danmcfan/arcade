package firefly

// Golden-harness snapshot (read-only). JSON keys follow FireflySnapshot in
// src/game/snapshot.ts.

type XY struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type BugSnapshot struct {
	Pattern    string  `json:"pattern"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	Dx         float64 `json:"dx"`
	Dy         float64 `json:"dy"`
	Duration   float64 `json:"duration"`
	DeadFrames int     `json:"deadFrames"`
}

type Snapshot struct {
	Player    XY            `json:"player"`
	FireDelay int           `json:"fireDelay"`
	Bullets   []XY          `json:"bullets"`
	Bugs      []BugSnapshot `json:"bugs"`
}

func (f *FireFlySoftware) Snapshot() Snapshot {
	snap := Snapshot{
		Player:    XY{X: f.player.Position.x, Y: f.player.Position.y},
		FireDelay: f.fireDelay,
		Bullets:   make([]XY, 0, len(f.bullets)),
		Bugs:      make([]BugSnapshot, 0, len(f.bugs)),
	}
	for _, b := range f.bullets {
		snap.Bullets = append(snap.Bullets, XY{X: b.Position.x, Y: b.Position.y})
	}
	for _, b := range f.bugs {
		snap.Bugs = append(snap.Bugs, BugSnapshot{
			Pattern:    b.PatternName,
			X:          b.Position.x,
			Y:          b.Position.y,
			Dx:         b.Direction.x,
			Dy:         b.Direction.y,
			Duration:   b.Duration,
			DeadFrames: b.DeadFrames,
		})
	}
	return snap
}
