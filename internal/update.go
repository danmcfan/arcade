//go:build js

package internal

func update(state *State) {
	if contains(state.Keys, "ArrowUp") || contains(state.Keys, "KeyW") {
		state.GamerEntity.Direction = DirectionUp
	} else if contains(state.Keys, "ArrowDown") || contains(state.Keys, "KeyS") {
		state.GamerEntity.Direction = DirectionDown
	} else if contains(state.Keys, "ArrowLeft") || contains(state.Keys, "KeyA") {
		state.GamerEntity.Direction = DirectionLeft
	} else if contains(state.Keys, "ArrowRight") || contains(state.Keys, "KeyD") {
		state.GamerEntity.Direction = DirectionRight
	}
}

func contains(keys map[string]bool, key string) bool {
	_, ok := keys[key]
	return ok
}
