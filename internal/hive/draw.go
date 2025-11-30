package hive

import (
	"arcade/internal/assets"
	"fmt"
	"image"
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

const debug = true

func (s *HiveSoftware) Draw(screen *ebiten.Image, buffer float64) {
	drawBackground(s, screen, buffer)
	drawScore(s, screen, buffer)
	drawHighScore(s, screen, buffer)
	drawLives(s, screen, buffer)
	drawReady(s, screen, buffer)
	drawItems(s, screen, buffer)
	drawPlayer(s, screen, buffer)
	drawTiles(s, screen, buffer, debug)
	drawLines(s, screen, buffer, debug)
	drawEnemies(s, screen, buffer)
	drawMode(s, screen, buffer, debug)
}

func drawBackground(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(buffer, buffer)
	screen.DrawImage(s.Background(), op)
}

func drawScore(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	drawInteger(screen, buffer, s.score, 1, 1)
}

func drawHighScore(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	highScore := int(math.Max(float64(s.score), float64(s.highScore)))
	drawInteger(screen, buffer, highScore, 11, 1)
}

func drawLives(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	for i := 0; i < s.lives-1; i++ {
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(8*(2+i*2))+buffer, float64((8*34)+1)+buffer)

		sw := assets.ImageBear.Bounds().Dx() / 4
		sh := assets.ImageBear.Bounds().Dy() / 4
		spriteFrame := assets.ImageBear.SubImage(image.Rect(0, 0, sw, sh)).(*ebiten.Image)

		screen.DrawImage(spriteFrame, op)
	}
}

func drawReady(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	if s.startTicks <= 0 {
		return
	}

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64(8*11)+buffer, float64(8*20)+buffer)
	screen.DrawImage(assets.ImageReady, op)
}

func drawItems(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	for _, item := range s.items {
		if item == nil {
			continue
		}

		drawEntity(item, screen, buffer)
	}
}

func drawPlayer(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	drawEntity(s.player, screen, buffer)
}

func drawTiles(s *HiveSoftware, screen *ebiten.Image, buffer float64, debug bool) {
	if !debug {
		return
	}

	for _, e := range s.enemies {
		drawTile(screen, buffer, pointToTile(e.X, e.Y), e.color)
		drawTile(screen, buffer, findTarget(e, s.enemies, s.player, s.modeCurrent), e.color)
	}
}

func drawLines(s *HiveSoftware, screen *ebiten.Image, buffer float64, debug bool) {
	if !debug {
		return
	}

	for _, e := range s.enemies {
		target := findTarget(e, s.enemies, s.player, s.modeCurrent)

		sx := float32(e.X + buffer)
		sy := float32(e.Y + buffer)
		dx := float32(target.x*tileSize + int(buffer))
		dy := float32(target.y*tileSize + int(buffer))

		vector.StrokeLine(screen, sx, sy, dx, dy, 1, e.color, false)
	}
}

func drawEnemies(s *HiveSoftware, screen *ebiten.Image, buffer float64) {
	for _, enemy := range s.enemies {
		drawEntity(enemy, screen, buffer)
	}
}

func drawMode(s *HiveSoftware, screen *ebiten.Image, buffer float64, debug bool) {
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
	ebitenutil.DebugPrintAt(screen, fmt.Sprintf("[%d] %s: %d", s.modeIndex, mode, s.modeTicks), int(tileSize*(tileWidth-14)+buffer), int(tileSize*(tileHeight-2)+buffer))
}

func drawInteger(screen *ebiten.Image, buffer float64, value int, tx int, ty int) {
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
		op.GeoM.Translate(float64(8*(tx+i))+buffer, float64(8*ty)+buffer)
		screen.DrawImage(digitFrame, op)
	}
}

func drawEntity(e *Entity, screen *ebiten.Image, buffer float64) {
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
	op.GeoM.Translate(e.X-e.Width/2+buffer, e.Y-e.Height/2+buffer)
	screen.DrawImage(spriteFrame, op)
}

func drawTile(screen *ebiten.Image, buffer float64, tile tile, color color.Color) {
	img := ebiten.NewImageFromImage(image.NewRGBA(image.Rect(0, 0, tileSize, tileSize)))
	img.Fill(color)

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(buffer, buffer)
	op.GeoM.Translate(float64(tile.x*tileSize), float64(tile.y*tileSize))
	screen.DrawImage(img, op)
}
