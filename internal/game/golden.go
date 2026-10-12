package game

import (
	"fmt"

	"github.com/danmcfan/arcade/internal/arcade"
	"github.com/danmcfan/arcade/internal/firefly"
	"github.com/danmcfan/arcade/internal/gearhead"
	"github.com/danmcfan/arcade/internal/hive"
	"github.com/danmcfan/arcade/internal/software"
)

// Golden-harness snapshot (read-only). JSON keys follow GameSnapshot in
// src/game/snapshot.ts; the harness adds `tick`, `rng` and `sounds`.
type Snapshot struct {
	Debug    bool            `json:"debug"`
	Software *string         `json:"software"`
	Arcade   arcade.Snapshot `json:"arcade"`
	Sw       any             `json:"sw"`
}

func (g *Game) Snapshot() Snapshot {
	snap := Snapshot{
		Debug:  g.debugMode,
		Arcade: g.arcade.Snapshot(),
	}
	if g.software == nil {
		return snap
	}
	var name string
	switch sw := g.software.(type) {
	case *hive.HiveSoftware:
		name, snap.Sw = "hive", sw.Snapshot()
	case *firefly.FireFlySoftware:
		name, snap.Sw = "firefly", sw.Snapshot()
	case *gearhead.GearHeadSoftware:
		name, snap.Sw = "gearhead", sw.Snapshot()
	default:
		panic(fmt.Sprintf("snapshot: unknown software %T", g.software))
	}
	snap.Software = &name
	return snap
}

// Layout without the outside size (harness frames mode).
func (g *Game) LogicalSize() (int, int) {
	return g.Layout(0, 0)
}

// ActiveSoftware returns the running software, or nil in the hub (harness
// scenario generation only).
func (g *Game) ActiveSoftware() software.Software {
	return g.software
}
