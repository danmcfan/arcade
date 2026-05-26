package arcade

import (
	"github.com/danmcfan/arcade/internal/assets"
	"image"

	"github.com/hajimehoshi/ebiten/v2"
)

func Draw(screen *ebiten.Image, s *State, buffer float64, debugMode bool) {
	drawImage(screen, assets.ImageArcade, buffer, buffer)

	player := s.player
	row := player.FrameDirection[player.Direction]
	playerImageFrame := cutImage(player.Image, float64(int(player.Frame))*player.Width, float64(row)*player.Height, player.Width, player.Height)
	drawImage(screen, playerImageFrame, player.X+buffer-player.Width/2, player.Y+buffer-player.Height/2)

	if s.melodyPlaying {
		drawImage(screen, s.imageTitle, buffer, buffer)
	}

	if debugMode {
		drawDebugOverlay(screen, s, buffer)
	}
}

func cutImage(img *ebiten.Image, x, y, w, h float64) *ebiten.Image {
	return img.SubImage(image.Rect(int(x), int(y), int(x+w), int(y+h))).(*ebiten.Image)
}

func drawImage(screen *ebiten.Image, img *ebiten.Image, x, y float64) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(x, y)
	screen.DrawImage(img, op)
}
