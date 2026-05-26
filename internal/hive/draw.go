package hive

import (
	"github.com/danmcfan/arcade/internal/assets"
	"fmt"
	"image"
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

const debug = false

func (s *HiveSoftware) Draw(screen *ebiten.Image, buffer float64) {
	ox, oy := s.camera.CameraOffset()
	bufX := buffer + ox
	bufY := buffer + oy
	drawBackground(s, screen, bufX, bufY)
	drawScore(s, screen, bufX, bufY)
	drawHighScore(s, screen, bufX, bufY)
	drawLives(s, screen, bufX, bufY)
	drawReady(s, screen, bufX, bufY)
	drawItems(s, screen, bufX, bufY)
	drawPlayer(s, screen, bufX, bufY)
	drawTiles(s, screen, bufX, bufY, debug)
	drawLines(s, screen, bufX, bufY, debug)
	drawEnemies(s, screen, bufX, bufY)
	s.particles.Draw(screen, bufX, bufY)
	drawMode(s, screen, bufX, bufY, debug)
}

func drawBackground(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(bufX, bufY)
	screen.DrawImage(s.Background(), op)
}

func drawScore(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	drawInteger(screen, bufX, bufY, s.score, 1, 1)
}

func drawHighScore(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	highScore := int(math.Max(float64(s.score), float64(s.highScore)))
	drawInteger(screen, bufX, bufY, highScore, 11, 1)
}

func drawLives(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	for i := 0; i < s.lives-1; i++ {
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(8*(2+i*2))+bufX, float64((8*34)+1)+bufY)

		sw := assets.ImageBear.Bounds().Dx() / 4
		sh := assets.ImageBear.Bounds().Dy() / 4
		spriteFrame := assets.ImageBear.SubImage(image.Rect(0, 0, sw, sh)).(*ebiten.Image)

		screen.DrawImage(spriteFrame, op)
	}
}

func drawReady(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	if s.startTicks <= 0 {
		return
	}

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64(8*11)+bufX, float64(8*20)+bufY)
	screen.DrawImage(assets.ImageReady, op)
}

func drawItems(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	for _, item := range s.items {
		if item == nil {
			continue
		}

		drawEntity(item, screen, bufX, bufY)
	}
}

func drawPlayer(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	drawEntity(s.player, screen, bufX, bufY)
}

func drawTiles(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64, debug bool) {
	if !debug {
		return
	}

	for _, e := range s.enemies {
		drawTile(screen, bufX, bufY, pointToTile(e.X, e.Y), e.color)
		drawTile(screen, bufX, bufY, findTarget(e, s.enemies, s.player, s.modeCurrent), e.color)
	}
}

func drawLines(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64, debug bool) {
	if !debug {
		return
	}

	for _, e := range s.enemies {
		target := findTarget(e, s.enemies, s.player, s.modeCurrent)

		sx := float32(e.X + bufX)
		sy := float32(e.Y + bufY)
		dx := float32(float64(target.x*tileSize) + bufX)
		dy := float32(float64(target.y*tileSize) + bufY)

		vector.StrokeLine(screen, sx, sy, dx, dy, 1, e.color, false)
	}
}

func drawEnemies(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	for _, enemy := range s.enemies {
		drawEntity(enemy, screen, bufX, bufY)
	}
}

func drawMode(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64, debug bool) {
	if !debug {
		return
	}

	var mode string
	switch s.modeCurrent {
	case modeScatter:
		mode = "Scatter"
	case modeChase:
		mode = "Chase"
	}
	ebitenutil.DebugPrintAt(screen, fmt.Sprintf("[%d] %s: %d", s.modeIndex, mode, s.modeTicks), int(float64(tileSize*(tileWidth-14))+bufX), int(float64(tileSize*(tileHeight-2))+bufY))
}

func drawInteger(screen *ebiten.Image, bufX, bufY float64, value int, tx int, ty int) {
	digits := []int{
		value / 100_000,
		(value % 100_000) / 10_000,
		(value % 10_000) / 1_000,
		(value % 1_000) / 100,
		(value % 100) / 10,
		value % 10,
	}

	leadingZero := true
	for i, digit := range digits {
		if i >= len(digits)-2 {
			leadingZero = false
		}

		if digit == 0 && leadingZero {
			continue
		}

		if digit != 0 {
			leadingZero = false
		}

		dw := assets.ImageDigits.Bounds().Dx() / 10
		dh := assets.ImageDigits.Bounds().Dy()
		digitFrame := assets.ImageDigits.SubImage(image.Rect(digit*dw, 0, (digit+1)*dw, dh)).(*ebiten.Image)

		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(8*(tx+i))+bufX, float64(8*ty)+bufY)
		screen.DrawImage(digitFrame, op)
	}
}

func drawEntity(e *Entity, screen *ebiten.Image, bufX, bufY float64) {
	if e == nil || e.Sprite == nil {
		return
	}

	row := e.FrameDirection[e.Direction]

	if e.BlueFrames > 0 {
		row += 2
		if e.Flash {
			row += 2
		}
	}

	sx := e.Width * float64(int(e.Frame))
	sy := e.Height * float64(int(row))
	sw := e.Width
	sh := e.Height

	spriteFrame := e.Sprite.SubImage(image.Rect(int(sx), int(sy), int(sx+sw), int(sy+sh))).(*ebiten.Image)

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(e.X-e.Width/2+bufX, e.Y-e.Height/2+bufY)
	screen.DrawImage(spriteFrame, op)
}

func drawTile(screen *ebiten.Image, bufX, bufY float64, tile tile, color color.Color) {
	img := ebiten.NewImageFromImage(image.NewRGBA(image.Rect(0, 0, tileSize, tileSize)))
	img.Fill(color)

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(bufX, bufY)
	op.GeoM.Translate(float64(tile.x*tileSize), float64(tile.y*tileSize))
	screen.DrawImage(img, op)
}
