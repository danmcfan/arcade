package lumberjack

import (
	"bytes"
	"embed"
	"image"
	"image/png"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
)

//go:embed images
var files embed.FS

type Spritesheet struct {
	Image  *ebiten.Image
	Width  int
	Height int
	MaxX   int
	MaxY   int
}

func NewSpritesheet(filepath string, width, height int) *Spritesheet {
	data, err := files.ReadFile("images/" + filepath)
	if err != nil {
		log.Fatal(err)
	}
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		log.Fatal(err)
	}
	return &Spritesheet{
		Image:  ebiten.NewImageFromImage(img),
		Width:  width,
		Height: height,
		MaxX:   img.Bounds().Dx() / width,
		MaxY:   img.Bounds().Dy() / height,
	}
}

func (s *Spritesheet) Frame(x, y int) *ebiten.Image {
	if x < 0 || x >= s.MaxX || y < 0 || y >= s.MaxY {
		return nil
	}

	return s.Image.SubImage(image.Rect(x*s.Width, y*s.Height, (x+1)*s.Width, (y+1)*s.Height)).(*ebiten.Image)
}
