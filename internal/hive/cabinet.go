package hive

import (
	"image"

	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/input"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	cabinetWidth  = 336
	cabinetHeight = 428

	cabinetFrameWidth  = 336
	cabinetFrameHeight = 428

	cabinetInsetTop    = 56
	cabinetInsetBottom = 84
	cabinetInsetLeft   = 56
	cabinetInsetRight  = 56

	cabinetFrameNeutral = 0
	cabinetFrameUp      = 1
	cabinetFrameDown    = 2
	cabinetFrameLeft    = 3
	cabinetFrameRight   = 4
)

func cabinetJoystickFrame(i input.Input) int {
	if !i.Moving() {
		return cabinetFrameNeutral
	}
	switch i.Direction() {
	case input.DirectionUp:
		return cabinetFrameUp
	case input.DirectionDown:
		return cabinetFrameDown
	case input.DirectionLeft:
		return cabinetFrameLeft
	case input.DirectionRight:
		return cabinetFrameRight
	default:
		return cabinetFrameNeutral
	}
}

func drawCabinet(screen *ebiten.Image, frame int) {
	if frame < cabinetFrameNeutral {
		frame = cabinetFrameNeutral
	}
	if frame > cabinetFrameRight {
		frame = cabinetFrameRight
	}

	sx := frame * cabinetFrameWidth
	frameImg := assets.ImageCabinet.SubImage(image.Rect(sx, 0, sx+cabinetFrameWidth, cabinetFrameHeight)).(*ebiten.Image)

	op := &ebiten.DrawImageOptions{}
	screen.DrawImage(frameImg, op)
}
