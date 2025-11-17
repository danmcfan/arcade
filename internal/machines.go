package internal

// Machine represents an interactive object in the game world
type Machine struct {
	X, Y, Width, Height float64
	InteractRadius      float64
	Name                string
}

// CreateArcadeMachines returns the configured machines for the arcade room.
// All machine positions and sizes are defined in constants.go.
func CreateArcadeMachines() []Machine {
	return []Machine{
		{
			X:              HiveMachineX,
			Y:              HiveMachineY,
			Width:          HiveMachineWidth,
			Height:         HiveMachineHeight,
			InteractRadius: HiveMachineInteractRadius,
			Name:           "hive",
		},
		// Add more machines here as needed
	}
}

// FindNearestMachine returns the nearest machine if player is in front of it, or nil if none found.
// Machines face down, so the interaction zone is below the machine.
func FindNearestMachine(playerX, playerY float64, machines []Machine) *Machine {
	for i := range machines {
		machine := &machines[i]

		// Check if player is horizontally aligned with machine (within machine width)
		if playerX < machine.X || playerX > machine.X+machine.Width {
			continue
		}

		// Check if player is in front of machine (below it, within interaction distance)
		distanceFromFront := playerY - (machine.Y + machine.Height)
		if distanceFromFront >= 0 && distanceFromFront <= machine.InteractRadius {
			return machine
		}
	}
	return nil
}

// MachineToWall converts a machine to a wall for collision detection
func MachineToWall(m Machine) Wall {
	return Wall{
		X:      m.X,
		Y:      m.Y,
		Width:  m.Width,
		Height: m.Height,
	}
}

// CheckMachineCollision checks if entity collides with any machines
func CheckMachineCollision(x, y, width, height float64, machines []Machine) bool {
	for _, machine := range machines {
		wall := MachineToWall(machine)
		if CheckRectCollision(x, y, width, height, wall) {
			return true
		}
	}
	return false
}
