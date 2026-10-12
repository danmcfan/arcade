package hive

import (
	"fmt"

	"github.com/danmcfan/arcade/internal/input"
	"github.com/danmcfan/arcade/internal/snaphash"
)

// Golden-harness hooks (read-only, never called by the game): Snapshot for
// the parity traces, plus Clone and a few accessors the scenario generator's
// look-ahead bot uses. JSON keys follow HiveSnapshot in src/game/snapshot.ts.

type PlayerSnapshot struct {
	X        float64         `json:"x"`
	Y        float64         `json:"y"`
	Dir      input.Direction `json:"dir"`
	Frame    float64         `json:"frame"`
	Hidden   bool            `json:"hidden"`
	Velocity float64         `json:"velocity"`
}

type EnemySnapshot struct {
	Kind        string          `json:"kind"`
	X           float64         `json:"x"`
	Y           float64         `json:"y"`
	Dir         input.Direction `json:"dir"`
	Frame       float64         `json:"frame"`
	Velocity    float64         `json:"velocity"`
	Blue        int             `json:"blue"`
	FlashFrames int             `json:"flashFrames"`
	Flash       bool            `json:"flash"`
	Home        bool            `json:"home"`
	DotMin      int             `json:"dotMin"`
	Reverse     bool            `json:"reverse"`
	ReverseTile [2]int          `json:"reverseTile"`
}

type PopupSnapshot struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	FrameIdx int     `json:"frameIdx"`
	Ticks    int     `json:"ticks"`
}

type Snapshot struct {
	State                 StateID         `json:"state"`
	Player                PlayerSnapshot  `json:"player"`
	Enemies               []EnemySnapshot `json:"enemies"`
	Items                 int             `json:"items"`
	ItemsHash             uint32          `json:"itemsHash"`
	Score                 int             `json:"score"`
	Lives                 int             `json:"lives"`
	HighScore             int             `json:"highScore"`
	ModeIndex             int             `json:"modeIndex"`
	Mode                  int             `json:"mode"`
	ModeTicks             int             `json:"modeTicks"`
	PauseTicks            int             `json:"pauseTicks"`
	StartTicks            int             `json:"startTicks"`
	RespawnBlinkRemaining int             `json:"respawnBlinkRemaining"`
	ScaredEatAwardNext    int             `json:"scaredEatAwardNext"`
	Popups                []PopupSnapshot `json:"popups"`
	Shake                 [4]any          `json:"shake"`
	ParticlesActive       int             `json:"particlesActive"`
	PelletAnimTick        int             `json:"pelletAnimTick"`
	Joystick              int             `json:"joystick"`
	Dials                 [][5]any        `json:"dials"`
}

func enemyKind(e *Entity) string {
	switch e.color {
	case colorRed:
		return "red"
	case colorPink:
		return "pink"
	case colorTeal:
		return "teal"
	case colorOrange:
		return "orange"
	}
	panic(fmt.Sprintf("unknown color: %v", e.color))
}

func (s *HiveSoftware) Snapshot() Snapshot {
	snap := Snapshot{
		State: s.stateMachine.CurrentID(),
		Player: PlayerSnapshot{
			X:        s.player.X,
			Y:        s.player.Y,
			Dir:      s.player.Direction,
			Frame:    s.player.Frame,
			Hidden:   s.player.Hidden,
			Velocity: s.player.Velocity,
		},
		Enemies:               make([]EnemySnapshot, 0, len(s.enemies)),
		Score:                 s.score,
		Lives:                 s.lives,
		HighScore:             s.highScore,
		ModeIndex:             s.modeIndex,
		Mode:                  int(s.modeCurrent),
		ModeTicks:             s.modeTicks,
		PauseTicks:            s.pauseTicks,
		StartTicks:            s.startTicks,
		RespawnBlinkRemaining: s.stateMachine.states[StateIDStart].(*StartState).respawnBlinkRemaining,
		ScaredEatAwardNext:    s.scaredEatAwardNext,
		Popups:                make([]PopupSnapshot, 0, len(s.bonusEatPopups)),
		Shake: [4]any{
			s.camera.shakeOffsetX, s.camera.shakeOffsetY,
			s.camera.shakeTicksRemaining, s.camera.shakeIntensity,
		},
		PelletAnimTick: s.pelletAnimTick,
		Joystick:       s.cabinetJoystickFrame,
		Dials:          make([][5]any, 0, len(s.scoreDial)+len(s.highScoreDial)),
	}
	for _, e := range s.enemies {
		snap.Enemies = append(snap.Enemies, EnemySnapshot{
			Kind:        enemyKind(e),
			X:           e.X,
			Y:           e.Y,
			Dir:         e.Direction,
			Frame:       e.Frame,
			Velocity:    e.Velocity,
			Blue:        e.BlueFrames,
			FlashFrames: e.FlashFrames,
			Flash:       e.Flash,
			Home:        e.home,
			DotMin:      e.dotMinimum,
			Reverse:     e.reverseDirection,
			ReverseTile: [2]int{e.reverseTile.x, e.reverseTile.y},
		})
	}
	present := make([]uint32, 0, len(s.items))
	for i, item := range s.items {
		if item != nil {
			present = append(present, uint32(i))
		}
	}
	snap.Items = len(present)
	snap.ItemsHash = snaphash.FNV1a32(present)
	for _, p := range s.bonusEatPopups {
		snap.Popups = append(snap.Popups, PopupSnapshot{X: p.x, Y: p.y, FrameIdx: p.frameIdx, Ticks: p.ticksRemain})
	}
	for i := range s.particles.pool {
		if s.particles.pool[i].Active {
			snap.ParticlesActive++
		}
	}
	dial := func(r *DigitReel) [5]any { return [5]any{r.SettledDigit, r.active, r.from, r.to, r.t} }
	for i := range s.scoreDial {
		snap.Dials = append(snap.Dials, dial(&s.scoreDial[i]))
	}
	for i := range s.highScoreDial {
		snap.Dials = append(snap.Dials, dial(&s.highScoreDial[i]))
	}
	return snap
}

// Clone returns an independent copy for look-ahead simulation (scenario
// generator only). Immutable data (corners, item entities, images, frame
// maps) is shared; everything Update mutates is copied.
func (s *HiveSoftware) Clone() *HiveSoftware {
	c := *s

	cam := *s.camera
	c.camera = &cam
	ps := *s.particles
	c.particles = &ps

	pl := *s.player
	c.player = &pl
	c.enemies = make([]*Entity, len(s.enemies))
	for i, e := range s.enemies {
		ec := *e
		c.enemies[i] = &ec
	}
	c.items = append([]*Entity(nil), s.items...)
	c.bonusEatPopups = append([]bonusEatPopup(nil), s.bonusEatPopups...)

	c.stateMachine = NewStateMachine()
	start := *s.stateMachine.states[StateIDStart].(*StartState)
	start.s = &c
	c.stateMachine.RegisterState(StateIDStart, &start)
	c.stateMachine.RegisterState(StateIDPlay, &PlayState{s: &c})
	c.stateMachine.RegisterState(StateIDPause, &PauseState{s: &c})
	c.stateMachine.RegisterState(StateIDDeathWait, &DeathWaitState{s: &c})
	c.stateMachine.RegisterState(StateIDFinalDeathWait, &FinalDeathWaitState{s: &c})
	c.stateMachine.RegisterState(StateIDGameOver, &GameOverState{s: &c})
	c.stateMachine.currentID = s.stateMachine.currentID
	c.stateMachine.currentState = c.stateMachine.states[s.stateMachine.currentID]
	return &c
}

// HarnessPoint is a position in playfield pixels.
type HarnessPoint struct{ X, Y float64 }

// HarnessCorner is a maze junction and the directions that leave it.
type HarnessCorner struct {
	X, Y       float64
	Directions []input.Direction
}

// HarnessItems lists the remaining food positions.
func (s *HiveSoftware) HarnessItems() []HarnessPoint {
	out := []HarnessPoint{}
	for _, it := range s.items {
		if it != nil {
			out = append(out, HarnessPoint{it.X, it.Y})
		}
	}
	return out
}

// HarnessEnemies lists enemy positions and whether each is scared (blue).
func (s *HiveSoftware) HarnessEnemies() (pos []HarnessPoint, blue []bool) {
	for _, e := range s.enemies {
		pos = append(pos, HarnessPoint{e.X, e.Y})
		blue = append(blue, e.BlueFrames > 0)
	}
	return pos, blue
}

// HarnessCorners lists the maze junctions.
func (s *HiveSoftware) HarnessCorners() []HarnessCorner {
	out := make([]HarnessCorner, 0, len(s.corners))
	for _, c := range s.corners {
		out = append(out, HarnessCorner{c.X, c.Y, c.Directions})
	}
	return out
}
