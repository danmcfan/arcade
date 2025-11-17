package internal

// CreateArcadeWalls returns the hardcoded wall boundaries for the arcade room.
// These walls define the playable area. All values are defined in constants.go.
func CreateArcadeWalls() []Wall {
	return []Wall{
		// Top wall
		{X: WallTopX, Y: WallTopY, Width: WallTopWidth, Height: WallTopHeight},
		// Bottom wall
		{X: WallBottomX, Y: WallBottomY, Width: WallBottomWidth, Height: WallBottomHeight},
		// Left wall
		{X: WallLeftX, Y: WallLeftY, Width: WallLeftWidth, Height: WallLeftHeight},
		// Right wall
		{X: WallRightX, Y: WallRightY, Width: WallRightWidth, Height: WallRightHeight},
	}
}

