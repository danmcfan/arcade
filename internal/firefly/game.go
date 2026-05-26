package firefly

import (
	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/input"
	"image"
	"math"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	debug = false

	tileSize   = 8
	tileWidth  = 28
	tileHeight = 36
)

var leftBezierConfig = bezierConfig{
	p0: vec{x: tileSize * 16, y: tileSize * 1},
	p1: vec{x: tileSize * -14, y: tileSize * 24},
	p2: vec{x: tileSize * 14, y: tileSize * 36},
	p3: vec{x: tileSize * 14, y: tileSize * 12},
}

var rightBezierConfig = bezierConfig{
	p0: vec{x: tileSize * 12, y: tileSize * 1},
	p1: vec{x: tileSize * 42, y: tileSize * 24},
	p2: vec{x: tileSize * 14, y: tileSize * 36},
	p3: vec{x: tileSize * 14, y: tileSize * 12},
}

type vec struct {
	x float64
	y float64
}

func add(a, b vec) vec {
	return vec{x: a.x + b.x, y: a.y + b.y}
}

func sub(a, b vec) vec {
	return vec{x: a.x - b.x, y: a.y - b.y}
}

type entity struct {
	Image            *ebiten.Image
	Position         vec
	PreviousPosition vec
	Direction        vec
	Width            float64
	Height           float64
	Dead             bool
	DeadFrames       int
	Pattern          patternFunc
	Duration         float64
	DurationStep     float64
}

func newPlayer() *entity {
	return &entity{
		Image:     assets.ImageShip,
		Position:  vec{x: tileSize * tileWidth / 2, y: tileSize*tileHeight - tileSize*3},
		Direction: vec{x: 2.0, y: 0},
		Width:     tileSize * 2,
		Height:    tileSize * 2,
	}
}

func newBug(pattern patternFunc, initialDuration float64, durationStep float64) *entity {
	return &entity{
		Image:        assets.ImageBug,
		Width:        tileSize * 2,
		Height:       tileSize * 2,
		Pattern:      pattern,
		Duration:     initialDuration,
		DurationStep: durationStep,
	}
}

func newBugs() []*entity {
	durationStep := 1.0 / (FRAMES_PER_SECOND * 3)

	leftPatternFunc := NewBezierPatternFunc(leftBezierConfig)
	rightPatternFunc := NewBezierPatternFunc(rightBezierConfig)

	return []*entity{
		newBug(leftPatternFunc, -durationStep*FRAMES_PER_SECOND*0, durationStep),
		newBug(leftPatternFunc, -durationStep*FRAMES_PER_SECOND*0.2, durationStep),
		newBug(leftPatternFunc, -durationStep*FRAMES_PER_SECOND*0.4, durationStep),
		newBug(leftPatternFunc, -durationStep*FRAMES_PER_SECOND*0.6, durationStep),
		newBug(leftPatternFunc, -durationStep*FRAMES_PER_SECOND*0.8, durationStep),

		newBug(rightPatternFunc, -durationStep*FRAMES_PER_SECOND*0, durationStep),
		newBug(rightPatternFunc, -durationStep*FRAMES_PER_SECOND*0.2, durationStep),
		newBug(rightPatternFunc, -durationStep*FRAMES_PER_SECOND*0.4, durationStep),
		newBug(rightPatternFunc, -durationStep*FRAMES_PER_SECOND*0.6, durationStep),
		newBug(rightPatternFunc, -durationStep*FRAMES_PER_SECOND*0.8, durationStep),
	}
}

type FireFlySoftware struct {
	player  *entity
	bullets []*entity

	bugs []*entity

	fireDelay int
}

func NewFireFlySoftware() *FireFlySoftware {
	return &FireFlySoftware{
		player: newPlayer(),
		bugs:   newBugs(),
	}
}

func (f *FireFlySoftware) Update(i input.Input) error {
	if len(f.bugs) == 0 {
		f.bugs = newBugs()
	}

	if i.Space {
		if f.fireDelay <= 0 {
			f.bullets = append(f.bullets, &entity{
				Image:     assets.ImageBullet,
				Position:  add(f.player.Position, vec{x: -tileSize / 2, y: -tileSize}),
				Direction: vec{x: 0, y: -5.0},
			})
			f.fireDelay = 20

			assets.SoundLaser.Rewind()
			assets.SoundLaser.Play()
		}
	}

	if f.fireDelay > 0 {
		f.fireDelay--
	}

	newPosition := f.player.Position
	switch i.Direction() {
	case input.DirectionLeft:
		newPosition = sub(newPosition, f.player.Direction)
	case input.DirectionRight:
		newPosition = add(newPosition, f.player.Direction)
	}

	if newPosition.x < f.player.Width/2 {
		newPosition.x = f.player.Width / 2
	}
	if newPosition.x > tileSize*tileWidth-f.player.Width/2+1 {
		newPosition.x = tileSize*tileWidth - f.player.Width/2 + 1
	}

	f.player.Position = newPosition

	for _, bullet := range f.bullets {
		bullet.Position = add(bullet.Position, bullet.Direction)
		if bullet.Position.y <= bullet.Height/2 {
			bullet.Dead = true
		}
	}

	for _, bullet := range f.bullets {
		for _, bug := range f.bugs {
			if bug.DeadFrames > 0 {
				continue
			}

			if collide(bullet.Position, bug.Position) {
				bullet.Dead = true
				bug.DeadFrames = 75

				assets.SoundBoom.Rewind()
				assets.SoundBoom.Play()

				break // only one bug per bullet
			}
		}
	}

	f.bullets = slices.DeleteFunc(f.bullets, func(b *entity) bool {
		return b.Dead
	})

	for _, bug := range f.bugs {
		if bug.DeadFrames > 0 {
			bug.DeadFrames--
			if bug.DeadFrames == 0 {
				bug.Dead = true
			}
			continue
		}

		if bug.Duration < 0 {
			bug.Duration += bug.DurationStep
			continue
		}

		bug.PreviousPosition = bug.Position
		if bug.Duration > 1 {
			bug.Position = sub(bug.Position, vec{x: 0, y: 2.5})
		} else {
			bug.Position = bug.Pattern(bug.Duration)
			bug.Duration += bug.DurationStep
		}

		bug.Direction = sub(bug.Position, bug.PreviousPosition)

		if bug.Position.y < 0 {
			bug.Dead = true
		}
	}

	f.bugs = slices.DeleteFunc(f.bugs, func(b *entity) bool {
		return b.Dead
	})

	return nil
}

func (f *FireFlySoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawImage(screen, f.Background(), vec{x: buffer, y: buffer})

	if debug {
		DrawBezierDebug(screen, leftBezierConfig, buffer, 100)
		DrawBezierDebug(screen, rightBezierConfig, buffer, 100)
	}

	position := add(f.player.Position, vec{x: buffer, y: buffer})
	position = sub(position, vec{x: f.player.Width / 2, y: f.player.Height / 2})
	drawImage(screen, f.player.Image, position)

	for _, bullet := range f.bullets {
		position := add(bullet.Position, vec{x: buffer, y: buffer})
		position = sub(position, vec{x: bullet.Width / 2, y: bullet.Height / 2})
		drawImage(screen, bullet.Image, position)
	}

	for _, bug := range f.bugs {
		if bug.Position.x <= 0 || bug.Position.x >= tileSize*tileWidth || bug.Position.y <= 0 || bug.Position.y >= tileSize*tileHeight {
			continue
		}

		position := add(bug.Position, vec{x: buffer, y: buffer})

		if bug.DeadFrames > 0 {
			position = sub(position, vec{x: 16, y: 16})

			col := 5 - float64(int(bug.DeadFrames/15))
			img := cutImage(assets.ImageExplosion, image.Rect(int(col*32), 0, int((col+1)*32), 32))
			drawImage(screen, img, position)
			continue
		}

		position = sub(position, vec{x: bug.Width / 2, y: bug.Height / 2})

		row, col := frameAngle(angle(bug.Direction))
		img := cutImage(bug.Image, image.Rect(int(col*bug.Width), int(row*bug.Height), int((col+1)*bug.Width), int((row+1)*bug.Height)))
		drawImage(screen, img, position)
	}
}

func (f *FireFlySoftware) GameOver() bool {
	return false
}

func (f *FireFlySoftware) Score() int {
	return 0
}

func (f *FireFlySoftware) Background() *ebiten.Image {
	return assets.ImageGalaxy
}

func collide(a, b vec) bool {
	return math.Abs(a.x-b.x) < tileSize && math.Abs(a.y-b.y) < tileSize
}

func frameAngle(angle float64) (float64, float64) {
	row := float64(int(angle / 90))
	col := float64(int(math.Mod(angle, 90) / 15))
	return row, col
}

func angle(direction vec) float64 {
	if direction.x == 0 && direction.y == 0 {
		return 0
	}

	angle := math.Atan2(direction.y, direction.x) * (180 / math.Pi)
	angle += 90

	if angle < 0 {
		angle += 360
	}

	return angle
}

func cutImage(img *ebiten.Image, rect image.Rectangle) *ebiten.Image {
	return img.SubImage(rect).(*ebiten.Image)
}

func drawImage(screen *ebiten.Image, img *ebiten.Image, position vec) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(position.x, position.y)
	screen.DrawImage(img, op)
}
