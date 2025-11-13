//go:build js

package internal

func NewFood() []*Entity {
	food := make([]*Entity, 0)
	// rows
	food = append(food, NewPelletRow(1, 12, 1)...)
	food = append(food, NewPelletRow(15, 26, 1)...)
	food = append(food, NewPelletRow(1, 26, 5)...)
	food = append(food, NewPelletRow(1, 6, 8)...)
	food = append(food, NewPelletRow(9, 12, 8)...)
	food = append(food, NewPelletRow(15, 18, 8)...)
	food = append(food, NewPelletRow(21, 26, 8)...)
	food = append(food, NewPelletRow(1, 12, 20)...)
	food = append(food, NewPelletRow(15, 26, 20)...)
	food = append(food, NewPelletRow(6, 12, 23)...)
	food = append(food, NewPelletRow(15, 21, 23)...)
	food = append(food, NewPelletRow(1, 6, 26)...)
	food = append(food, NewPelletRow(9, 12, 26)...)
	food = append(food, NewPelletRow(15, 18, 26)...)
	food = append(food, NewPelletRow(21, 26, 26)...)
	food = append(food, NewPelletRow(1, 26, 29)...)
	// columns
	food = append(food, NewPelletColumn(9, 19, 6)...)
	food = append(food, NewPelletColumn(9, 19, 21)...)
	food = append(food, NewPelletColumn(2, 4, 6)...)
	food = append(food, NewPelletColumn(2, 4, 12)...)
	food = append(food, NewPelletColumn(2, 4, 15)...)
	food = append(food, NewPelletColumn(2, 4, 21)...)
	food = append(food, NewPelletColumn(6, 7, 1)...)
	food = append(food, NewPelletColumn(6, 7, 6)...)
	food = append(food, NewPelletColumn(6, 7, 9)...)
	food = append(food, NewPelletColumn(6, 7, 18)...)
	food = append(food, NewPelletColumn(6, 7, 21)...)
	food = append(food, NewPelletColumn(6, 7, 26)...)
	food = append(food, NewPelletColumn(21, 22, 1)...)
	food = append(food, NewPelletColumn(21, 22, 6)...)
	food = append(food, NewPelletColumn(21, 22, 12)...)
	food = append(food, NewPelletColumn(21, 22, 15)...)
	food = append(food, NewPelletColumn(21, 22, 21)...)
	food = append(food, NewPelletColumn(21, 22, 26)...)
	food = append(food, NewPelletColumn(23, 25, 3)...)
	food = append(food, NewPelletColumn(23, 25, 24)...)
	food = append(food, NewPelletColumn(24, 25, 6)...)
	food = append(food, NewPelletColumn(24, 25, 9)...)
	food = append(food, NewPelletColumn(24, 25, 18)...)
	food = append(food, NewPelletColumn(24, 25, 21)...)
	food = append(food, NewPelletColumn(27, 28, 1)...)
	food = append(food, NewPelletColumn(27, 28, 12)...)
	food = append(food, NewPelletColumn(27, 28, 15)...)
	food = append(food, NewPelletColumn(27, 28, 26)...)
	// pellets
	food = append(food, NewPellet(1, 2))
	food = append(food, NewPellet(26, 2))
	food = append(food, NewPellet(26, 4))
	food = append(food, NewPellet(2, 23))
	food = append(food, NewPellet(25, 23))
	// powers
	food = append(food, NewPower(1, 3))
	food = append(food, NewPower(26, 3))
	food = append(food, NewPower(1, 23))
	food = append(food, NewPower(26, 23))

	return food
}

func NewPelletRow(txa, txb, ty int) []*Entity {
	var food []*Entity
	for tx := txa; tx <= txb; tx++ {
		food = append(food, NewPellet(tx, ty))
	}
	return food
}

func NewPelletColumn(tya, tyb, tx int) []*Entity {
	var food []*Entity
	for ty := tya; ty <= tyb; ty++ {
		food = append(food, NewPellet(tx, ty))
	}
	return food
}

func NewPellet(tx, ty int) *Entity {
	return &Entity{
		Sprite:  SpriteFood,
		Frame:   0,
		X:       float64(8*tx + 4),
		Y:       float64(8*(ty+3) + 4),
		OffsetX: 4,
		OffsetY: 4,
		Radius:  1,
	}
}

func NewPower(tx, ty int) *Entity {
	return &Entity{
		Sprite:  SpriteFood,
		Frame:   1,
		X:       float64(8*tx + 4),
		Y:       float64(8*(ty+3) + 4),
		OffsetX: 4,
		OffsetY: 4,
		Radius:  3,
	}
}
