package lumberjack

// Golden-harness hooks (never called by the game). JSON keys follow
// LumberjackSnapshot in src/game/snapshot.ts; the harness adds `tick`, `rng`.

// ResetState rebuilds the package globals `player` and `trees` exactly as
// package init does, so the harness can run several scenarios per process.
func ResetState() {
	player = NewPlayer()
	trees = []*Tree{
		NewTree(width/4, height/4),
		NewTree(width*3/4, height/4),
	}
}

type PlayerSnapshot struct {
	X            float64   `json:"x"`
	Y            float64   `json:"y"`
	Dir          Direction `json:"dir"`
	FrameX       int       `json:"frameX"`
	FrameY       int       `json:"frameY"`
	FrameCounter int       `json:"frameCounter"`
	Moving       bool      `json:"moving"`
	Acting       bool      `json:"acting"`
}

type TreeSnapshot struct {
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Theta       float64 `json:"theta"`
	ThetaInc    bool    `json:"thetaInc"`
	Shaking     bool    `json:"shaking"`
	ShakeRight  bool    `json:"shakeRight"`
	Behind      bool    `json:"behind"`
	Transparent bool    `json:"transparent"`
	Health      float64 `json:"health"`
}

type Snapshot struct {
	Player PlayerSnapshot `json:"player"`
	Trees  []TreeSnapshot `json:"trees"`
}

func TakeSnapshot() Snapshot {
	snap := Snapshot{
		Player: PlayerSnapshot{
			X:            player.PositionX,
			Y:            player.PositionY,
			Dir:          player.Direction,
			FrameX:       player.FrameX,
			FrameY:       player.FrameY,
			FrameCounter: player.FrameCounter,
			Moving:       player.Moving,
			Acting:       player.Acting,
		},
		Trees: make([]TreeSnapshot, 0, len(trees)),
	}
	for _, t := range trees {
		snap.Trees = append(snap.Trees, TreeSnapshot{
			X:           t.PositionX,
			Y:           t.PositionY,
			Theta:       t.Theta,
			ThetaInc:    t.ThetaIncreasing,
			Shaking:     t.Shaking,
			ShakeRight:  t.ShakeRight,
			Behind:      t.Behind,
			Transparent: t.Transparent,
			Health:      t.Health,
		})
	}
	return snap
}
