package gearhead

import (
	"arcade/internal/assets"
	"arcade/internal/input"

	"github.com/hajimehoshi/ebiten/v2"
)

type GearHeadSoftware struct{}

func NewGearHeadSoftware() *GearHeadSoftware {
	return &GearHeadSoftware{}
}

func (g *GearHeadSoftware) Background() *ebiten.Image {
	return assets.ImageWorkshop
}

func (g *GearHeadSoftware) Update(i input.InputState) error {
	return nil
}

func (g *GearHeadSoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawImage(screen, g.Background(), buffer, buffer)
}

func (g *GearHeadSoftware) GameOver() bool {
	return false
}

func (g *GearHeadSoftware) Score() int {
	return 0
}

func drawImage(screen *ebiten.Image, img *ebiten.Image, x, y float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(x, y)
	screen.DrawImage(img, op)
}
