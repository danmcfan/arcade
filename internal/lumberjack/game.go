package lumberjack

import (
	"github.com/hajimehoshi/ebiten/v2"
)

const (
	debug = false

	width  = 512
	height = 288

	tileWidth  = 16
	tileHeight = 16

	scale = 1
)

var (
	player = NewPlayer()
	trees  = []*Tree{
		NewTree(width/4, height/4),
		NewTree(width*3/4, height/4),
	}

	grassSpritesheet = NewSpritesheet("Tiles/Grass/Grass_1_Middle.png", tileWidth, tileHeight)
)

type Game struct{}

func NewGame() *Game {
	return &Game{}
}

func (g *Game) Update() error {
	input := Input{
		Up:    ebiten.IsKeyPressed(ebiten.KeyW) || ebiten.IsKeyPressed(ebiten.KeyArrowUp),
		Down:  ebiten.IsKeyPressed(ebiten.KeyS) || ebiten.IsKeyPressed(ebiten.KeyArrowDown),
		Left:  ebiten.IsKeyPressed(ebiten.KeyA) || ebiten.IsKeyPressed(ebiten.KeyArrowLeft),
		Right: ebiten.IsKeyPressed(ebiten.KeyD) || ebiten.IsKeyPressed(ebiten.KeyArrowRight),
		Space: ebiten.IsKeyPressed(ebiten.KeySpace),
	}
	player.Update(input)

	for _, tree := range trees {
		if Overlaps(player.ActionHitbox(), tree.Hitbox()) && player.Acting && player.FrameX == 2 {
			overlapX, overlapY := Resolve(player.ActionHitbox(), tree.Hitbox())
			if overlapX < 0 {
				tree.Shake(true)
				tree.Health -= 10
			} else if overlapX > 0 {
				tree.Shake(false)
				tree.Health -= 10
			}

			if overlapY < 0 {
				tree.Shake(true)
				tree.Health -= 10
			} else if overlapY > 0 {
				tree.Shake(false)
				tree.Health -= 10
			}
		}

		tree.Update()
		withinX := tree.PositionX-20 < player.PositionX && tree.PositionX+20 > player.PositionX

		above := player.PositionY < tree.PositionY+16
		withinY := tree.PositionY-32 < player.PositionY && above

		tree.Behind = above
		tree.Transparent = withinX && withinY
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	// move to background specific function, grid specific function
	for x := 0; x < width; x += tileWidth {
		for y := 0; y < height; y += tileHeight {
			grassFrame := grassSpritesheet.Frame(0, 0)
			op := &ebiten.DrawImageOptions{}
			op.GeoM.Translate(float64(x), float64(y))
			op.GeoM.Scale(float64(scale), float64(scale))
			screen.DrawImage(grassFrame, op)
		}
	}

	// move to z-index drawing that takes all entities and determines draw order
	for _, tree := range trees {
		if !tree.Behind {
			tree.Draw(screen)
		}
	}
	player.Draw(screen)
	for _, tree := range trees {
		if tree.Behind {
			tree.Draw(screen)
		}
	}
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return width * scale, height * scale
}
