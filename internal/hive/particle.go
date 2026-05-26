package hive

import (
	"image/color"
	"math"
	"math/rand"

	"github.com/hajimehoshi/ebiten/v2"
)

const maxParticles = 300

const (
	particleSize              = 3
	particleBurstBeeEatenCount    = 25
	particleBurstPlayerEatenCount = 25
)

var (
	// #72dcbb — burst when the player eats a bee.
	particleColorTeal = color.RGBA{R: 0x72, G: 0xdc, B: 0xbb, A: 255}
	// #ee6a7c — burst when a bee eats the player.
	particleColorRed = color.RGBA{R: 0xee, G: 0x6a, B: 0x7c, A: 255}
)

type Particle struct {
	X, Y           float64
	Vx, Vy         float64 // pixels per tick
	Color          color.RGBA
	LifeTicks      int
	MaxLifeTicks   int
	Active         bool
}

// ParticleSystem recycles a fixed pool of particles to avoid per-frame allocations.
type ParticleSystem struct {
	pool  [maxParticles]Particle
	pixel *ebiten.Image
}

func NewParticleSystem() *ParticleSystem {
	ps := &ParticleSystem{}
	ps.pixel = ebiten.NewImage(particleSize, particleSize)
	ps.pixel.Fill(color.White)
	return ps
}

// SpawnBurst creates a cluster of particles at the given playfield coordinates.
func (ps *ParticleSystem) SpawnBurst(x, y float64, col color.RGBA, count int) {
	if count <= 0 {
		return
	}

	spawned := 0
	for i := range ps.pool {
		if ps.pool[i].Active {
			continue
		}

		angle := rand.Float64() * 2 * math.Pi
		speed := (50.0 + rand.Float64()*100.0) / float64(framesPerSecond)

		ps.pool[i].X = x
		ps.pool[i].Y = y
		ps.pool[i].Vx = math.Cos(angle) * speed
		ps.pool[i].Vy = math.Sin(angle) * speed
		ps.pool[i].Color = col
		ps.pool[i].MaxLifeTicks = 18 + int(rand.Float64()*24) // ~0.3–0.7s at 60 ticks/s
		ps.pool[i].LifeTicks = ps.pool[i].MaxLifeTicks
		ps.pool[i].Active = true

		spawned++
		if spawned >= count {
			break
		}
	}
}

// Update advances physics for all active particles. Call once per game tick.
func (ps *ParticleSystem) Update() {
	for i := range ps.pool {
		p := &ps.pool[i]
		if !p.Active {
			continue
		}

		p.LifeTicks--
		if p.LifeTicks <= 0 {
			p.Active = false
			continue
		}

		p.X += p.Vx
		p.Y += p.Vy
		p.Vx *= 0.95
		p.Vy *= 0.95
	}
}

// Draw renders active particles using bufX/bufY so they move with camera shake.
func (ps *ParticleSystem) Draw(screen *ebiten.Image, bufX, bufY float64) {
	half := float64(particleSize) / 2
	for i := range ps.pool {
		p := &ps.pool[i]
		if !p.Active {
			continue
		}

		alpha := float64(p.LifeTicks) / float64(p.MaxLifeTicks)
		fadedColor := color.RGBA{
			R: p.Color.R,
			G: p.Color.G,
			B: p.Color.B,
			A: uint8(alpha * 255),
		}

		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(p.X-half+bufX, p.Y-half+bufY)
		op.ColorScale.ScaleWithColor(fadedColor)
		screen.DrawImage(ps.pixel, op)
	}
}
