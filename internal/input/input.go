package input

import (
	"fmt"
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

type Axis string

const (
	AxisVertical   Axis = "VERTICAL"
	AxisHorizontal Axis = "HORIZONTAL"
)

func (d Direction) Opposite() Direction {
	switch d {
	case DirectionUp:
		return DirectionDown
	case DirectionDown:
		return DirectionUp
	case DirectionLeft:
		return DirectionRight
	case DirectionRight:
		return DirectionLeft
	}

	panic(fmt.Sprintf("invalid direction: %s", d))
}

func (d Direction) Axis() Axis {
	if d == DirectionUp || d == DirectionDown {
		return AxisVertical
	}
	return AxisHorizontal
}

type Input struct {
	Up     bool
	Down   bool
	Left   bool
	Right  bool
	Space  bool
	Escape bool
	ShiftP bool
}

func (i *Input) Moving() bool {
	return i.Up || i.Down || i.Left || i.Right
}

func (i *Input) Direction() Direction {
	if i.Up {
		return DirectionUp
	}
	if i.Down {
		return DirectionDown
	}
	if i.Left {
		return DirectionLeft
	}
	if i.Right {
		return DirectionRight
	}
	return ""
}

func ReadInput(pressedKeys []ebiten.Key, justPressedKeys []ebiten.Key) Input {
	state := Input{}

	state.Up = slices.Contains(pressedKeys, ebiten.KeyW) || slices.Contains(pressedKeys, ebiten.KeyArrowUp)
	state.Down = slices.Contains(pressedKeys, ebiten.KeyS) || slices.Contains(pressedKeys, ebiten.KeyArrowDown)
	state.Left = slices.Contains(pressedKeys, ebiten.KeyA) || slices.Contains(pressedKeys, ebiten.KeyArrowLeft)
	state.Right = slices.Contains(pressedKeys, ebiten.KeyD) || slices.Contains(pressedKeys, ebiten.KeyArrowRight)

	state.Space = slices.Contains(pressedKeys, ebiten.KeySpace)
	state.Escape = slices.Contains(pressedKeys, ebiten.KeyEscape)

	shiftPressed := slices.Contains(pressedKeys, ebiten.KeyShift) || slices.Contains(pressedKeys, ebiten.KeyShiftLeft) || slices.Contains(pressedKeys, ebiten.KeyShiftRight)
	pPressed := slices.Contains(justPressedKeys, ebiten.KeyP)
	state.ShiftP = shiftPressed && pPressed

	return state
}
