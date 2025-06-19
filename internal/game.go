//go:build js

package internal

import (
	"syscall/js"
)

const (
	MAX_ENTITIES = 10
)

type Empty struct{}

type Set map[string]Empty

type Direction int

const (
	DirectionUp Direction = iota
	DirectionDown
	DirectionLeft
	DirectionRight
)

type Entity int

type Game struct {
	Ctx                             js.Value
	SpriteManager                   *SpriteManager
	AudioPlayer                     *AudioPlayer
	Background                      *Background
	Keys                            Set
	Player                          Entity
	Positions                       []Position
	Graphics                        []Graphic
	Lag, Previous, Speed            float64
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
		SpriteManager: NewSpriteManager(),
		AudioPlayer:   NewAudioPlayer(),
		Background:    background,
		Keys:          make(Set),
		Positions:     make([]Position, MAX_ENTITIES),
		Graphics:      make([]Graphic, MAX_ENTITIES),
		Player:        0,
		Speed:         1.0,
		CellSize:      16,
		GridWidth:     10,
		GridHeight:    10,
	}

	g.Positions[g.Player] = NewPosition(0, 0, 1.0)
	g.Graphics[g.Player] = Graphic{
		Sprite:    SpritePlayer,
		Frame:     0,
		Direction: DirectionDown,
	}

	return g
}

func (g *Game) Update() {
	g.Graphics[g.Player].Frame += 0.15 * g.Speed
	g.MovePlayer()
}

func (g *Game) MovePlayer() {
	delta := 1.5 * g.Speed
	position := g.Positions[g.Player]

	isUpPressed := g.Keys.Contains("KeyW") || g.Keys.Contains("ArrowUp")
	isDownPressed := g.Keys.Contains("KeyS") || g.Keys.Contains("ArrowDown")
	isLeftPressed := g.Keys.Contains("KeyA") || g.Keys.Contains("ArrowLeft")
	isRightPressed := g.Keys.Contains("KeyD") || g.Keys.Contains("ArrowRight")

	if isUpPressed {
		position.Y = max(position.Y-delta, 0)
		g.Graphics[g.Player].Direction = DirectionUp
		g.Graphics[g.Player].Moving = true
		g.Positions[g.Player] = position
		return
	}
	if isDownPressed {
		limit := float64((g.Height - (32 * g.Scale)) / g.Scale)
		position.Y = min(position.Y+delta, limit)
		g.Graphics[g.Player].Direction = DirectionDown
		g.Graphics[g.Player].Moving = true
		g.Positions[g.Player] = position
		return
	}
	if isLeftPressed {
		position.X = max(position.X-delta, 0)
		g.Graphics[g.Player].Direction = DirectionLeft
		g.Graphics[g.Player].Moving = true
		g.Positions[g.Player] = position
		return
	}
	if isRightPressed {
		limit := float64((g.Width - (32 * g.Scale)) / g.Scale)
		position.X = min(position.X+delta, limit)
		g.Graphics[g.Player].Direction = DirectionRight
		g.Graphics[g.Player].Moving = true
		g.Positions[g.Player] = position
		return
	}

	g.Graphics[g.Player].Moving = false
}

func (g *Game) Draw() {
	ClearScreen(g.Ctx, g.Width, g.Height)

	g.DrawBackground()

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

	sb := Box{
		X: (int(graphic.Frame) % 6) * spriteSheet.Width,
		Y: row * spriteSheet.Height,
		W: spriteSheet.Width,
		H: spriteSheet.Height,
	}
	db := Box{
		X: int(position.X) * g.Scale,
		Y: int(position.Y) * g.Scale,
		W: spriteSheet.Width * g.Scale,
		H: spriteSheet.Height * g.Scale,
	}
	DrawImage(g.Ctx, spriteSheet.Image, sb, db, flip)
}

func (g *Game) DrawBackground() {
	for sprite, cells := range g.Background.Cells {
		spriteSheet := g.SpriteManager.GetSpriteSheet(sprite)
		for i, cell := range cells {
			if cell < 0 {
				continue
			}

			sx := (cell % spriteSheet.Cols) * spriteSheet.Width
			sy := (cell / spriteSheet.Cols) * spriteSheet.Height

			dx := (i % g.GridWidth) * g.CellSize * g.Scale
			dy := (i / g.GridWidth) * g.CellSize * g.Scale
			dw := g.CellSize * g.Scale
			dh := g.CellSize * g.Scale

			sb := NewBox(sx, sy, spriteSheet.Width, spriteSheet.Height)
			db := NewBox(dx, dy, dw, dh)

			DrawImage(g.Ctx, spriteSheet.Image, sb, db, false)
		}
	}
}

type GameFunc func(g *Game)

func (s Set) Add(key string) {
	s[key] = Empty{}
}

func (s Set) Delete(key string) {
	delete(s, key)
}

func (s Set) Contains(key string) bool {
	_, ok := s[key]
	return ok
}
