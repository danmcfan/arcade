//go:build js

package internal

func update(state *State) {
	for _, square := range state.Squares {
		updateSquare(square, state.Width, state.Height)
	}
}

func updateSquare(s *Square, width float64, height float64) {
	s.X += s.VelocityX
	s.Y += s.VelocityY

	if s.X < 0 {
		s.X = 0
		s.VelocityX = -s.VelocityX
	}

	if s.X > width-s.W {
		s.X = width - s.W
		s.VelocityX = -s.VelocityX
	}

	if s.Y < 0 {
		s.Y = 0
		s.VelocityY = -s.VelocityY
	}

	if s.Y > height-s.H {
		s.Y = height - s.H
		s.VelocityY = -s.VelocityY
	}
}
