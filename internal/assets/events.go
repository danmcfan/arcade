package assets

import "strings"

// OnSoundEvent, when set, receives every Sound call as "<action>:<name>"
// ("play:start", "rewind:laser", "pause:melody", ...), before any readiness
// check. Golden harness only (tools/golden); nil in the game.
var OnSoundEvent func(event string)

func emitSoundEvent(action, name string) {
	if OnSoundEvent != nil {
		OnSoundEvent(action + ":" + name)
	}
}

func soundName(filename string) string {
	if i := strings.LastIndexByte(filename, '.'); i >= 0 {
		return filename[:i]
	}
	return filename
}
