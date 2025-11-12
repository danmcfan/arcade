//go:build js

package internal

import "syscall/js"

const (
	FRAMES_PER_SECOND = 60
	FRAME_INTERVAL_MS = 1000 / FRAMES_PER_SECOND
)

func CreateLoop(state *State) js.Func {
	var loop js.Func
	loop = js.FuncOf(func(this js.Value, args []js.Value) any {
		current := args[0].Int()
		state.Lag += current - state.Previous
		state.Previous = current

		for state.Lag >= FRAME_INTERVAL_MS {
			update(state)
			state.Lag -= FRAME_INTERVAL_MS
		}
		render(state)
		js.Global().Call("requestAnimationFrame", loop)
		return nil
	})
	return loop
}
