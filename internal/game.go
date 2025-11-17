package internal

import (
	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
)

// Constants are now defined in constants.go

// Game holds the game state and coordinates all game systems.
// It follows a clear update-render loop with minimal state.
type Game struct {
	player   *Entity
	walls    []Wall
	machines []Machine

	// Debug state
	debugMode          bool
	debugColors        DebugColors
	debugKeyWasPressed bool // Track to prevent key repeat
}

// NewGame creates and initializes a new game instance
func NewGame() *Game {
	return &Game{
		player:      createPlayer(),
		walls:       CreateArcadeWalls(),
		machines:    CreateArcadeMachines(),
		debugColors: DefaultDebugColors(),
	}
}

// SetDebugColors allows customization of debug rendering colors
func (g *Game) SetDebugColors(colors DebugColors) {
	g.debugColors = colors
}

// createPlayer initializes the player entity with starting values
func createPlayer() *Entity {
	return &Entity{
		Sprite:         imageGamer,
		Frame:          0,
		FrameIncrement: PlayerFrameIncrement,
		FrameTotal:     PlayerFrameTotal,
		FrameDirection: map[Direction]int{
			DirectionUp:    0,
			DirectionDown:  1,
			DirectionLeft:  2,
			DirectionRight: 3,
		},
		X:         PlayerStartX,
		Y:         PlayerStartY,
		Width:     PlayerWidth,
		Height:    PlayerHeight,
		Direction: DirectionDown,
		Velocity:  0,
	}
}

// Update runs one game tick. The flow is:
// 1. Read input -> 2. Update state -> 3. Check collisions -> 4. Handle interactions
func (g *Game) Update() error {
	// 1. Read keyboard input
	keys := inpututil.AppendPressedKeys(nil)
	input := ReadInput(keys)

	// 2. Handle debug mode toggle (only toggle when key is newly pressed)
	if input.ToggleDebug && !g.debugKeyWasPressed {
		g.debugMode = !g.debugMode
		g.debugKeyWasPressed = true
	} else if !input.ToggleDebug {
		g.debugKeyWasPressed = false
	}

	// 3. Apply input to player state
	g.applyInput(input)

	// 4. Update player position and check collisions
	g.updatePlayerMovement()

	// 5. Update player animation frame
	g.player.Frame = UpdateAnimationFrame(
		g.player.Frame,
		g.player.Velocity,
		g.player.FrameIncrement,
		g.player.FrameTotal,
	)

	// 6. Check for machine interactions
	nearbyMachine := FindNearestMachine(g.player.X, g.player.Y, g.machines)
	if nearbyMachine != nil && input.Interact {
		activateMachine(nearbyMachine)
	}

	// 7. Handle exit action
	if input.Exit {
		imageBackground = imageArcade
	}

	return nil
}

// applyInput updates player direction and velocity based on input
func (g *Game) applyInput(input InputState) {
	if input.Moving {
		g.player.Direction = input.MoveDirection
		g.player.Velocity = PlayerVelocity
	} else {
		g.player.Velocity = 0
	}
}

// updatePlayerMovement calculates new position and validates against collisions
func (g *Game) updatePlayerMovement() {
	// Calculate where the player wants to move
	newX, newY := CalculateNewPosition(
		g.player.X,
		g.player.Y,
		g.player.Direction,
		g.player.Velocity,
	)

	// Check if new position would collide with anything
	collides := CheckWallCollision(newX, newY, g.player.Width, g.player.Height, g.walls) ||
		CheckMachineCollision(newX, newY, g.player.Width, g.player.Height, g.machines)

	// Only move if no collision
	if !collides {
		g.player.X = newX
		g.player.Y = newY
	}
}

// activateMachine handles the interaction with a specific machine
func activateMachine(machine *Machine) {
	switch machine.Name {
	case "hive":
		imageBackground = imageHive
	}
}

// Draw renders the game state to the screen
func (g *Game) Draw(screen *ebiten.Image) {

	// Calculate buffer offset
	bufferOffsetX := Buffer / 2
	bufferOffsetY := Buffer / 2

	// Draw background
	drawImage(screen, imageBackground, bufferOffsetX, bufferOffsetY)

	// Draw player sprite (with buffer offset to match background)
	g.drawPlayer(screen, bufferOffsetX, bufferOffsetY)

	// Draw debug overlay if debug mode is enabled
	if g.debugMode {
		DrawDebugOverlay(screen, g.player, g.walls, g.machines, g.debugColors, bufferOffsetX, bufferOffsetY)
	}

	// Draw interaction prompt if near a machine
	if FindNearestMachine(g.player.X, g.player.Y, g.machines) != nil {
		// You can add visual feedback here (e.g., "Press SPACE")
	}
}

// drawPlayer renders the player sprite with correct frame and direction
func (g *Game) drawPlayer(screen *ebiten.Image, bufferOffsetX, bufferOffsetY float64) {
	row := g.player.FrameDirection[g.player.Direction]

	// Extract the correct frame from sprite sheet
	spriteFrame := getImageFrame(
		g.player.Sprite,
		float64(int(g.player.Frame))*PlayerSpriteWidth,
		float64(row)*PlayerSpriteHeight,
		PlayerSpriteWidth,
		PlayerSpriteHeight,
	)

	// Draw at player position (top-left corner with buffer offset)
	// Player X,Y is center, so subtract half width/height to get top-left
	drawImage(screen, spriteFrame,
		g.player.X-g.player.Width/2+bufferOffsetX,
		g.player.Y-g.player.Height/2+bufferOffsetY)
}

// Layout returns the game's logical screen size
func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return int(float64(imageBackground.Bounds().Dx()) + Buffer), int(float64(imageBackground.Bounds().Dy()) + Buffer)
}
