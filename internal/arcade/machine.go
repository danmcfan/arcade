package arcade

import (
	"arcade/internal/hive"
	"arcade/internal/software"
)

type machine struct {
	rect        rect
	newSoftware func(highscore int) software.Software
}

func newMachines() []machine {
	return []machine{
		{rect: rect{x: tileSize * 9, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2}, newSoftware: func(highscore int) software.Software { return hive.NewHiveSoftware(highscore) }},
	}
}

func findMachine(a rect, ms []machine) (machine, bool) {
	for _, m := range ms {
		if checkCollision(a, m.rect) {
			return m, true
		}
	}
	return machine{}, false
}
