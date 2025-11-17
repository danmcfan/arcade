package firefly

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	tileSize   = 8
	tileWidth  = 28
	tileHeight = 36
)

type entity struct {
	Image    *ebiten.Image
	X        float64
	Y        float64
	Width    float64
	Height   float64
	Velocity float64
	Dead     bool
}

func newPlayer() *entity {
	return &entity{
		Image:    assets.ImageShip,
		X:        tileSize * tileWidth / 2,
		Y:        tileSize*tileHeight - tileSize*3,
		Width:    tileSize * 2,
		Height:   tileSize * 2,
		Velocity: 2.0,
	}
}

type FireFlySoftware struct {
	player  *entity
	bullets []*entity

	fireDelay int
}

func NewFireFlySoftware() *FireFlySoftware {
	return &FireFlySoftware{
		player: newPlayer(),
	}
}

func (f *FireFlySoftware) Update(i input.InputState) error {
	if i.Interact {
		if f.fireDelay <= 0 {
			f.bullets = append(f.bullets, &entity{
				Image:    assets.ImageBullet,
				X:        f.player.X,
				Y:        f.player.Y - tileSize,
				Width:    tileSize,
				Height:   tileSize,
				Velocity: 5.0,
			})
			f.fireDelay = 20
		}
	}

	if f.fireDelay > 0 {
		f.fireDelay--
	}

	newX := f.player.X
	switch i.MoveDirection {
	case input.DirectionLeft:
		newX -= f.player.Velocity
	case input.DirectionRight:
		newX += f.player.Velocity
	}

	if newX < f.player.Width/2 {
		newX = f.player.Width / 2
	}
	if newX > tileSize*tileWidth-f.player.Width/2+1 {
		newX = tileSize*tileWidth - f.player.Width/2 + 1
	}

	f.player.X = newX

	for _, bullet := range f.bullets {
		bullet.Y -= bullet.Velocity
		if bullet.Y <= bullet.Height/2 {
			bullet.Dead = true
		}
	}

	f.bullets = slices.DeleteFunc(f.bullets, func(b *entity) bool {
		return b.Dead
	})

	return nil
}

func (f *FireFlySoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawImage(screen, f.Background(), buffer, buffer)

	drawImage(screen, f.player.Image, f.player.X+buffer-f.player.Width/2, f.player.Y+buffer-f.player.Height/2)

	for _, bullet := range f.bullets {
		drawImage(screen, bullet.Image, bullet.X+buffer-bullet.Width/2, bullet.Y+buffer-bullet.Height/2)
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

func drawImage(screen *ebiten.Image, img *ebiten.Image, x, y float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(x, y)
	screen.DrawImage(img, op)
}
