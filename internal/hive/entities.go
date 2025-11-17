package hive

import (
	"arcade/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	// DistanceThreshold for collision detection
	DistanceThreshold = 0.25
)

// Sprites holds all the sprite images needed for the hive game
type Sprites struct {
	Bear   *ebiten.Image
	Bee    *ebiten.Image
	Food   *ebiten.Image
	Hive   *ebiten.Image
	Digits *ebiten.Image
	Ready  *ebiten.Image
}

func NewSprites() *Sprites {
	return &Sprites{
		Bear:   assets.ImageBear,
		Bee:    assets.ImageBee,
		Food:   assets.ImageFood,
		Hive:   assets.ImageHive,
		Digits: assets.ImageDigits,
		Ready:  assets.ImageReady,
	}
}

// CreateBear creates the player entity (bear) for the hive game
func CreateBear(sprites *Sprites) *Entity {
	return &Entity{
		Sprite:         sprites.Bear,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionDown:  0,
			DirectionUp:    1,
			DirectionLeft:  2,
			DirectionRight: 3,
		},
		X:         112,
		Y:         212,
		Width:     16,
		Height:    16,
		Direction: DirectionLeft,
		Velocity:  1.0,
	}
}

// CreateBees creates the enemy entities (bees) for the hive game
func CreateBees(sprites *Sprites) []*Entity {
	return []*Entity{
		createBee(sprites, 1, 4, DirectionRight),
		createBee(sprites, 26, 4, DirectionLeft),
		createBee(sprites, 1, 29, DirectionRight),
		createBee(sprites, 26, 29, DirectionLeft),
	}
}

// createBee creates a single bee entity at a tile position
func createBee(sprites *Sprites, tx, ty int, direction Direction) *Entity {
	return &Entity{
		Sprite:         sprites.Bee,
		FrameIncrement: 0.1,
		FrameTotal:     4,
		FrameDirection: map[Direction]int{
			DirectionDown:  0,
			DirectionUp:    1,
			DirectionLeft:  1,
			DirectionRight: 0,
		},
		X:         float64(8*tx + 4),
		Y:         float64(8*ty + 4),
		Width:     16,
		Height:    16,
		Direction: direction,
		Velocity:  0.75,
	}
}

// CreateFood creates all the food entities (pellets and power pellets) for the hive game
func CreateFood(sprites *Sprites) []*Entity {
	food := make([]*Entity, 0)

	// Rows of pellets
	food = append(food, createPelletRow(sprites, 1, 12, 1)...)
	food = append(food, createPelletRow(sprites, 15, 26, 1)...)
	food = append(food, createPelletRow(sprites, 1, 26, 5)...)
	food = append(food, createPelletRow(sprites, 1, 6, 8)...)
	food = append(food, createPelletRow(sprites, 9, 12, 8)...)
	food = append(food, createPelletRow(sprites, 15, 18, 8)...)
	food = append(food, createPelletRow(sprites, 21, 26, 8)...)
	food = append(food, createPelletRow(sprites, 1, 12, 20)...)
	food = append(food, createPelletRow(sprites, 15, 26, 20)...)
	food = append(food, createPelletRow(sprites, 6, 12, 23)...)
	food = append(food, createPelletRow(sprites, 15, 21, 23)...)
	food = append(food, createPelletRow(sprites, 1, 6, 26)...)
	food = append(food, createPelletRow(sprites, 9, 12, 26)...)
	food = append(food, createPelletRow(sprites, 15, 18, 26)...)
	food = append(food, createPelletRow(sprites, 21, 26, 26)...)
	food = append(food, createPelletRow(sprites, 1, 26, 29)...)

	// Columns of pellets
	food = append(food, createPelletColumn(sprites, 9, 19, 6)...)
	food = append(food, createPelletColumn(sprites, 9, 19, 21)...)
	food = append(food, createPelletColumn(sprites, 2, 4, 6)...)
	food = append(food, createPelletColumn(sprites, 2, 4, 12)...)
	food = append(food, createPelletColumn(sprites, 2, 4, 15)...)
	food = append(food, createPelletColumn(sprites, 2, 4, 21)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 1)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 6)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 9)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 18)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 21)...)
	food = append(food, createPelletColumn(sprites, 6, 7, 26)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 1)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 6)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 12)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 15)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 21)...)
	food = append(food, createPelletColumn(sprites, 21, 22, 26)...)
	food = append(food, createPelletColumn(sprites, 23, 25, 3)...)
	food = append(food, createPelletColumn(sprites, 23, 25, 24)...)
	food = append(food, createPelletColumn(sprites, 24, 25, 6)...)
	food = append(food, createPelletColumn(sprites, 24, 25, 9)...)
	food = append(food, createPelletColumn(sprites, 24, 25, 18)...)
	food = append(food, createPelletColumn(sprites, 24, 25, 21)...)
	food = append(food, createPelletColumn(sprites, 27, 28, 1)...)
	food = append(food, createPelletColumn(sprites, 27, 28, 12)...)
	food = append(food, createPelletColumn(sprites, 27, 28, 15)...)
	food = append(food, createPelletColumn(sprites, 27, 28, 26)...)

	// Individual pellets
	food = append(food, createPellet(sprites, 1, 2))
	food = append(food, createPellet(sprites, 26, 2))
	food = append(food, createPellet(sprites, 26, 4))
	food = append(food, createPellet(sprites, 2, 23))
	food = append(food, createPellet(sprites, 25, 23))

	// Power pellets
	food = append(food, createPowerPellet(sprites, 1, 3))
	food = append(food, createPowerPellet(sprites, 26, 3))
	food = append(food, createPowerPellet(sprites, 1, 23))
	food = append(food, createPowerPellet(sprites, 26, 23))

	return food
}

// createPelletRow creates a horizontal row of pellets
func createPelletRow(sprites *Sprites, txa, txb, ty int) []*Entity {
	var food []*Entity
	for tx := txa; tx <= txb; tx++ {
		food = append(food, createPellet(sprites, tx, ty))
	}
	return food
}

// createPelletColumn creates a vertical column of pellets
func createPelletColumn(sprites *Sprites, tya, tyb, tx int) []*Entity {
	var food []*Entity
	for ty := tya; ty <= tyb; ty++ {
		food = append(food, createPellet(sprites, tx, ty))
	}
	return food
}

// createPellet creates a single pellet entity
func createPellet(sprites *Sprites, tx, ty int) *Entity {
	return &Entity{
		Sprite:     sprites.Food,
		Frame:      0,
		FrameTotal: 1,
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Width:      8,
		Height:     8,
	}
}

// createPowerPellet creates a power pellet entity
func createPowerPellet(sprites *Sprites, tx, ty int) *Entity {
	return &Entity{
		Sprite:     sprites.Food,
		Frame:      1,
		FrameTotal: 1,
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Width:      8,
		Height:     8,
	}
}

// CreateCorners creates all the corner entities for pathfinding
func CreateCorners() []*Entity {
	return []*Entity{
		// ROW 1
		createCorner(1, 1, DirectionDown, DirectionRight),
		createCorner(6, 1, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(12, 1, DirectionDown, DirectionLeft),
		createCorner(15, 1, DirectionDown, DirectionRight),
		createCorner(21, 1, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(26, 1, DirectionDown, DirectionLeft),
		// ROW 5
		createCorner(1, 5, DirectionUp, DirectionDown, DirectionRight),
		createCorner(6, 5, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(9, 5, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(12, 5, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(15, 5, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(18, 5, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(21, 5, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(26, 5, DirectionUp, DirectionDown, DirectionLeft),
		// ROW 8
		createCorner(1, 8, DirectionUp, DirectionRight),
		createCorner(6, 8, DirectionUp, DirectionDown, DirectionLeft),
		createCorner(9, 8, DirectionUp, DirectionRight),
		createCorner(12, 8, DirectionDown, DirectionLeft),
		createCorner(15, 8, DirectionDown, DirectionRight),
		createCorner(18, 8, DirectionUp, DirectionLeft),
		createCorner(21, 8, DirectionUp, DirectionDown, DirectionRight),
		createCorner(26, 8, DirectionUp, DirectionLeft),
		// ROW 11
		createCorner(9, 11, DirectionDown, DirectionRight),
		createCorner(12, 11, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(15, 11, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(18, 11, DirectionDown, DirectionLeft),
		// ROW 14
		createCorner(6, 14, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(9, 14, DirectionUp, DirectionDown, DirectionLeft),
		createCorner(18, 14, DirectionUp, DirectionDown, DirectionRight),
		createCorner(21, 14, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		// ROW 17
		createCorner(9, 17, DirectionUp, DirectionDown, DirectionRight),
		createCorner(18, 17, DirectionUp, DirectionDown, DirectionLeft),
		// ROW 20
		createCorner(1, 20, DirectionDown, DirectionRight),
		createCorner(6, 20, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(9, 20, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(12, 20, DirectionDown, DirectionLeft),
		createCorner(15, 20, DirectionDown, DirectionRight),
		createCorner(18, 20, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(21, 20, DirectionUp, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(26, 20, DirectionDown, DirectionLeft),
		// ROW 23
		createCorner(1, 23, DirectionUp, DirectionRight),
		createCorner(3, 23, DirectionDown, DirectionLeft),
		createCorner(6, 23, DirectionUp, DirectionDown, DirectionRight),
		createCorner(9, 23, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(12, 23, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(15, 23, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(18, 23, DirectionDown, DirectionLeft, DirectionRight),
		createCorner(21, 23, DirectionUp, DirectionDown, DirectionLeft),
		createCorner(24, 23, DirectionDown, DirectionRight),
		createCorner(26, 23, DirectionUp, DirectionLeft),
		// ROW 26
		createCorner(1, 26, DirectionDown, DirectionRight),
		createCorner(3, 26, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(6, 26, DirectionUp, DirectionLeft),
		createCorner(9, 26, DirectionUp, DirectionRight),
		createCorner(12, 26, DirectionDown, DirectionLeft),
		createCorner(15, 26, DirectionDown, DirectionRight),
		createCorner(18, 26, DirectionUp, DirectionLeft),
		createCorner(21, 26, DirectionUp, DirectionRight),
		createCorner(24, 26, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(26, 26, DirectionDown, DirectionLeft),
		// ROW 29
		createCorner(1, 29, DirectionUp, DirectionRight),
		createCorner(12, 29, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(15, 29, DirectionUp, DirectionLeft, DirectionRight),
		createCorner(26, 29, DirectionUp, DirectionLeft),
	}
}

// createCorner creates a corner entity for pathfinding
func createCorner(tx, ty int, directions ...Direction) *Entity {
	return &Entity{
		X:          float64(8*tx + 4),
		Y:          float64(8*(ty+3) + 4),
		Directions: directions,
	}
}
