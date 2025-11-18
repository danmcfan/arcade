package firefly

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"image"
	"math"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	tileSize   = 8
	tileWidth  = 28
	tileHeight = 36
)

type vector struct {
	x float64
	y float64
}

func add(a, b vector) vector {
	return vector{x: a.x + b.x, y: a.y + b.y}
}

func sub(a, b vector) vector {
	return vector{x: a.x - b.x, y: a.y - b.y}
}

type Pattern func(t int) vector

func NewPatternFigureEight(cx, cy, w, h, s float64) Pattern {
	return func(t int) vector {
		angle := float64(t) * s

		x := cx + w*math.Sin(angle)
		y := cy + h*math.Sin(2*angle)

		return vector{x: x, y: y}
	}
}

type entity struct {
	Image            *ebiten.Image
	Position         vector
	PreviousPosition vector
	Direction        vector
	Width            float64
	Height           float64
	Dead             bool
	DeadFrames       int
	Pattern          Pattern
	Duration         int
}

func newPlayer() *entity {
	return &entity{
		Image:     assets.ImageShip,
		Position:  vector{x: tileSize * tileWidth / 2, y: tileSize*tileHeight - tileSize*3},
		Direction: vector{x: 2.0, y: 0},
		Width:     tileSize * 2,
		Height:    tileSize * 2,
	}
}

func newBug(pattern Pattern, duration int) *entity {
	return &entity{
		Image:    assets.ImageBug,
		Width:    tileSize * 2,
		Height:   tileSize * 2,
		Pattern:  pattern,
		Duration: duration,
	}
}

func newBugs() []*entity {
	return []*entity{
		newBug(NewPatternFigureEight(tileSize*14, tileSize*6, tileSize*10, tileSize*3, 0.025), 0),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*6, tileSize*10, tileSize*3, 0.025), 25),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*6, tileSize*10, tileSize*3, 0.025), 50),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*6, tileSize*10, tileSize*3, 0.025), 75),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*6, tileSize*10, tileSize*3, 0.025), 100),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*10, tileSize*10, tileSize*3, 0.025), 0),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*10, tileSize*10, tileSize*3, 0.025), 25),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*10, tileSize*10, tileSize*3, 0.025), 50),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*10, tileSize*10, tileSize*3, 0.025), 75),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*10, tileSize*10, tileSize*3, 0.025), 100),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*14, tileSize*10, tileSize*3, 0.025), 0),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*14, tileSize*10, tileSize*3, 0.025), 25),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*14, tileSize*10, tileSize*3, 0.025), 50),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*14, tileSize*10, tileSize*3, 0.025), 75),
		newBug(NewPatternFigureEight(tileSize*14, tileSize*14, tileSize*10, tileSize*3, 0.025), 100),
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

func (f *FireFlySoftware) Update(i input.InputState) error {
	if i.Interact {
		if f.fireDelay <= 0 {
			f.bullets = append(f.bullets, &entity{
				Image:     assets.ImageBullet,
				Position:  add(f.player.Position, vector{x: 0, y: -tileSize}),
				Direction: vector{x: 0, y: -5.0},
			})
			f.fireDelay = 20
		}
	}

	if f.fireDelay > 0 {
		f.fireDelay--
	}

	newPosition := f.player.Position
	switch i.MoveDirection {
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

		bug.PreviousPosition = bug.Position
		bug.Position = bug.Pattern(bug.Duration)
		bug.Direction = sub(bug.Position, bug.PreviousPosition)
		bug.Duration++
	}

	f.bugs = slices.DeleteFunc(f.bugs, func(b *entity) bool {
		return b.Dead
	})

	return nil
}

func (f *FireFlySoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawImage(screen, f.Background(), vector{x: buffer, y: buffer})

	position := add(f.player.Position, vector{x: buffer, y: buffer})
	position = sub(position, vector{x: f.player.Width / 2, y: f.player.Height / 2})
	drawImage(screen, f.player.Image, position)

	for _, bullet := range f.bullets {
		position := add(bullet.Position, vector{x: buffer, y: buffer})
		position = sub(position, vector{x: bullet.Width / 2, y: bullet.Height / 2})
		drawImage(screen, bullet.Image, position)
	}

	for _, bug := range f.bugs {
		position := add(bug.Position, vector{x: buffer, y: buffer})

		if bug.DeadFrames > 0 {
			position = sub(position, vector{x: 16, y: 16})

			col := 5 - float64(int(bug.DeadFrames/15))
			img := cutImage(assets.ImageExplosion, image.Rect(int(col*32), 0, int((col+1)*32), 32))
			drawImage(screen, img, position)
			continue
		}

		position = sub(position, vector{x: bug.Width / 2, y: bug.Height / 2})

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

func collide(a, b vector) bool {
	return math.Abs(a.x-b.x) < tileSize && math.Abs(a.y-b.y) < tileSize
}

func frameAngle(angle float64) (float64, float64) {
	row := float64(int(angle / 90))
	col := float64(int(math.Mod(angle, 90) / 15))
	return row, col
}

func angle(direction vector) float64 {
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

func drawImage(screen *ebiten.Image, img *ebiten.Image, position vector) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(position.x, position.y)
	screen.DrawImage(img, op)
}
