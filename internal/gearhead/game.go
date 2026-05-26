package gearhead

import (
	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/draw"
	"github.com/danmcfan/arcade/internal/input"
	"image"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	height = 256.0
)

type entity struct {
	Image          *ebiten.Image
	Position       draw.Vector
	Width          float64
	Height         float64
	Frame          float64
	FrameIncrement float64
	Left           bool
	Moving         bool
}

func newPlayer() *entity {
	return &entity{
		Image:          assets.ImageGnome,
		Position:       draw.NewVector(16, height-16),
		Width:          16,
		Height:         16,
		FrameIncrement: 0.2,
	}
}

type GearHeadSoftware struct {
	player *entity
}

func NewGearHeadSoftware() *GearHeadSoftware {
	return &GearHeadSoftware{
		player: newPlayer(),
	}
}

func (g *GearHeadSoftware) Background() *ebiten.Image {
	return assets.ImageWorkshop
}

func (g *GearHeadSoftware) Update(i input.Input) error {
	if i.Moving() {
		g.player.Moving = true
		g.player.Frame += g.player.FrameIncrement
		if g.player.Frame >= 4 {
			g.player.Frame = 0
		}
	} else {
		g.player.Moving = false
		g.player.Frame = 0
	}

	if i.Direction() == input.DirectionLeft {
		g.player.Left = true
	}

	if i.Direction() == input.DirectionRight {
		g.player.Left = false
	}

	if g.player.Moving {
		if g.player.Left {
			g.player.Position = draw.Sub(g.player.Position, draw.NewVector(1, 0))
		} else {
			g.player.Position = draw.Add(g.player.Position, draw.NewVector(1, 0))
		}
	}

	if g.player.Position.X <= 6 {
		g.player.Position.X = 6
	}

	if g.player.Position.X >= 108 {
		g.player.Position.X = 108
	}

	return nil
}

func (g *GearHeadSoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawBackground(screen, g.Background(), buffer)

	drawPlayer(screen, g.player, buffer)
}

func (g *GearHeadSoftware) GameOver() bool {
	return false
}

func (g *GearHeadSoftware) Score() int {
	return 0
}

func drawBackground(screen *ebiten.Image, background *ebiten.Image, buffer float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(buffer, buffer)
	screen.DrawImage(background, op)
}

func drawPlayer(screen *ebiten.Image, player *entity, buffer float64) {
	frame := int(player.Frame)

	switch frame {
	case 2:
		frame = 0
	case 3:
		frame = 2
	}

	img := player.Image.SubImage(image.Rect(frame*int(player.Width), 0, (frame+1)*int(player.Width), int(player.Height))).(*ebiten.Image)
	position := draw.Add(player.Position, draw.NewVector(buffer, buffer))
	position = draw.Sub(position, draw.NewVector(player.Width/2, player.Height/2))

	op := &ebiten.DrawImageOptions{}
	if player.Left {
		op.GeoM.Scale(-1, 1)
		op.GeoM.Translate(player.Width, 0)
	}

	op.GeoM.Translate(position.X, position.Y)
	screen.DrawImage(img, op)
}
