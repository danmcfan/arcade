package internal

import (
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

// InputState represents the current state of user input
type InputState struct {
	MoveDirection Direction
	Moving        bool
	Interact      bool
	Exit          bool
	ToggleDebug   bool
}

// ReadInput processes keyboard input and returns the input state.
// This is a pure function that translates key presses into game actions.
func ReadInput(keys []ebiten.Key) InputState {
	state := InputState{}

	// Check movement keys (priority: last checked wins)
	if slices.Contains(keys, ebiten.KeyW) || slices.Contains(keys, ebiten.KeyArrowUp) {
		state.MoveDirection = DirectionUp
		state.Moving = true
	}
	if slices.Contains(keys, ebiten.KeyS) || slices.Contains(keys, ebiten.KeyArrowDown) {
		state.MoveDirection = DirectionDown
		state.Moving = true
	}
	if slices.Contains(keys, ebiten.KeyA) || slices.Contains(keys, ebiten.KeyArrowLeft) {
		state.MoveDirection = DirectionLeft
		state.Moving = true
	}
	if slices.Contains(keys, ebiten.KeyD) || slices.Contains(keys, ebiten.KeyArrowRight) {
		state.MoveDirection = DirectionRight
		state.Moving = true
	}

	// Check action keys
	state.Interact = slices.Contains(keys, ebiten.KeySpace)
	state.Exit = slices.Contains(keys, ebiten.KeyEscape)

	// Check debug toggle (Shift+P)
	shiftPressed := slices.Contains(keys, ebiten.KeyShift) || slices.Contains(keys, ebiten.KeyShiftLeft) || slices.Contains(keys, ebiten.KeyShiftRight)
	pPressed := slices.Contains(keys, ebiten.KeyP)
	state.ToggleDebug = shiftPressed && pPressed

	return state
}
