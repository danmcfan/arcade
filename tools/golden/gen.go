package main

import (
	"fmt"
	"math/rand/v2"
	"os"

	"github.com/danmcfan/arcade/internal/firefly"
	"github.com/danmcfan/arcade/internal/game"
	"github.com/danmcfan/arcade/internal/hive"
	"github.com/danmcfan/arcade/internal/lumberjack"
	"github.com/danmcfan/arcade/internal/wave"
)

// Scenario authoring (§4.4). `golden gen` rewrites test/fixtures/inputs from
// this file; the JSON files are the source of truth for trace/frames and the
// TS replays, this code only documents how they were made. Generation is
// deterministic.

var (
	up    = InputJS{Up: true}
	down  = InputJS{Down: true}
	left  = InputJS{Left: true}
	right = InputJS{Right: true}
	none  = InputJS{}
	space = InputJS{Space: true}
	esc   = InputJS{Escape: true}
	shift = InputJS{ShiftP: true}
)

func with(a, b InputJS) InputJS {
	return InputJS{
		Up: a.Up || b.Up, Down: a.Down || b.Down, Left: a.Left || b.Left, Right: a.Right || b.Right,
		Space: a.Space || b.Space, Escape: a.Escape || b.Escape, ShiftP: a.ShiftP || b.ShiftP,
	}
}

// gen drives a runner while recording the steps it applies.
type gen struct {
	s       *Script
	r       *runner
	observe func() // called after every tick, if set
}

func newGen(s Script) *gen {
	s.Steps = nil
	sc := s
	return &gen{s: &sc, r: newRunner(&sc)}
}

func (g *gen) tick() int { return g.r.tick }

func (g *gen) stepOnce(in InputJS, first bool) {
	x := in.toInput()
	if !first {
		x.ShiftP = false
	}
	g.r.stepWith(x)
	g.r.sounds = g.r.sounds[:0]
	if g.observe != nil {
		g.observe()
	}
}

// hold applies `in` for `ticks` ticks.
func (g *gen) hold(ticks int, in InputJS) {
	g.s.Steps = append(g.s.Steps, Step{Ticks: ticks, Input: in})
	for i := range ticks {
		g.stepOnce(in, i == 0)
	}
}

// holdUntil applies `in` until cond() is true after a tick (or max ticks);
// returns the ticks used.
func (g *gen) holdUntil(max int, in InputJS, cond func() bool) int {
	n := 0
	for n < max {
		g.stepOnce(in, n == 0)
		n++
		if cond() {
			break
		}
	}
	if n > 0 {
		g.s.Steps = append(g.s.Steps, Step{Ticks: n, Input: in})
	}
	return n
}

func (g *gen) game() game.Snapshot {
	return g.r.sc.snapshot(false).(game.Snapshot)
}

func (g *gen) hive() *hive.HiveSoftware {
	h, _ := g.r.sc.(*gameScene).g.ActiveSoftware().(*hive.HiveSoftware)
	return h
}

func (g *gen) inHive() bool { return g.hive() != nil }

func (g *gen) capture(ticks ...int) {
	for _, t := range ticks {
		if t <= 0 {
			continue
		}
		n := len(g.s.CaptureTicks)
		if n > 0 && g.s.CaptureTicks[n-1] >= t {
			continue
		}
		g.s.CaptureTicks = append(g.s.CaptureTicks, t)
	}
}

// randomHold is one fuzz hold: a random direction for 10–60 ticks.
func randomHold(rnd *rand.Rand) (int, InputJS) {
	dirs := []InputJS{up, down, left, right}
	return 10 + rnd.IntN(51), dirs[rnd.IntN(len(dirs))]
}

// botHold plans and applies one bot hold of 8–24 ticks while in hive.
func (g *gen) botHold(m *maze, mode botMode, rnd *rand.Rand) {
	hold := 8 + rnd.IntN(17)
	g.r.mute = true
	in := planHold(g.hive(), m, mode, hold, rnd)
	g.r.mute = false
	g.holdUntil(hold, in, func() bool { return !g.inHive() })
}

func generateAll(dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	scripts := []*Script{
		genArcadeWalk(),
		genArcadeEnter("gearhead"),
		genArcadeEnter("hive"),
		genArcadeEnter("firefly"),
		genHiveFuzz(1), genHiveFuzz(2), genHiveFuzz(3), genHiveFuzz(4),
		genHiveClear(),
		genHiveModes(),
		genHiveHighscore(),
		genFireflyPlay(),
		genGearheadWalk(),
		genWave("wave-64-seed7", 7, 64, 40),
		genWave("wave-128-seed3", 3, 128, 100),
		genLumberjackChop(),
	}
	for _, s := range scripts {
		if err := saveScript(dir, s); err != nil {
			return err
		}
		fmt.Printf("gen %-24s %6d ticks, capture %v\n", s.Name, s.TotalTicks(), s.CaptureTicks)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Hub. Player starts at (80, 92) facing down, 1 px/tick; its 16×24 box stops
// at x 32..128 and y 60..108. Cabinets (facing Up at y < 68): gearhead
// 40 < x < 72, hive 64 < x < 96, firefly 88 < x < 120 (first match wins).

func genArcadeWalk() *Script {
	g := newGen(Script{Name: "arcade-walk", Scene: "game", Seed: 1})
	g.hold(1, none)
	g.capture(1)   // hub start
	g.hold(40, up) // melody + "sweet" title from tick 26; top wall face from y=60
	g.capture(g.tick())
	g.hold(24, left) // facing left: melody stops (pause+rewind)
	g.hold(5, up)    // gearhead title
	g.capture(g.tick())
	g.hold(30, left)   // left wall face at x=32
	g.hold(60, down)   // bottom wall face at y=108
	g.hold(110, right) // right wall face at x=128
	g.hold(60, up)     // top wall face again, no cabinet at x=128
	g.hold(24, left)   // x=104
	g.hold(5, up)      // firefly title
	g.capture(g.tick())
	g.hold(10, down) // melody stops
	g.hold(1, shift) // debug on (+120 px)
	g.hold(20, left)
	g.capture(g.tick()) // debug panel + overlay
	g.hold(20, up)      // hive cabinet with debug on
	g.capture(g.tick())
	g.hold(1, with(shift, up)) // debug off, still facing the cabinet
	g.hold(10, none)
	g.hold(1, esc) // Esc in the hub is a no-op
	g.hold(10, down)
	g.capture(g.tick())
	return g.s
}

func genArcadeEnter(sw string) *Script {
	g := newGen(Script{Name: "arcade-enter-" + sw, Scene: "game", Seed: 1})
	g.hold(1, none)
	switch sw {
	case "gearhead":
		g.hold(24, left)
	case "firefly":
		g.hold(24, right)
	}
	g.hold(32, up)
	g.hold(1, with(up, space)) // enter
	g.capture(g.tick())
	switch sw {
	case "gearhead":
		g.hold(40, left)
		g.hold(150, right)
		g.hold(30, none)
		g.hold(80, left)
	case "hive":
		g.hold(120, none)
		g.hold(60, left)
		g.hold(60, up)
		g.hold(60, right)
	case "firefly":
		g.hold(100, with(space, left))
		g.hold(100, with(space, right))
		g.hold(100, space)
	}
	g.capture(g.tick())
	g.hold(1, esc) // pause:start, back to the hub (layout change)
	g.capture(g.tick())
	g.hold(30, none)
	g.hold(20, down)
	return g.s
}

// ---------------------------------------------------------------------------
// Hive.

func genHiveFuzz(n int) *Script {
	g := newGen(Script{Name: fmt.Sprintf("hive-fuzz-%d", n), Scene: "game", Software: "hive", Seed: uint32(n)})
	rnd := rand.New(rand.NewPCG(uint64(n), 0xf022))
	g.hold(1, none) // hub tick (§4.2)
	g.capture(1)
	for g.tick() < 3600 {
		g.hold(randomHold(rnd))
	}
	return g.s
}

// hive-clear: greedy look-ahead bot until a round is won, then random holds
// until game over. Captures the hive frame list from §4.4.
func genHiveClear() *Script {
	g := newGen(Script{Name: "hive-clear", Scene: "game", Software: "hive", Seed: 11})
	rnd := rand.New(rand.NewPCG(11, 0xc1ea))
	m := buildMaze(g.r.sc.(*gameScene).hive.HarnessCorners())
	cap := newHiveCaptures()
	won := false
	prevItems := -1
	g.observe = func() {
		if !g.inHive() {
			return
		}
		cap.see(g)
		sw := g.game().Sw.(hive.Snapshot)
		if prevItems >= 0 && sw.Items > prevItems {
			won = true
		}
		prevItems = sw.Items
		if sw.State == hive.StateIDFinalDeathWait && sw.PauseTicks == 0 {
			cap.gameOver = g.tick()
		}
	}
	g.hold(1, none)
	for !won && g.tick() < 12000 && g.inHive() {
		g.botHold(m, botGreedy, rnd)
	}
	fmt.Fprintf(os.Stderr, "hive-clear: won=%v at tick %d\n", won, g.tick())
	// Play on randomly until the game is over and we are back in the hub.
	for g.inHive() && g.tick() < 20000 {
		ticks, in := randomHold(rnd)
		g.holdUntil(ticks, in, func() bool { return !g.inHive() })
	}
	hub := g.tick()
	g.hold(30, none)
	g.s.CaptureTicks = cap.ticks(hub)
	return g.s
}

// hive-modes: survival bot (never eats the last items, so the round never
// restarts) until modeIndex reaches 8, i.e. every modeSequence entry
// through index 7 has been entered.
func genHiveModes() *Script {
	g := newGen(Script{Name: "hive-modes", Scene: "game", Software: "hive", Seed: 5})
	rnd := rand.New(rand.NewPCG(5, 0x30de))
	m := buildMaze(g.r.sc.(*gameScene).hive.HarnessCorners())
	// The greedy bot in hive-clear eats every scared bee before it flashes,
	// so the "flashing" frame comes from here.
	cap := newHiveCaptures()
	g.observe = func() { cap.see(g) }
	g.hold(1, none)
	defer func() { g.capture(cap.flashing) }()
	for g.inHive() && g.tick() < 12000 {
		if g.game().Sw.(hive.Snapshot).ModeIndex >= 8 {
			break
		}
		g.botHold(m, botSurvive, rnd)
	}
	if g.inHive() {
		sw := g.game().Sw.(hive.Snapshot)
		fmt.Fprintf(os.Stderr, "hive-modes: modeIndex %d lives %d items %d at tick %d\n", sw.ModeIndex, sw.Lives, sw.Items, g.tick())
	} else {
		fmt.Fprintf(os.Stderr, "hive-modes: game over at tick %d\n", g.tick())
	}
	for range 4 {
		if g.inHive() {
			g.botHold(m, botSurvive, rnd)
		}
	}
	return g.s
}

// hive-highscore: hub → hive cabinet → random play to game over → hub high
// score updated → re-enter hive (its high score dials boot from it) → Esc.
func genHiveHighscore() *Script {
	g := newGen(Script{Name: "hive-highscore", Scene: "game", Seed: 21})
	rnd := rand.New(rand.NewPCG(21, 0x415c))
	g.hold(1, none)
	g.hold(32, up)
	g.hold(1, with(up, space))
	for g.inHive() {
		ticks, in := randomHold(rnd)
		g.holdUntil(ticks, in, func() bool { return !g.inHive() })
	}
	g.capture(g.tick()) // back in the hub after game over
	g.hold(20, down)
	g.hold(20, up)
	g.hold(1, with(up, space)) // re-enter with the new high score
	g.capture(g.tick())
	g.hold(130, none)
	g.capture(g.tick())
	g.hold(1, esc)
	g.hold(20, none)
	return g.s
}

// hiveCaptures picks the §4.4 hive frames while generating hive-clear.
type hiveCaptures struct {
	first, ready, midPlay, shake, power, flashing, popup, gameOver int
	popupStart                                                     int
	g                                                              *gen
}

func newHiveCaptures() *hiveCaptures { return &hiveCaptures{} }

func (c *hiveCaptures) see(g *gen) {
	if !g.inHive() {
		return
	}
	t := g.tick()
	sw := g.game().Sw.(hive.Snapshot)
	if c.first == 0 {
		c.first = t
	}
	if c.ready == 0 && sw.State == hive.StateIDStart && sw.StartTicks == 60 {
		c.ready = t
	}
	if c.midPlay == 0 && sw.State == hive.StateIDPlay && t > 600 {
		c.midPlay = t
	}
	// Shake offsets are rolled on the tick after the request.
	if c.shake == 0 && (sw.Shake[0].(float64) != 0 || sw.Shake[1].(float64) != 0) {
		c.shake = t
	}
	anyFlash, anyBlue := false, false
	for _, e := range sw.Enemies {
		if e.Blue > 120 {
			anyBlue = true
		}
		if e.Blue > 0 && e.Blue <= 120 && e.Flash {
			anyFlash = true
		}
	}
	if c.power == 0 && anyBlue && sw.State == hive.StateIDPlay && sw.Shake[2].(int) == 0 {
		c.power = t
	}
	if c.flashing == 0 && anyFlash && sw.State == hive.StateIDPlay {
		c.flashing = t
	}
	if c.popupStart == 0 && len(sw.Popups) > 0 && sw.ParticlesActive > 0 {
		c.popupStart = t
	}
	// A few ticks in, so the particles have spread.
	if c.popup == 0 && c.popupStart > 0 && t >= c.popupStart+4 && len(sw.Popups) > 0 && sw.ParticlesActive > 0 {
		c.popup = t
	}
}

func (c *hiveCaptures) ticks(hub int) []int {
	out := []int{}
	for _, t := range []int{c.first, c.ready, c.midPlay, c.shake, c.power, c.flashing, c.popup, c.gameOver, hub} {
		if t > 0 {
			out = append(out, t)
		}
	}
	return sortedUnique(out)
}

func sortedUnique(in []int) []int {
	out := []int{}
	for _, v := range in {
		i := 0
		for i < len(out) && out[i] < v {
			i++
		}
		if i < len(out) && out[i] == v {
			continue
		}
		out = append(out[:i], append([]int{v}, out[i:]...)...)
	}
	return out
}

// ---------------------------------------------------------------------------
// Firefly: ship starts at x=112 (2 px/tick, clamped to 8..217), fires every
// 20 ticks while Space is held. Parking at the far left during a wave
// respawn lets a bullet at x=4 reach the unspawned bugs parked at (0,0).

func genFireflyPlay() *Script {
	g := newGen(Script{Name: "firefly-play", Scene: "game", Software: "firefly", Seed: 1})
	// Capture explosions mid-animation (deadFrames 30..60 draws columns 1..3)
	// for an on-screen bug, at least 300 ticks apart.
	explosions := []int{}
	g.observe = func() {
		snap := g.game()
		if snap.Sw == nil {
			return
		}
		for _, b := range snap.Sw.(firefly.Snapshot).Bugs {
			last := -1000
			if len(explosions) > 0 {
				last = explosions[len(explosions)-1]
			}
			if b.DeadFrames >= 30 && b.DeadFrames <= 60 && b.X > 16 && b.Y > 16 && b.X < 208 && b.Y < 272 && g.tick()-last >= 300 {
				explosions = append(explosions, g.tick())
			}
		}
	}
	g.hold(1, none)
	pattern := []struct {
		ticks int
		in    InputJS
	}{
		{60, with(space, left)},
		{120, with(space, right)},
		{60, with(space, left)},
		{90, space},
		{110, with(space, left)}, // park at the far left
		{200, space},
		{100, with(space, right)},
		{60, with(space, left)},
		{120, with(space, right)},
		{80, space},
		{150, with(space, left)},
		{200, space},
		{150, with(space, right)},
	}
	for _, p := range pattern {
		g.hold(p.ticks, p.in)
	}
	for g.tick() < 1501 {
		g.hold(min(50, 1501-g.tick()), with(space, left))
	}
	g.capture(1)
	g.capture(explosions...)
	return g.s
}

func genGearheadWalk() *Script {
	g := newGen(Script{Name: "gearhead-walk", Scene: "game", Software: "gearhead", Seed: 1})
	g.hold(1, none)
	g.hold(10, none)
	g.hold(20, left)   // left wall clamp at x=6
	g.hold(120, right) // right wall clamp at x=108
	g.hold(10, none)   // idle: frame reset to 0
	g.hold(30, left)
	g.capture(g.tick()) // facing left, walking
	g.hold(10, none)
	g.capture(g.tick()) // facing left, idle
	g.hold(5, up)       // Up is "moving" but not left/right: keeps facing
	return g.s
}

// ---------------------------------------------------------------------------
// Wave: run `restartAt` ticks, press Space mid-run (applies the pending
// settings and rebuilds the grid), then run to full collapse plus 5 ticks.

func genWave(name string, seed uint32, gridSize, restartAt int) *Script {
	g := newGen(Script{Name: name, Scene: "wave", Seed: seed, Wave: &WaveOpts{GridSize: gridSize, Seconds: 5}})
	snap := func() wave.Snapshot { return g.r.sc.snapshot(false).(wave.Snapshot) }
	g.hold(restartAt, none)
	g.capture(g.tick()) // mid-run before the restart
	g.hold(1, space)
	half, full := 0, 0
	g.holdUntil(5000, none, func() bool {
		s := snap()
		if half == 0 && 2*s.Collapsed >= s.Width*s.Width {
			half = g.tick()
		}
		return s.Collapsed == s.Width*s.Width
	})
	full = g.tick()
	g.hold(5, none)
	g.capture(half, full)
	return g.s
}

// ---------------------------------------------------------------------------
// Lumberjack: player starts at (256, 144), 2 px/tick (1.5 diagonally).
// Tree 0 at (128, 72) has hitbox x 120..136, y 88..96; tree 1 at (384, 72).
// Chop damage is 10 per overlapping axis per tick while frameX == 2 (8 ticks
// per 48-tick swing). Resolve picks the axis with the smaller overlap, so
// chopping from the right at x=143 shakes the tree right (Y wins) and from
// below at (127, 112) shakes it left.

func genLumberjackChop() *Script {
	g := newGen(Script{Name: "lumberjack-chop", Scene: "lumberjack", Seed: 1})
	snap := func() lumberjack.Snapshot { return g.r.sc.snapshot(false).(lumberjack.Snapshot) }
	firstShake, behind := 0, 0
	g.observe = func() {
		s := snap()
		if firstShake == 0 && s.Trees[0].Shaking {
			firstShake = g.tick()
		}
		if behind == 0 && s.Trees[1].Transparent {
			behind = g.tick()
		}
	}
	g.hold(26, up)                // y=92
	g.hold(60, left)              // into tree 0 from the right: Resolve holds x at 143
	g.hold(40, space)             // one swing facing left: health 20, shakes right
	g.capture(firstShake + 6)     // mid-shake (rotated tree top), tree still visible
	g.hold(11, down)              // y=114
	g.hold(8, left)               // x=127
	g.hold(1, up)                 // y=112, facing up, below the tree
	g.hold(110, space)            // two swings: health 20 → -140, shakes left
	g.hold(60, space)             // keep chopping past 0 (invisible tree, still chopped)
	g.hold(10, left)              // x=107
	g.hold(26, up)                // y=60, alongside the (invisible) tree
	g.hold(60, with(down, right)) // diagonal: 1.5 px/tick per axis; bumps the invisible tree
	g.hold(10, with(up, down))    // Up+Down: cancel, still moving, faces down
	g.hold(40, up)                // y=56
	g.holdUntil(200, right, func() bool { return snap().Player.X >= 384 })
	g.hold(5, none)
	g.capture(behind+10, g.tick()) // behind tree 1: transparent (alpha 0.5)
	g.hold(30, down)               // walk into tree 1 from above (Resolve)
	g.hold(30, left)
	return g.s
}
