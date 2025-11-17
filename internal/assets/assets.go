package assets

import (
	"bytes"
	"embed"
	"image/png"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/audio"
)

const sampleRate = 44100

//go:embed images
var images embed.FS

//go:embed sounds
var sounds embed.FS

var ImageArcade *ebiten.Image
var ImageBear *ebiten.Image
var ImageBee *ebiten.Image
var ImageDigits *ebiten.Image
var ImageFood *ebiten.Image
var ImageGamer *ebiten.Image
var ImageHive *ebiten.Image
var ImageReady *ebiten.Image
var ImageTitle *ebiten.Image

var audioContext = audio.NewContext(sampleRate)

var SoundDeath *Sound
var SoundMelody *Sound
var SoundPower *Sound
var SoundStart *Sound

func init() {
	ImageArcade = loadImage("arcade")
	ImageBear = loadImage("bear")
	ImageBee = loadImage("bee")
	ImageDigits = loadImage("digits")
	ImageFood = loadImage("food")
	ImageGamer = loadImage("gamer")
	ImageHive = loadImage("hive")
	ImageReady = loadImage("ready")
	ImageTitle = loadImage("title")

	SoundDeath = loadSound("death.wav", false)
	SoundMelody = loadSound("melody.ogg", true)
	SoundPower = loadSound("power.wav", false)
	SoundStart = loadSound("start.wav", false)
}

func loadImage(filename string) *ebiten.Image {
	data, err := images.ReadFile("images/" + filename + ".png")
	if err != nil {
		log.Fatal(err)
	}
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		log.Fatal(err)
	}
	return ebiten.NewImageFromImage(img)
}
