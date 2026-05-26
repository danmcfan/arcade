package lumberjack

import (
	"github.com/hajimehoshi/ebiten/v2"
)

const (
	spriteWidth  = 64
	spriteHeight = 64

	baseSpeed = 2.0
)

var (
	BaseSpritesheet  = NewSpritesheet("Player/Player_Base/Player_Base_animations.png", spriteWidth, spriteHeight)
	HeadSpritesheet  = NewSpritesheet("Player/Head/Hair_1/Hair_1_Brown.png", spriteWidth, spriteHeight)
	ChestSpritesheet = NewSpritesheet("Player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png", spriteWidth, spriteHeight)
	HandsSpritesheet = NewSpritesheet("Player/Hands/Hands_1_Bare.png", spriteWidth, spriteHeight)
	LegsSpritesheet  = NewSpritesheet("Player/Legs/OG_Pants/Pants_1_Blue.png", spriteWidth, spriteHeight)
	FeetSpritesheet  = NewSpritesheet("Player/Feet/Shoes_1_Brown.png", spriteWidth, spriteHeight)
	ToolSpritesheet  = NewSpritesheet("Player/Tools/Iron/Iron_Tools.png", spriteWidth, spriteHeight)
)

type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

type Player struct {
	HeadSpritesheet  *Spritesheet
	ChestSpritesheet *Spritesheet
	HandsSpritesheet *Spritesheet
	LegsSpritesheet  *Spritesheet
	FeetSpritesheet  *Spritesheet

	FrameX int
	FrameY int

	FrameCounter  int
	FrameInterval int
	FrameTotal    int

	PositionX float64
	PositionY float64

	Moving    bool
	Acting    bool
	Direction Direction
}

func NewPlayer() *Player {
	p := &Player{
		HeadSpritesheet:  HeadSpritesheet,
		ChestSpritesheet: ChestSpritesheet,
		HandsSpritesheet: HandsSpritesheet,
		LegsSpritesheet:  LegsSpritesheet,
		FeetSpritesheet:  FeetSpritesheet,

		PositionX: width / 2,
		PositionY: height / 2,

		FrameInterval: 8,
		FrameTotal:    6,

		Direction: DirectionDown,
	}
	return p
}

func (p *Player) MinX() float64 {
	return p.PositionX - float64(spriteWidth)/2
}

func (p *Player) MinY() float64 {
	return p.PositionY - float64(spriteHeight)/2
}

func (p *Player) Hitbox() Hitbox {
	offsetX := 25.0
	offsetY := 31.0
	width := 13.0
	height := 10.0

	if p.Direction == DirectionRight {
		offsetX = 26.0
	}

	return Hitbox{x: p.MinX() + offsetX, y: p.MinY() + offsetY, w: width, h: height}
}

func (p *Player) ActionHitbox() Hitbox {
	const offsetSize = 16.0
	const hitboxSize = 16.0

	centerX := p.PositionX
	centerY := p.PositionY

	var offsetX, offsetY float64

	switch p.Direction {
	case DirectionUp:
		offsetX = 0
		offsetY = -offsetSize
	case DirectionDown:
		offsetX = 0
		offsetY = offsetSize
	case DirectionLeft:
		offsetX = -offsetSize
		offsetY = 0
	case DirectionRight:
		offsetX = offsetSize
		offsetY = 0
	}

	hitboxX := centerX + offsetX - hitboxSize/2
	hitboxY := centerY + offsetY - hitboxSize/2

	return Hitbox{
		x: hitboxX,
		y: hitboxY,
		w: hitboxSize,
		h: hitboxSize,
	}
}

type Input struct {
	Up    bool
	Down  bool
	Left  bool
	Right bool
	Space bool
}

func (p *Player) Update(i Input) {
	if i.Up || i.Down || i.Left || i.Right {
		p.Moving = true
	} else {
		p.Moving = false
	}

	if i.Space && !p.Moving {
		if !p.Acting {
			p.FrameX = 0
			p.FrameCounter = 0
		}
		p.Acting = true
	} else {
		p.Acting = false
	}

	vertical := i.Up || i.Down
	horizontal := i.Left || i.Right

	speed := baseSpeed
	if vertical && horizontal {
		speed = baseSpeed * 0.75
	}

	if i.Up {
		p.Direction = DirectionUp
		p.PositionY -= speed

	}
	if i.Down {
		p.Direction = DirectionDown
		p.PositionY += speed
	}
	if i.Left {
		p.Direction = DirectionLeft
		p.PositionX -= speed
	}
	if i.Right {
		p.Direction = DirectionRight
		p.PositionX += speed
	}

	for _, tree := range trees {
		if Overlaps(p.Hitbox(), tree.Hitbox()) {
			overlapX, overlapY := Resolve(p.Hitbox(), tree.Hitbox())
			p.PositionX += float64(overlapX)
			p.PositionY += float64(overlapY)
		}
	}

	switch p.Direction {
	case DirectionUp:
		p.FrameY = 2
	case DirectionDown:
		p.FrameY = 0
	case DirectionLeft:
		p.FrameY = 1
	case DirectionRight:
		p.FrameY = 1
	}

	if p.Moving {
		p.FrameY += 3
	}

	if p.Acting {
		p.FrameY += 32
	}

	p.FrameCounter++
	if p.FrameCounter >= p.FrameInterval {
		p.FrameCounter = 0
		p.FrameX++
		if p.FrameX >= p.FrameTotal {
			p.FrameX = 0
		}
	}
}

func (p *Player) Draw(screen *ebiten.Image) {
	op := &ebiten.DrawImageOptions{}
	if p.Direction == DirectionLeft {
		op.GeoM.Scale(-1, 1)
		op.GeoM.Translate(float64(spriteWidth), 0)
	}
	op.GeoM.Translate(float64(p.MinX()), float64(p.MinY()))
	op.GeoM.Scale(float64(scale), float64(scale))

	baseFrame := BaseSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(baseFrame, op)

	chestFrame := p.ChestSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(chestFrame, op)

	legsFrame := p.LegsSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(legsFrame, op)

	feetFrame := p.FeetSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(feetFrame, op)

	headFrame := p.HeadSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(headFrame, op)

	handsFrame := p.HandsSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(handsFrame, op)

	if p.Acting {
		toolFrame := ToolSpritesheet.Frame(p.FrameX, p.FrameY-32)
		screen.DrawImage(toolFrame, op)
	}

	if debug {
		Draw(screen, p.Hitbox(), colorRed)
		Draw(screen, p.ActionHitbox(), colorPink)
	}
}
