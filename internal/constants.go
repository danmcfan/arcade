package internal

// Coordinate System:
// - All game objects use CENTER POINT positioning (X, Y = center of object)
// - Walls/Machines use TOP-LEFT positioning (X, Y = top-left corner)
// - Buffer is added around the playable area for visual spacing

// Screen and layout constants
const (
	TileSize = 8.0          // Base tile size in pixels
	Buffer   = TileSize * 4 // Buffer space around game area (32 pixels)
)

// Player constants
// Note: PlayerStartX/Y are CENTER positions of the player
const (
	PlayerStartX         = TileSize * 10   // Center X: 80px
	PlayerStartY         = TileSize * 10.5 // Center Y: 84px
	PlayerWidth          = TileSize * 2    // 16px wide
	PlayerHeight         = TileSize * 3    // 24px tall
	PlayerVelocity       = 1.0             // Movement speed in pixels/frame
	PlayerFrameTotal     = 4.0             // Number of animation frames
	PlayerFrameIncrement = 0.10            // Animation speed
)

// Player sprite sheet constants
const (
	PlayerSpriteWidth  = TileSize * 2
	PlayerSpriteHeight = TileSize * 3
)

// Arcade room wall boundaries (for 160x144 base room)
const (
	// Top wall
	WallTopX      = 0.0
	WallTopY      = 0.0
	WallTopWidth  = TileSize * 20
	WallTopHeight = TileSize * 6

	// Bottom wall
	WallBottomX      = 0.0
	WallBottomY      = TileSize * 15
	WallBottomWidth  = TileSize * 20
	WallBottomHeight = TileSize * 3

	// Left wall
	WallLeftX      = 0.0
	WallLeftY      = TileSize * 6
	WallLeftWidth  = TileSize * 3
	WallLeftHeight = TileSize * 9

	// Right wall
	WallRightX      = TileSize * 17
	WallRightY      = TileSize * 6
	WallRightWidth  = TileSize * 3
	WallRightHeight = TileSize * 9
)

// Machine constants
// Note: Machine positions are TOP-LEFT corners
const (
	// Hive machine position and size
	HiveMachineX              = TileSize * 9 // Top-left X: 70px
	HiveMachineY              = TileSize * 5 // Top-left Y: 60px
	HiveMachineWidth          = TileSize * 2 // 16px wide
	HiveMachineHeight         = TileSize * 1 // 16px tall
	HiveMachineInteractRadius = TileSize * 1 // 16px interaction range
)
