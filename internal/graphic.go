//go:build js

package internal

type Graphic struct {
	Sprite    Sprite
	Frame     float64
	Direction Direction
	Moving    bool
}
