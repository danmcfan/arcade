package hive

import "math"

// digitReelDurationFrames is how long one digit spends scrolling from → to at 60 FPS.
const digitReelDurationFrames = 18

func digits6(value int) [6]int {
	if value < 0 {
		value = 0
	}
	if value > 999_999 {
		value = 999_999
	}
	return [6]int{
		value / 100_000,
		(value % 100_000) / 10_000,
		(value % 10_000) / 1_000,
		(value % 1_000) / 100,
		(value % 100) / 10,
		value % 10,
	}
}

func easeDialOut(t float64) float64 {
	if t <= 0 {
		return 0
	}
	if t >= 1 {
		return 1
	}
	return 1 - math.Pow(1-t, 3)
}

// DigitReel spins one decimal column vertically (previous digit exits upward, next rises from below).
type DigitReel struct {
	SettledDigit int // 0-9 shown when idle
	active         bool
	from, to       int // spin endpoints during active
	t              float64
}

func (r *DigitReel) Boot(digit int) {
	r.active = false
	r.t = 0
	d := digit % 10
	if d < 0 {
		d += 10
	}
	r.SettledDigit = d
}

func (r *DigitReel) SyncTarget(target int) {
	target %= 10
	if target < 0 {
		target = -target % 10
	}
	if r.active {
		return
	}
	if r.SettledDigit == target {
		return
	}
	r.from = r.SettledDigit
	r.to = target
	r.active = true
	r.t = 0
}

func (r *DigitReel) StepFrame() {
	if !r.active {
		return
	}
	r.t += 1 / float64(digitReelDurationFrames)
	if r.t >= 1 {
		r.t = 1
		r.SettledDigit = r.to
		r.active = false
	}
}

// Scroll01 returns eased 0=start of spin, 1=finished showing the new digit. Idle columns return 1.
func (r *DigitReel) Scroll01() float64 {
	if !r.active {
		return 1
	}
	return easeDialOut(r.t)
}

func (s *HiveSoftware) syncAndTickScoreRollingDials() {
	target := digits6(s.score)
	for i := range s.scoreDial {
		s.scoreDial[i].SyncTarget(target[i])
	}
	for i := range s.scoreDial {
		s.scoreDial[i].StepFrame()
	}
}

func (s *HiveSoftware) syncAndTickHighScoreRollingDials() {
	target := digits6(int(math.Max(float64(s.score), float64(s.highScore))))
	for i := range s.highScoreDial {
		s.highScoreDial[i].SyncTarget(target[i])
	}
	for i := range s.highScoreDial {
		s.highScoreDial[i].StepFrame()
	}
}
