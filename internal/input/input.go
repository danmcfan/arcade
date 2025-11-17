package input

import (
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

type Direction string

const (
	DirectionUp    Direction = "UP"
	DirectionDown  Direction = "DOWN"
	DirectionLeft  Direction = "LEFT"
	DirectionRight Direction = "RIGHT"
)

type InputState struct {
	MoveDirection Direction
	Moving        bool
	Interact      bool
	Exit          bool
	ToggleDebug   bool
}

// ReadInput processes keyboard input and returns the input state.
// This is a pure function that translates key presses into game actions.
func ReadInput(pressedKeys []ebiten.Key, justPressedKeys []ebiten.Key) InputState {
	state := InputState{}

	// Check movement keys (priority: last checked wins)
	if slices.Contains(pressedKeys, ebiten.KeyW) || slices.Contains(pressedKeys, ebiten.KeyArrowUp) {
		state.MoveDirection = DirectionUp
		state.Moving = true
	}
	if slices.Contains(pressedKeys, ebiten.KeyS) || slices.Contains(pressedKeys, ebiten.KeyArrowDown) {
		state.MoveDirection = DirectionDown
		state.Moving = true
	}
	if slices.Contains(pressedKeys, ebiten.KeyA) || slices.Contains(pressedKeys, ebiten.KeyArrowLeft) {
		state.MoveDirection = DirectionLeft
		state.Moving = true
	}
	if slices.Contains(pressedKeys, ebiten.KeyD) || slices.Contains(pressedKeys, ebiten.KeyArrowRight) {
		state.MoveDirection = DirectionRight
		state.Moving = true
	}

	// Check action keys
	state.Interact = slices.Contains(pressedKeys, ebiten.KeySpace)
	state.Exit = slices.Contains(pressedKeys, ebiten.KeyEscape)

	// Check debug toggle (Shift+P)
	shiftPressed := slices.Contains(pressedKeys, ebiten.KeyShift) || slices.Contains(pressedKeys, ebiten.KeyShiftLeft) || slices.Contains(pressedKeys, ebiten.KeyShiftRight)
	pPressed := slices.Contains(justPressedKeys, ebiten.KeyP)
	state.ToggleDebug = shiftPressed && pPressed

	return state
}
