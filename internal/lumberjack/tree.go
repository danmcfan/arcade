package lumberjack

import (
	"math"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	radians = math.Pi / 180.0

	pivotXLeft  = 26.0
	pivotXRight = 37.0
	pivotY      = 58.0

	thetaMax      = radians * 4.0
	thetaInterval = radians * 0.25
)

var (
	oakTreeBigSpritesheet      = NewSpritesheet("Trees/Big_Oak_Tree.png", 64, 80)
	oakLeafParticleSpritesheet = NewSpritesheet("Trees/Oak_Leaf_Particle.png", 16, 16)

	treeTrunkFrame = oakTreeBigSpritesheet.Frame(0, 0)
	treeTopFrame   = oakTreeBigSpritesheet.Frame(2, 0)
)

type Tree struct {
	PositionX float64
	PositionY float64

	Shaking    bool
	ShakeRight bool

	Theta           float64
	ThetaIncreasing bool

	Behind      bool
	Transparent bool
}

func NewTree(positionX, positionY float64) *Tree {
	return &Tree{
		PositionX: positionX,
		PositionY: positionY,
	}
}

func (t *Tree) MinX() float64 {
	return t.PositionX - float64(oakTreeBigSpritesheet.Width)/2
}

func (t *Tree) MinY() float64 {
	return t.PositionY - float64(oakTreeBigSpritesheet.Height)/2
}

func (t *Tree) Hitbox() Hitbox {
	offsetX := 24.0
	offsetY := 56.0
	hitboxWidth := 16.0
	hitboxHeight := 8.0

	return Hitbox{x: t.MinX() + offsetX, y: t.MinY() + offsetY, w: hitboxWidth, h: hitboxHeight}
}

func (t *Tree) Shake(right bool) {
	t.Shaking = true
	t.ShakeRight = right
	t.ThetaIncreasing = right
}

func (t *Tree) PivotX() float64 {
	if t.ShakeRight {
		return pivotXRight
	} else {
		return pivotXLeft
	}
}

func (t *Tree) Update() {
	if !t.Shaking {
		return
	}

	if t.ThetaIncreasing {
		t.Theta += thetaInterval
	} else {
		t.Theta -= thetaInterval
	}

	if t.ShakeRight {
		if t.Theta >= thetaMax {
			t.Theta = thetaMax
			t.ThetaIncreasing = false
		}

		if t.Theta <= 0.0 {
			t.Theta = 0.0
			t.Shaking = false
		}
	} else {
		if t.Theta <= -thetaMax {
			t.Theta = -thetaMax
			t.ThetaIncreasing = true
		}

		if t.Theta >= 0.0 {
			t.Theta = 0.0
			t.Shaking = false
		}
	}
}

func (t *Tree) Draw(screen *ebiten.Image) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(t.MinX(), t.MinY())
	op.GeoM.Scale(float64(scale), float64(scale))

	if t.Transparent {
		op.ColorScale.ScaleAlpha(0.5)
	}

	screen.DrawImage(treeTrunkFrame, op)

	op = &ebiten.DrawImageOptions{}
	op.GeoM.Translate(-t.PivotX(), -pivotY)
	op.GeoM.Rotate(t.Theta)
	op.GeoM.Translate(t.PivotX(), pivotY)
	op.GeoM.Translate(t.MinX(), t.MinY())
	op.GeoM.Scale(float64(scale), float64(scale))
	screen.DrawImage(treeTopFrame, op)

	if debug {
		Draw(screen, t.Hitbox())
	}
}
