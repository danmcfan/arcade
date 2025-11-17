package arcade

import (
	"math"

	"arcade/internal/assets"
	"arcade/internal/input"
)

func Update(s *State, i input.InputState) error {
	applyInput(s, i)
	updatePlayer(s)

	newRect := rect{x: s.player.X - s.player.Width/2, y: s.player.Y - s.player.Height/2, w: s.player.Width, h: s.player.Height}
	machine, ok := findMachine(newRect, s.machines)

	if ok && s.player.Direction == DirectionUp {
		if !s.melodyPlaying {
			s.imageTitle = machine.imageTitle
			s.melodyPlaying = true
			assets.SoundMelody.Play()
		}
	} else {
		if s.melodyPlaying {
			s.imageTitle = nil
			s.melodyPlaying = false
			assets.SoundMelody.Pause()
			assets.SoundMelody.Rewind()
		}
	}

	if ok && s.player.Direction == DirectionUp && i.Interact {
		s.melodyPlaying = false
		assets.SoundMelody.Pause()
		assets.SoundMelody.Rewind()

		s.LoadedSoftware = machine.newSoftware(s.HighScore)
	}

	return nil
}

func applyInput(s *State, i input.InputState) {
	if i.Moving {
		s.player.Direction = Direction(i.MoveDirection)
		s.player.Velocity = 1
		return
	}

	s.player.Velocity = 0
}

func updatePlayer(s *State) {
	newX, newY := newPosition(
		s.player.X,
		s.player.Y,
		s.player.Direction,
		s.player.Velocity,
	)

	newRect := rect{x: newX - s.player.Width/2, y: newY - s.player.Height/2, w: s.player.Width, h: s.player.Height}
	collides := checkCollisions(newRect, s.walls)

	if !collides {
		s.player.X = newX
		s.player.Y = newY
	}

	s.player.Frame = newFrame(s.player.Frame, s.player.Velocity, s.player.FrameIncrement, s.player.FrameTotal)
}

func newPosition(x, y float64, direction Direction, velocity float64) (newX, newY float64) {
	newX, newY = x, y

	switch direction {
	case DirectionUp:
		newY -= velocity
	case DirectionDown:
		newY += velocity
	case DirectionLeft:
		newX -= velocity
	case DirectionRight:
		newX += velocity
	}

	return newX, newY
}

func newFrame(currentFrame, velocity, frameIncrement, frameTotal float64) float64 {
	if velocity > 0 {
		newFrame := currentFrame + frameIncrement
		return math.Mod(newFrame, frameTotal)
	}
	return 0
}
