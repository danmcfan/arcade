package gearhead

// Golden-harness snapshot (read-only). JSON keys follow GearheadSnapshot in
// src/game/snapshot.ts.
type Snapshot struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Frame  float64 `json:"frame"`
	Left   bool    `json:"left"`
	Moving bool    `json:"moving"`
}

func (g *GearHeadSoftware) Snapshot() Snapshot {
	return Snapshot{
		X:      g.player.Position.X,
		Y:      g.player.Position.Y,
		Frame:  g.player.Frame,
		Left:   g.player.Left,
		Moving: g.player.Moving,
	}
}
