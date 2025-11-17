package internal

// Wall represents a static rectangular collision box
type Wall struct {
	X, Y, Width, Height float64
}

// CheckRectCollision returns true if two rectangles overlap.
// rect1 is defined by center position (x, y) and dimensions (width, height).
// rect2 is a Wall struct with top-left position and dimensions.
func CheckRectCollision(x, y, width, height float64, rect Wall) bool {
	// Convert center position to top-left for AABB collision
	left := x - width/2
	top := y - height/2
	right := left + width
	bottom := top + height

	// AABB collision detection
	return left < rect.X+rect.Width &&
		right > rect.X &&
		top < rect.Y+rect.Height &&
		bottom > rect.Y
}

// CheckWallCollision checks if entity collides with any walls
func CheckWallCollision(x, y, width, height float64, walls []Wall) bool {
	for _, wall := range walls {
		if CheckRectCollision(x, y, width, height, wall) {
			return true
		}
	}
	return false
}
