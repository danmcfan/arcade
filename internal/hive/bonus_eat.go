package hive

import (
	"image"

	"github.com/danmcfan/arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	bonusEatSpriteSize       = 16
	bonusEatFrameCount       = 4
	bonusEatIndicatorTTLSecs = 0.75
)

var scaredBeeEatPoints = [bonusEatFrameCount]int{200, 400, 800, 1600}

// bonusEatPopup is a transient "200 / 400 / …"sprite above an eaten bee.
type bonusEatPopup struct {
	x, y         float64
	frameIdx     int
	ticksRemain  int
}

func bonusEatFrameRect(frameIdx int) image.Rectangle {
	if frameIdx < 0 {
		frameIdx = 0
	}
	if frameIdx >= bonusEatFrameCount {
		frameIdx = bonusEatFrameCount - 1
	}
	x0 := frameIdx * bonusEatSpriteSize
	return image.Rect(x0, 0, x0+bonusEatSpriteSize, bonusEatSpriteSize)
}

func (s *HiveSoftware) spawnBonusEatIndicator(worldX, worldY float64, frameIdx int) {
	if frameIdx < 0 {
		frameIdx = 0
	}
	if frameIdx >= bonusEatFrameCount {
		frameIdx = bonusEatFrameCount - 1
	}
	s.bonusEatPopups = append(s.bonusEatPopups, bonusEatPopup{
		x: worldX, y: worldY, frameIdx: frameIdx,
		ticksRemain: int(bonusEatIndicatorTTLSecs * float64(framesPerSecond)),
	})
}

func (s *HiveSoftware) tickBonusEatPopups() {
	if len(s.bonusEatPopups) == 0 {
		return
	}
	dst := s.bonusEatPopups[:0]
	for _, p := range s.bonusEatPopups {
		p.ticksRemain--
		if p.ticksRemain > 0 {
			dst = append(dst, p)
		}
	}
	s.bonusEatPopups = dst
}

func anyBeeInScaredMode(s *HiveSoftware) bool {
	if s == nil {
		return false
	}
	for _, e := range s.enemies {
		if e != nil && e.BlueFrames > 0 {
			return true
		}
	}
	return false
}

func resetScaredEatAwardIfNobodyScared(s *HiveSoftware) {
	if anyBeeInScaredMode(s) {
		return
	}
	s.scaredEatAwardNext = 0
}

func drawBonusEatIndicators(s *HiveSoftware, screen *ebiten.Image, bufX, bufY float64) {
	img := assets.ImageBonus
	sh := bonusEatSpriteSize
	for _, p := range s.bonusEatPopups {
		r := bonusEatFrameRect(p.frameIdx)
		sub := img.SubImage(r).(*ebiten.Image)

		screenX := p.x + bufX
		screenY := p.y + bufY
		op := &ebiten.DrawImageOptions{}
		// Anchor center-X on bee; one tile gap above bee, sprite sits flush above that gap.
		op.GeoM.Translate(screenX-float64(bonusEatSpriteSize)/2, screenY-float64(tileSize)-float64(sh))
		screen.DrawImage(sub, op)
	}
}
