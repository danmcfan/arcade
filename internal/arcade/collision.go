package arcade

type rect struct {
	x, y, w, h float64
}

func newWalls() []rect {
	return []rect{
		{x: 0, y: 0, w: tileSize * 20, h: tileSize * 6},
		{x: 0, y: tileSize * 6, w: tileSize * 3, h: tileSize * 9},
		{x: tileSize * 17, y: tileSize * 6, w: tileSize * 3, h: tileSize * 9},
		{x: 0, y: tileSize * 15, w: tileSize * 20, h: tileSize * 3},
	}
}

func checkCollision(a, b rect) bool {
	leftA := a.x
	rightA := leftA + a.w
	topA := a.y
	bottomA := topA + a.h

	leftB := b.x
	rightB := leftB + b.w
	topB := b.y
	bottomB := topB + b.h

	return leftA < rightB &&
		rightA > leftB &&
		topA < bottomB &&
		bottomA > topB
}

func checkCollisions(a rect, bs []rect) bool {
	for _, b := range bs {
		if checkCollision(a, b) {
			return true
		}
	}
	return false
}
