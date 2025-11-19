package hive

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	tileSize   = 8
	tileWidth  = 28
	tileHeight = 36
)

var (
	targetTopLeft     = tile{x: 2, y: 0}
	targetTopRight    = tile{x: tileWidth - 3, y: 0}
	targetBottomLeft  = tile{x: 0, y: tileHeight - 2}
	targetBottomRight = tile{x: tileWidth - 1, y: tileHeight - 2}
)

type tile struct {
	x, y int
}

func pointToTile(x, y float64) tile {
	return tile{x: int(x / tileSize), y: int(y / tileSize)}
}

func distance(a, b tile) float64 {
	return math.Sqrt(math.Pow(float64(a.x-b.x), 2) + math.Pow(float64(a.y-b.y), 2))
}

type Entity struct {
	Sprite *ebiten.Image

	Frame          float64
	FrameIncrement float64
	FrameTotal     float64
	FrameDirection map[input.Direction]int

	X          float64
	Y          float64
	Width      float64
	Height     float64
	Direction  input.Direction
	Directions []input.Direction
	Velocity   float64

	BlueFrames  int
	FlashFrames int
	Flash       bool

	target tile
}

func (e *Entity) IsPellet() bool {
	return e.Frame == 0
}

func (e *Entity) IsPower() bool {
	return e.Frame == 1
}

func NewPlayer() *Entity {
	return &Entity{
		Sprite:         assets.ImageBear,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[input.Direction]int{
			input.DirectionDown:  0,
			input.DirectionUp:    1,
			input.DirectionLeft:  2,
			input.DirectionRight: 3,
		},
		X:         112,
		Y:         212,
		Width:     16,
		Height:    16,
		Direction: input.DirectionLeft,
		Velocity:  1.0,
	}
}

func newEnemies() []*Entity {
	return []*Entity{
		newEnemy(3, 8, input.DirectionRight, targetTopLeft),
		newEnemy(24, 8, input.DirectionLeft, targetTopRight),
		newEnemy(1, 29, input.DirectionRight, targetBottomLeft),
		newEnemy(26, 29, input.DirectionLeft, targetBottomRight),
	}
}

func newEnemy(tx, ty int, direction input.Direction, target tile) *Entity {
	return &Entity{
		Sprite:         assets.ImageBee,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[input.Direction]int{
			input.DirectionDown:  0,
			input.DirectionUp:    1,
			input.DirectionLeft:  1,
			input.DirectionRight: 0,
		},
		X:         float64(8*tx + 4),
		Y:         float64(8*ty + 4),
		Width:     16,
		Height:    16,
		Direction: direction,
		Velocity:  0.75,
		target:    target,
	}
}

func newItems() []*Entity {
	food := make([]*Entity, 0)

	// Rows of pellets
	food = append(food, newPelletRow(1, 12, 1)...)
	food = append(food, newPelletRow(15, 26, 1)...)
	food = append(food, newPelletRow(1, 26, 5)...)
	food = append(food, newPelletRow(1, 6, 8)...)
	food = append(food, newPelletRow(9, 12, 8)...)
	food = append(food, newPelletRow(15, 18, 8)...)
	food = append(food, newPelletRow(21, 26, 8)...)
	food = append(food, newPelletRow(1, 12, 20)...)
	food = append(food, newPelletRow(15, 26, 20)...)
	food = append(food, newPelletRow(6, 12, 23)...)
	food = append(food, newPelletRow(15, 21, 23)...)
	food = append(food, newPelletRow(1, 6, 26)...)
	food = append(food, newPelletRow(9, 12, 26)...)
	food = append(food, newPelletRow(15, 18, 26)...)
	food = append(food, newPelletRow(21, 26, 26)...)
	food = append(food, newPelletRow(1, 26, 29)...)

	// Columns of pellets
	food = append(food, newPelletColumn(9, 19, 6)...)
	food = append(food, newPelletColumn(9, 19, 21)...)
	food = append(food, newPelletColumn(2, 4, 6)...)
	food = append(food, newPelletColumn(2, 4, 12)...)
	food = append(food, newPelletColumn(2, 4, 15)...)
	food = append(food, newPelletColumn(2, 4, 21)...)
	food = append(food, newPelletColumn(6, 7, 1)...)
	food = append(food, newPelletColumn(6, 7, 6)...)
	food = append(food, newPelletColumn(6, 7, 9)...)
	food = append(food, newPelletColumn(6, 7, 18)...)
	food = append(food, newPelletColumn(6, 7, 21)...)
	food = append(food, newPelletColumn(6, 7, 26)...)
	food = append(food, newPelletColumn(21, 22, 1)...)
	food = append(food, newPelletColumn(21, 22, 6)...)
	food = append(food, newPelletColumn(21, 22, 12)...)
	food = append(food, newPelletColumn(21, 22, 15)...)
	food = append(food, newPelletColumn(21, 22, 21)...)
	food = append(food, newPelletColumn(21, 22, 26)...)
	food = append(food, newPelletColumn(23, 25, 3)...)
	food = append(food, newPelletColumn(23, 25, 24)...)
	food = append(food, newPelletColumn(24, 25, 6)...)
	food = append(food, newPelletColumn(24, 25, 9)...)
	food = append(food, newPelletColumn(24, 25, 18)...)
	food = append(food, newPelletColumn(24, 25, 21)...)
	food = append(food, newPelletColumn(27, 28, 1)...)
	food = append(food, newPelletColumn(27, 28, 12)...)
	food = append(food, newPelletColumn(27, 28, 15)...)
	food = append(food, newPelletColumn(27, 28, 26)...)

	// Individual pellets
	food = append(food, newPellet(1, 2))
	food = append(food, newPellet(1, 4))
	food = append(food, newPellet(26, 2))
	food = append(food, newPellet(26, 4))
	food = append(food, newPellet(2, 23))
	food = append(food, newPellet(25, 23))

	// Power pellets
	food = append(food, newPower(1, 3))
	food = append(food, newPower(26, 3))
	food = append(food, newPower(1, 23))
	food = append(food, newPower(26, 23))

	return food
}

func newPelletRow(txa, txb, ty int) []*Entity {
	var food []*Entity
	for tx := txa; tx <= txb; tx++ {
		food = append(food, newPellet(tx, ty))
	}
	return food
}

func newPelletColumn(tya, tyb, tx int) []*Entity {
	var food []*Entity
	for ty := tya; ty <= tyb; ty++ {
		food = append(food, newPellet(tx, ty))
	}
	return food
}

func newPellet(tx, ty int) *Entity {
	return &Entity{
		Sprite:     assets.ImageFood,
		Frame:      0,
		FrameTotal: 1,
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Width:      8,
		Height:     8,
	}
}

func newPower(tx, ty int) *Entity {
	return &Entity{
		Sprite:     assets.ImageFood,
		Frame:      1,
		FrameTotal: 1,
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Width:      8,
		Height:     8,
	}
}

func newCorners() []*Entity {
	return []*Entity{
		// ROW 1
		newCorner(1, 1, input.DirectionDown, input.DirectionRight),
		newCorner(6, 1, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(12, 1, input.DirectionDown, input.DirectionLeft),
		newCorner(15, 1, input.DirectionDown, input.DirectionRight),
		newCorner(21, 1, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(26, 1, input.DirectionDown, input.DirectionLeft),
		// ROW 5
		newCorner(1, 5, input.DirectionUp, input.DirectionDown, input.DirectionRight),
		newCorner(6, 5, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(9, 5, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(12, 5, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(15, 5, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(18, 5, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(21, 5, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(26, 5, input.DirectionUp, input.DirectionDown, input.DirectionLeft),
		// ROW 8
		newCorner(1, 8, input.DirectionUp, input.DirectionRight),
		newCorner(6, 8, input.DirectionUp, input.DirectionDown, input.DirectionLeft),
		newCorner(9, 8, input.DirectionUp, input.DirectionRight),
		newCorner(12, 8, input.DirectionDown, input.DirectionLeft),
		newCorner(15, 8, input.DirectionDown, input.DirectionRight),
		newCorner(18, 8, input.DirectionUp, input.DirectionLeft),
		newCorner(21, 8, input.DirectionUp, input.DirectionDown, input.DirectionRight),
		newCorner(26, 8, input.DirectionUp, input.DirectionLeft),
		// ROW 11
		newCorner(9, 11, input.DirectionDown, input.DirectionRight),
		newCorner(12, 11, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(15, 11, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(18, 11, input.DirectionDown, input.DirectionLeft),
		// ROW 14
		newCorner(6, 14, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(9, 14, input.DirectionUp, input.DirectionDown, input.DirectionLeft),
		newCorner(18, 14, input.DirectionUp, input.DirectionDown, input.DirectionRight),
		newCorner(21, 14, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		// ROW 17
		newCorner(9, 17, input.DirectionUp, input.DirectionDown, input.DirectionRight),
		newCorner(18, 17, input.DirectionUp, input.DirectionDown, input.DirectionLeft),
		// ROW 20
		newCorner(1, 20, input.DirectionDown, input.DirectionRight),
		newCorner(6, 20, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(9, 20, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(12, 20, input.DirectionDown, input.DirectionLeft),
		newCorner(15, 20, input.DirectionDown, input.DirectionRight),
		newCorner(18, 20, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(21, 20, input.DirectionUp, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(26, 20, input.DirectionDown, input.DirectionLeft),
		// ROW 23
		newCorner(1, 23, input.DirectionUp, input.DirectionRight),
		newCorner(3, 23, input.DirectionDown, input.DirectionLeft),
		newCorner(6, 23, input.DirectionUp, input.DirectionDown, input.DirectionRight),
		newCorner(9, 23, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(12, 23, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(15, 23, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(18, 23, input.DirectionDown, input.DirectionLeft, input.DirectionRight),
		newCorner(21, 23, input.DirectionUp, input.DirectionDown, input.DirectionLeft),
		newCorner(24, 23, input.DirectionDown, input.DirectionRight),
		newCorner(26, 23, input.DirectionUp, input.DirectionLeft),
		// ROW 26
		newCorner(1, 26, input.DirectionDown, input.DirectionRight),
		newCorner(3, 26, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(6, 26, input.DirectionUp, input.DirectionLeft),
		newCorner(9, 26, input.DirectionUp, input.DirectionRight),
		newCorner(12, 26, input.DirectionDown, input.DirectionLeft),
		newCorner(15, 26, input.DirectionDown, input.DirectionRight),
		newCorner(18, 26, input.DirectionUp, input.DirectionLeft),
		newCorner(21, 26, input.DirectionUp, input.DirectionRight),
		newCorner(24, 26, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(26, 26, input.DirectionDown, input.DirectionLeft),
		// ROW 29
		newCorner(1, 29, input.DirectionUp, input.DirectionRight),
		newCorner(12, 29, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(15, 29, input.DirectionUp, input.DirectionLeft, input.DirectionRight),
		newCorner(26, 29, input.DirectionUp, input.DirectionLeft),
	}
}

func newCorner(tx, ty int, directions ...input.Direction) *Entity {
	return &Entity{
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Directions: directions,
	}
}
