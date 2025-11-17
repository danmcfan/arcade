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

var ImageArcade = loadImage("arcade")
var ImageGamer = loadImage("gamer")
var ImageTitleFirefly = loadImage("firefly")
var ImageTitleGearhead = loadImage("gearhead")
var ImageTitleSweet = loadImage("sweet")

var ImageHive = loadImage("hive")
var ImageBear = loadImage("bear")
var ImageBee = loadImage("bee")
var ImageFood = loadImage("food")
var ImageReady = loadImage("ready")
var ImageDigits = loadImage("digits")

var ImageGalaxy = loadImage("galaxy")
var ImageShip = loadImage("ship")
var ImageBullet = loadImage("bullet")

var ImageWorkshop = loadImage("workshop")

var audioContext = audio.NewContext(sampleRate)

var SoundDeath = loadSound("death.wav", false)
var SoundMelody = loadSound("melody.ogg", true)
var SoundPower = loadSound("power.wav", false)
var SoundStart = loadSound("start.wav", false)

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
