package internal

import "math"

// CalculateNewPosition returns the new position based on current position, direction, and velocity
func CalculateNewPosition(x, y float64, direction Direction, velocity float64) (newX, newY float64) {
	newX, newY = x, y

	switch direction {
	case DirectionUp:
		newY -= velocity
	case DirectionDown:
		newY += velocity
	case DirectionLeft:
		newX -= velocity
	case DirectionRight:
		newX += velocity
	}

	return newX, newY
}

// UpdateAnimationFrame calculates the next animation frame.
// Returns the new frame value based on current frame, velocity, increment, and total frames.
func UpdateAnimationFrame(currentFrame, velocity, frameIncrement, frameTotal float64) float64 {
	if velocity > 0 {
		newFrame := currentFrame + frameIncrement
		return math.Mod(newFrame, frameTotal)
	}
	return 0 // Idle frame
}

