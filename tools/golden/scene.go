package main

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/hajimehoshi/ebiten/v2"

	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/firefly"
	"github.com/danmcfan/arcade/internal/game"
	"github.com/danmcfan/arcade/internal/gearhead"
	"github.com/danmcfan/arcade/internal/hive"
	"github.com/danmcfan/arcade/internal/input"
	"github.com/danmcfan/arcade/internal/lumberjack"
	"github.com/danmcfan/arcade/internal/rng"
	"github.com/danmcfan/arcade/internal/software"
	"github.com/danmcfan/arcade/internal/wave"
)

// scene adapts each top-level Go scene to the §3.4 Scene shape.
type scene interface {
	step(in input.Input)
	// line returns the per-tick snapshot minus `tick` and `rng` (and, for
	// the game, minus `sounds`), as a value json.Marshal flattens.
	snapshot(full bool) any
	draw(screen *ebiten.Image)
	size() (int, int)
}

type gameScene struct {
	g    *game.Game
	hive *hive.HiveSoftware // initial hive, if any (bot planning)
}

func (s *gameScene) step(in input.Input) {
	if err := s.g.UpdateWithInput(in); err != nil {
		panic(err)
	}
}
func (s *gameScene) snapshot(bool) any         { return s.g.Snapshot() }
func (s *gameScene) draw(screen *ebiten.Image) { s.g.Draw(screen) }
func (s *gameScene) size() (int, int)          { return s.g.LogicalSize() }

type waveScene struct {
	g         *wave.Game
	prevSpace bool
}

// step: `space` is held state in scripts; the wave scene acts on its rising
// edge (inpututil.AppendJustPressedKeys in Go).
func (s *waveScene) step(in input.Input) {
	s.g.Step(in.Space && !s.prevSpace)
	s.prevSpace = in.Space
}
func (s *waveScene) snapshot(full bool) any    { return s.g.Snapshot(full) }
func (s *waveScene) draw(screen *ebiten.Image) { s.g.DrawCells(screen) }
func (s *waveScene) size() (int, int)          { return s.g.LogicalSize() }

type lumberjackScene struct{ g *lumberjack.Game }

func (s *lumberjackScene) step(in input.Input) {
	lumberjack.Step(lumberjack.Input{Up: in.Up, Down: in.Down, Left: in.Left, Right: in.Right, Space: in.Space})
}
func (s *lumberjackScene) snapshot(bool) any         { return lumberjack.TakeSnapshot() }
func (s *lumberjackScene) draw(screen *ebiten.Image) { s.g.Draw(screen) }
func (s *lumberjackScene) size() (int, int)          { return s.g.Layout(0, 0) }

// runner replays a script tick by tick.
type runner struct {
	script *Script
	sc     scene
	inputs []input.Input
	tick   int
	sounds []string
	mute   bool // drop sound events (bot look-ahead)
}

func newRunner(s *Script) *runner {
	r := &runner{script: s, inputs: s.Expand(), sounds: []string{}}
	assets.Silent = true
	// Installed before anything is constructed, so construction-time sounds
	// (hive's StartState.OnEnter) land in tick 1's `sounds`.
	assets.OnSoundEvent = func(e string) {
		if !r.mute {
			r.sounds = append(r.sounds, e)
		}
	}
	rng.Seed(s.Seed)
	switch s.Scene {
	case "game":
		gs := &gameScene{}
		var sw software.Software
		switch s.Software {
		case "hive":
			gs.hive = hive.NewHiveSoftware(0)
			sw = gs.hive
		case "firefly":
			sw = firefly.NewFireFlySoftware()
		case "gearhead":
			sw = gearhead.NewGearHeadSoftware()
		}
		gs.g = game.New(sw)
		r.sc = gs
	case "wave":
		opts := WaveOpts{GridSize: 128, Seconds: 5}
		if s.Wave != nil {
			opts = *s.Wave
		}
		r.sc = &waveScene{g: wave.NewWithPending(opts.GridSize, opts.Seconds)}
	case "lumberjack":
		lumberjack.ResetState()
		r.sc = &lumberjackScene{g: lumberjack.NewGame()}
	default:
		panic(fmt.Sprintf("unknown scene %q", s.Scene))
	}
	return r
}

func (r *runner) done() bool { return r.tick >= len(r.inputs) }

func (r *runner) step() {
	r.stepWith(r.inputs[r.tick])
}

// stepWith runs one tick with an explicit input (scenario generation).
func (r *runner) stepWith(in input.Input) {
	r.sc.step(in)
	r.tick++
}

type gameLine struct {
	Tick int    `json:"tick"`
	Rng  uint32 `json:"rng"`
	game.Snapshot
	Sounds []string `json:"sounds"`
}

type waveLine struct {
	Tick int    `json:"tick"`
	Rng  uint32 `json:"rng"`
	wave.Snapshot
}

type lumberjackLine struct {
	Tick int    `json:"tick"`
	Rng  uint32 `json:"rng"`
	lumberjack.Snapshot
}

// line builds the JSON snapshot for the tick just completed and flushes the
// sound buffer.
func (r *runner) line(full bool) any {
	var v any
	switch snap := r.sc.snapshot(full).(type) {
	case game.Snapshot:
		v = gameLine{Tick: r.tick, Rng: rng.State(), Snapshot: snap, Sounds: r.sounds}
	case wave.Snapshot:
		v = waveLine{Tick: r.tick, Rng: rng.State(), Snapshot: snap}
	case lumberjack.Snapshot:
		v = lumberjackLine{Tick: r.tick, Rng: rng.State(), Snapshot: snap}
	default:
		panic(fmt.Sprintf("unknown snapshot %T", snap))
	}
	r.sounds = []string{}
	return v
}

func marshalLine(v any) []byte {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		panic(err)
	}
	return b.Bytes() // ends with '\n'
}
