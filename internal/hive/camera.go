package hive

import "math/rand"

// Preset screen shake for picking up a power pellet (~0.10s at 60 ticks/s).
const (
	CameraShakePowerPelletTicks     = 6 // ticks, 100ms
	CameraShakePowerPelletIntensity = 4.0 // pixels
)

// Preset screen shake when the player eats a bee while it is vulnerable (~0.15s at 60 ticks/s; twice pellet intensity).
const (
	CameraShakeEnemyEatTicks     = 9 // ticks, 150ms
	CameraShakeEnemyEatIntensity = 8.0 // pixels
)

// CameraSystem drives camera-style effects (screen shake).
type CameraSystem struct {
	shakeTicksRemaining int
	shakeIntensity      float64
	shakeOffsetX        float64
	shakeOffsetY        float64
}

func NewCameraSystem() *CameraSystem {
	return &CameraSystem{}
}

// RequestScreenShake queues a shake lasting durationTicks update calls. A new request
// replaces any in-progress shake.
func (cs *CameraSystem) RequestScreenShake(durationTicks int, intensity float64) {
	if durationTicks <= 0 {
		return
	}
	cs.shakeTicksRemaining = durationTicks
	cs.shakeIntensity = intensity
}

// Update ticks down timers and recomputes per-frame jitter. Call once per game tick.
func (cs *CameraSystem) Update() {
	if cs.shakeTicksRemaining <= 0 {
		cs.shakeTicksRemaining = 0
		cs.shakeIntensity = 0
		cs.shakeOffsetX = 0
		cs.shakeOffsetY = 0
		return
	}

	cs.shakeOffsetX = (rand.Float64()*2.0 - 1.0) * cs.shakeIntensity
	cs.shakeOffsetY = (rand.Float64()*2.0 - 1.0) * cs.shakeIntensity
	cs.shakeTicksRemaining--
}

// CameraOffset returns translation to apply on top of the normal playfield margin.
func (cs *CameraSystem) CameraOffset() (float64, float64) {
	return cs.shakeOffsetX, cs.shakeOffsetY
}
