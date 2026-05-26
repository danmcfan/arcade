package arcade

import (
	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/firefly"
	"github.com/danmcfan/arcade/internal/gearhead"
	"github.com/danmcfan/arcade/internal/hive"
	"github.com/danmcfan/arcade/internal/software"

	"github.com/hajimehoshi/ebiten/v2"
)

type machine struct {
	rect        rect
	imageTitle  *ebiten.Image
	newSoftware func(highscore int) software.Software
}

func newMachines() []machine {
	return []machine{
		{
			rect:        rect{x: tileSize * 6, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2},
			imageTitle:  assets.ImageTitleGearhead,
			newSoftware: func(highscore int) software.Software { return gearhead.NewGearHeadSoftware() },
		},
		{
			rect:        rect{x: tileSize * 9, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2},
			imageTitle:  assets.ImageTitleSweet,
			newSoftware: func(highscore int) software.Software { return hive.NewHiveSoftware(highscore) },
		},
		{
			rect:        rect{x: tileSize * 12, y: tileSize * 5, w: tileSize * 2, h: tileSize * 2},
			imageTitle:  assets.ImageTitleFirefly,
			newSoftware: func(highscore int) software.Software { return firefly.NewFireFlySoftware() },
		},
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
