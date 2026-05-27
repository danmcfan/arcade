package hive

import (
	"fmt"
	"image"
	"image/color"
	"math"

	"github.com/danmcfan/arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

const debug = false

func (s *HiveSoftware) Draw(screen *ebiten.Image, _ float64) {
	drawCabinet(screen, s.cabinetJoystickFrame)

	ox, oy := s.camera.CameraOffset()
	bufX := cabinetInsetLeft + ox
	bufY := cabinetInsetTop + oy
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
	drawBonusEatIndicators(s, screen, bufX, bufY)
	s.particles.Draw(screen, bufX, bufY)
	drawMode(s, screen, bufX, bufY, debug)
}

func drawBackground(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(bufX, bufY)
	screen.DrawImage(s.Background(), op)
}

func drawScore(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	drawRollingInteger(s, screen, bufX, bufY, s.score, 1, 1, &s.scoreDial)
}

func drawHighScore(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	highScore := int(math.Max(float64(s.score), float64(s.highScore)))
	drawRollingInteger(s, screen, bufX, bufY, highScore, 11, 1, &s.highScoreDial)
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

const readyGlyphWidth = 8 // ImageReady ("READY!") strips: 48×8 → six 8×8 glyphs.

const (
	readyWaveAmpPx         = 2.0
	readyWaveTimeRad       = 0.14 // sine advance per elapsed START frame
	readyWaveGlyphPhaseRad = 1.05 // phase step between adjacent glyphs (radians)
)

func drawReady(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	if s.startTicks <= 0 {
		return
	}

	img := assets.ImageReady
	b := img.Bounds()
	count := b.Dx() / readyGlyphWidth
	if count <= 0 {
		return
	}

	baseX := float64(8*11) + bufX
	baseY := float64(8*20) + bufY + 1

	// startTicks counts down during START; more elapsed ⇒ larger phase progression.
	intoReady := float64(startTicks - s.startTicks)

	for i := range count {
		rx := i * readyGlyphWidth
		glyph := img.SubImage(image.Rect(rx, 0, rx+readyGlyphWidth, b.Dy())).(*ebiten.Image)

		// Traveling wave along the string (vertical offset only).
		dy := readyWaveAmpPx * math.Sin(intoReady*readyWaveTimeRad+float64(i)*readyWaveGlyphPhaseRad)

		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(baseX+float64(rx), baseY+dy)
		screen.DrawImage(glyph, op)
	}
}

func drawItems(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	pelletFrame := (s.pelletAnimTick / pelletAnimHoldTicks) % pelletAnimFrameCount
	for _, item := range s.items {
		if item == nil {
			continue
		}

		if item.Sprite == assets.ImageFood {
			drawFoodAtlas(item, screen, bufX, bufY, pelletFrame)
			continue
		}
		drawEntity(item, screen, bufX, bufY)
	}
}

func drawFoodAtlas(e *Entity, screen *ebiten.Image, bufX, bufY float64, animFrame int) {
	if e == nil || e.Sprite == nil {
		return
	}

	frame := animFrame % pelletAnimFrameCount
	sx := frame * pelletAtlasCellW
	sy := pelletAtlasSmallRowY
	if e.PowerPellet {
		sy = pelletAtlasPowerRowY
	}
	frameRect := e.Sprite.SubImage(image.Rect(sx, sy, sx+pelletAtlasCellW, sy+pelletAtlasCellH)).(*ebiten.Image)

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(math.Round(bufX+e.X-e.Width/2), math.Round(bufY+e.Y-e.Height/2))
	screen.DrawImage(frameRect, op)
}

func drawPlayer(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	if s.player == nil || s.player.Hidden {
		return
	}

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

func digitGlyphSize() (dw, dh int) {
	r := assets.ImageDigits.Bounds()
	dw = r.Dx() / 10
	dh = r.Dy()
	return dw, dh
}

func digitFrame(d int) *ebiten.Image {
	d = d % 10
	if d < 0 {
		d += 10
	}
	dw, dh := digitGlyphSize()
	return assets.ImageDigits.SubImage(image.Rect(d*dw, 0, (d+1)*dw, dh)).(*ebiten.Image)
}

func (s *HiveSoftware) digitDialCell(dw, dh int) *ebiten.Image {
	if s.digitDialScratch != nil {
		b := s.digitDialScratch.Bounds()
		if b.Dx() == dw && b.Dy() == dh {
			return s.digitDialScratch
		}
		s.digitDialScratch.Dispose()
		s.digitDialScratch = nil
	}
	s.digitDialScratch = ebiten.NewImage(dw, dh)
	return s.digitDialScratch
}

// drawRollingInteger renders each decimal column into a dw×dh scratch (hard clip), then composites that cell onto the HUD.
func drawRollingInteger(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64, value int, tx, ty int, reels *[6]DigitReel) {
	digs := digits6(value)
	dw, dhInt := digitGlyphSize()
	dh := float64(dhInt)
	cell := s.digitDialCell(dw, dhInt)

	leadingZero := true
	for i := 0; i < 6; i++ {
		digit := digs[i]
		if i >= 6-2 {
			leadingZero = false
		}

		if digit == 0 && leadingZero && !reels[i].active {
			continue
		}

		if digit != 0 {
			leadingZero = false
		}

		px := float64(8*(tx+i)) + bufX
		py := float64(8*ty) + bufY
		r := &reels[i]

		cell.Clear()

		if r.active {
			p := r.Scroll01()
			offOld := -p * dh
			offNew := (1 - p) * dh
			opOld := &ebiten.DrawImageOptions{}
			opOld.GeoM.Translate(0, offOld)
			cell.DrawImage(digitFrame(r.from), opOld)
			opNew := &ebiten.DrawImageOptions{}
			opNew.GeoM.Translate(0, offNew)
			cell.DrawImage(digitFrame(r.to), opNew)
		} else {
			opIdle := &ebiten.DrawImageOptions{}
			opIdle.GeoM.Translate(0, 0)
			cell.DrawImage(digitFrame(r.SettledDigit), opIdle)
		}

		opOut := &ebiten.DrawImageOptions{}
		opOut.GeoM.Translate(math.Round(px), math.Round(py))
		screen.DrawImage(cell, opOut)
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
