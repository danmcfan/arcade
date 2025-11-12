//go:build js

package internal

func render(state *State) {
	ctx := state.Ctx

	ctx.Call("clearRect", 0, 0, state.Width, state.Height)

	ctx.Set("fillStyle", "white")
	ctx.Call("fillRect", 0, 0, state.Width, state.Height)

	for _, square := range state.Squares {
		ctx.Set("fillStyle", square.Color)
		ctx.Call("fillRect", square.X, square.Y, square.W, square.H)
	}
}
