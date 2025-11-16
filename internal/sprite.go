package internal

import (
	"bytes"
	"embed"
	"image/png"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
)

//go:embed assets
var assets embed.FS

var imageArcade *ebiten.Image
var imageBear *ebiten.Image
var imageBee *ebiten.Image
var imageDigits *ebiten.Image
var imageFood *ebiten.Image
var imageGamer *ebiten.Image
var imageHive *ebiten.Image
var imageReady *ebiten.Image
var imageTitle *ebiten.Image

var imageBackground *ebiten.Image

func init() {
	imageArcade = loadImage("assets/arcade.png")
	imageBear = loadImage("assets/bear.png")
	imageBee = loadImage("assets/bee.png")
	imageDigits = loadImage("assets/digits.png")
	imageFood = loadImage("assets/food.png")
	imageGamer = loadImage("assets/gamer.png")
	imageHive = loadImage("assets/hive.png")
	imageReady = loadImage("assets/ready.png")
	imageTitle = loadImage("assets/title.png")

	imageBackground = imageArcade
}

func loadImage(filename string) *ebiten.Image {
	data, err := assets.ReadFile(filename)
	if err != nil {
		log.Fatal(err)
	}
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		log.Fatal(err)
	}
	return ebiten.NewImageFromImage(img)
}
