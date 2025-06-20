//go:build js

package internal

import (
	"slices"
	"syscall/js"
)

const (
	MAX_ENTITIES = 32
)

type Machine int

const (
	MachineNone Machine = iota
	MachineGreen
)

type Effect int

const (
	EffectNone Effect = iota
	EffectFadeIn
	EffectFadeOut
)

type Direction int

const (
	DirectionUp Direction = iota
	DirectionDown
	DirectionLeft
	DirectionRight
)

type Game struct {
	Ctx                             js.Value
	Machine                         Machine
	NextMachine                     Machine
	EntityManager                   *EntityManager
	SpriteManager                   *SpriteManager
	AudioPlayer                     *AudioPlayer
	Background                      *Background
	Keys                            Set
	Player                          Entity
	Machines                        []Entity
	Positions                       []Position
	Graphics                        []Graphic
	Boxes                           []Box
	Areas                           []Box
	Effect                          Effect
	Lag, Previous, Speed            float64
	Fade, FadeRate                  float64
	CellSize, GridWidth, GridHeight int
	Width, Height, Scale            int
}

func NewGame(ctx js.Value) *Game {
	background, err := NewBackground("background.json")
	if err != nil {
		panic(err)
	}

	g := &Game{
		Ctx:           ctx,
		Machine:       MachineNone,
		NextMachine:   MachineNone,
		EntityManager: NewEntityManager(),
		SpriteManager: NewSpriteManager(),
		AudioPlayer:   NewAudioPlayer(),
		Background:    background,
		Keys:          make(Set),
		Machines:      make([]Entity, 0),
		Positions:     make([]Position, MAX_ENTITIES),
		Graphics:      make([]Graphic, MAX_ENTITIES),
		Boxes:         make([]Box, MAX_ENTITIES),
		Areas:         make([]Box, MAX_ENTITIES),
		Speed:         1.0,
		CellSize:      16,
		GridWidth:     10,
		GridHeight:    10,
		Effect:        EffectFadeIn,
		Fade:          1.0,
		FadeRate:      0.02,
	}

	centerX := float64(g.GridWidth * g.CellSize / 2)
	centerY := float64(g.GridHeight * g.CellSize / 2)

	player := g.EntityManager.Next()
	g.Player = player

	g.Positions[player] = NewPosition(centerX-16, centerY+16, 1.0)
	g.Graphics[player] = Graphic{
		Sprite:    SpritePlayer,
		Frame:     0,
		Direction: DirectionDown,
	}
	g.Boxes[player] = NewBox(9, 5, 13, 18)

	greenMachine := g.EntityManager.Next()
	g.Machines = append(g.Machines, greenMachine)
	g.Positions[greenMachine] = NewPosition(centerX-8, centerY-36, 0.0)
	g.Graphics[greenMachine] = Graphic{
		Sprite:    SpriteGreenMachine,
		Direction: DirectionDown,
	}
	g.Boxes[greenMachine] = NewBox(0, 0, 16, 16)
	g.Areas[greenMachine] = NewBox(4, 16, 10, 8)

	return g
}

func (g *Game) Update() {
	switch g.Effect {
	case EffectFadeIn:
		g.Fade -= g.FadeRate
		g.Fade = max(g.Fade, 0.0)
		if g.Fade <= 0.0 {
			g.Effect = EffectNone
		}
	case EffectFadeOut:
		g.Fade += g.FadeRate
		g.Fade = min(g.Fade, 1.0)
		if g.Fade >= 1.0 {
			g.Effect = EffectFadeIn
			g.Machine = g.NextMachine
		}
	}

	switch g.Machine {
	case MachineNone:
		g.UpdateArcade()
	case MachineGreen:
		g.UpdateGreen()
	}
}

func (g *Game) UpdateArcade() {
	if g.Effect == EffectNone {
		g.Graphics[g.Player].Frame += 0.15 * g.Speed
		for _, machine := range g.Machines {
			g.Graphics[machine].Frame += 0.15 * g.Speed
		}

		graphic := g.Graphics[g.Player]
		if graphic.Moving {
			g.AudioPlayer.Play(SoundFootstep)
		} else {
			g.AudioPlayer.Pause(SoundFootstep)
		}

		machinePlaying := false
		for _, machine := range g.Machines {
			graphic := g.Graphics[machine]
			if graphic.Moving {
				machinePlaying = true
				break
			}
		}

		if machinePlaying {
			g.AudioPlayer.Play(SoundArcade)
		} else {
			g.AudioPlayer.Pause(SoundArcade)
		}

		g.MovePlayer()
		isUsePressed := g.Keys.Contains("KeyE") || g.Keys.Contains("Space") || g.Keys.Contains("Enter")
		isMachineActive := false
		for _, machine := range g.Machines {
			if g.Graphics[machine].Moving {
				isMachineActive = true
				break
			}
		}
		if isUsePressed && isMachineActive && g.Fade == 0.0 {
			g.Effect = EffectFadeOut
			g.NextMachine = MachineGreen

			g.AudioPlayer.PauseAll()
		}
	}
}

func (g *Game) UpdateGreen() {
	if g.Effect == EffectNone {
		isExitPressed := g.Keys.Contains("KeyQ") || g.Keys.Contains("Escape")
		if isExitPressed {
			g.Effect = EffectFadeOut
			g.NextMachine = MachineNone

			g.AudioPlayer.PauseAll()
		}
	}
}

func (g *Game) MovePlayer() {
	delta := 1.5 * g.Speed
	position := g.Positions[g.Player]
	graphic := g.Graphics[g.Player]
	box := g.Boxes[g.Player]
	rectangle := NewRectangle(position.X+box.X, position.Y+box.Y, box.W, box.H)

	// Check for key presses
	isUpPressed := g.Keys.Contains("KeyW") || g.Keys.Contains("ArrowUp")
	isDownPressed := g.Keys.Contains("KeyS") || g.Keys.Contains("ArrowDown")
	isLeftPressed := g.Keys.Contains("KeyA") || g.Keys.Contains("ArrowLeft")
	isRightPressed := g.Keys.Contains("KeyD") || g.Keys.Contains("ArrowRight")

	// Get the player's new X and Y coordinates
	newX := position.X
	newY := position.Y
	newDirection := g.Graphics[g.Player].Direction
	isMoving := true

	if isUpPressed {
		newY = newY - delta
		newDirection = DirectionUp
	} else if isDownPressed {
		newY = newY + delta
		newDirection = DirectionDown
	} else if isLeftPressed {
		newX = newX - delta
		newDirection = DirectionLeft
	} else if isRightPressed {
		newX = newX + delta
		newDirection = DirectionRight
	} else {
		isMoving = false
	}

	// Check for out of bounds
	offsetX := 6.0
	offsetY := 4.0

	newX = min(max(newX, offsetX), float64(g.GridWidth*g.CellSize)-offsetX-32.0)
	newY = min(max(newY, float64(3*g.CellSize)-offsetY), float64(g.GridHeight*g.CellSize)-offsetY-32.0)

	// Check for collisions
	for _, machine := range g.Machines {
		machinePosition := g.Positions[machine]
		machineGraphic := g.Graphics[machine]
		machineBox := g.Boxes[machine]
		machineRectangle := NewRectangle(machinePosition.X+machineBox.X, machinePosition.Y+machineBox.Y, machineBox.W, machineBox.H)

		if Collides(rectangle, machineRectangle) {
			side := CollisionSide(rectangle, machineRectangle)
			if side == SideTop && newDirection == DirectionDown {
				newY = position.Y
			} else if side == SideBottom && newDirection == DirectionUp {
				newY = position.Y
			} else if side == SideLeft && newDirection == DirectionRight {
				newX = position.X
			} else if side == SideRight && newDirection == DirectionLeft {
				newX = position.X
			}
		}

		machineArea := g.Areas[machine]
		machineRectangle = NewRectangle(machinePosition.X+machineArea.X, machinePosition.Y+machineArea.Y, machineArea.W, machineArea.H)

		if Collides(rectangle, machineRectangle) && graphic.Direction == DirectionUp {
			machineGraphic.Moving = true
		} else {
			machineGraphic.Moving = false
		}

		g.Graphics[machine] = machineGraphic
	}

	// Move the player
	g.Positions[g.Player].X = newX
	g.Positions[g.Player].Y = newY
	g.Graphics[g.Player].Direction = newDirection
	g.Graphics[g.Player].Moving = isMoving
}

func (g *Game) Render() {
	ClearScreen(g.Ctx, g.Width, g.Height)

	switch g.Machine {
	case MachineNone:
		g.DrawArcade()
	case MachineGreen:
		g.DrawGreen()
	}

	FadeScreen(g.Ctx, g.Width, g.Height, g.Fade)
}

func (g *Game) DrawArcade() {
	g.DrawBackground(0)

	for _, machine := range g.Machines {
		g.DrawMachine(machine)
	}

	position := g.Positions[g.Player]
	graphic := g.Graphics[g.Player]
	spriteSheet := g.SpriteManager.GetSpriteSheet(graphic.Sprite)

	row := 0
	switch graphic.Direction {
	case DirectionUp:
		row = 2
	case DirectionDown:
		row = 0
	case DirectionLeft:
		row = 1
	case DirectionRight:
		row = 1
	}

	if graphic.Moving {
		row += 3
	}

	flip := false
	if graphic.Direction == DirectionLeft {
		flip = true
	}

	sb := NewBox(float64(int(graphic.Frame)%6*spriteSheet.Width), float64(row*spriteSheet.Height), float64(spriteSheet.Width), float64(spriteSheet.Height))
	db := NewBox(position.X, position.Y, float64(spriteSheet.Width), float64(spriteSheet.Height))
	DrawImage(g.Ctx, spriteSheet.Image, sb, db, flip)

	g.DrawBackground(1)
}

func (g *Game) DrawGreen() {
	g.Ctx.Set("fillStyle", "green")
	g.Ctx.Call("fillRect", 0, 0, 160, 160)
}

func (g *Game) DrawBackground(layer int) {
	for sprite, cells := range g.Background.Cells {
		spriteSheet := g.SpriteManager.GetSpriteSheet(sprite)
		for i, cell := range cells {
			if cell < 0 {
				continue
			}

			if layer == 0 {
				if isForeground(cell, sprite) {
					continue
				}
			} else {
				if !isForeground(cell, sprite) {
					continue
				}
			}

			sx := (cell % spriteSheet.Cols) * spriteSheet.Width
			sy := (cell / spriteSheet.Cols) * spriteSheet.Height

			dx := (i % g.GridWidth) * g.CellSize
			dy := (i / g.GridWidth) * g.CellSize
			dw := g.CellSize
			dh := g.CellSize

			sb := NewBox(float64(sx), float64(sy), float64(spriteSheet.Width), float64(spriteSheet.Height))
			db := NewBox(float64(dx), float64(dy), float64(dw), float64(dh))

			DrawImage(g.Ctx, spriteSheet.Image, sb, db, false)
		}
	}
}

func isForeground(cell int, sprite Sprite) bool {
	interiorWalls := []int{0, 1, 2, 14, 16, 28, 29, 30}
	if sprite == SpriteInteriorWalls && slices.Contains(interiorWalls, cell) {
		return true
	}
	return false
}

func (g *Game) DrawMachine(machine Entity) {
	position := g.Positions[machine]
	graphic := g.Graphics[machine]
	spriteSheet := g.SpriteManager.GetSpriteSheet(graphic.Sprite)

	sx := 0.0
	if graphic.Moving {
		sx = float64(max(int(graphic.Frame)%6, 1.0) * spriteSheet.Width)
	}

	sb := NewBox(sx, 0, float64(spriteSheet.Width), float64(spriteSheet.Height))
	db := NewBox(position.X, position.Y, float64(spriteSheet.Width), float64(spriteSheet.Height))
	DrawImage(g.Ctx, spriteSheet.Image, sb, db, false)
}
