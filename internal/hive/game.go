package hive

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"image"
	"log"
	"math"
	"math/rand"
	"slices"

	"github.com/hajimehoshi/ebiten/v2"
)

const (
	FramesPerSecond    = 60
	BlueFramesDuration = FramesPerSecond * 10
)

type HiveSoftware struct {
	// Sprites
	sprites *Sprites

	// Entities
	bear    *Entity
	bees    []*Entity
	food    []*Entity
	corners []*Entity

	// Game state
	lives       int
	score       int
	highScore   int
	startFrames int

	// Input tracking
	lastInput Direction
}

// NewHiveSoftware creates a new instance of the hive game
func NewHiveSoftware(highscore int) *HiveSoftware {
	s := &HiveSoftware{
		highScore: highscore,
		sprites:   NewSprites(),
		corners:   CreateCorners(),
	}
	s.Reset()
	assets.SoundStart.Rewind()
	assets.SoundStart.Play()
	return s
}

func (h *HiveSoftware) Background() *ebiten.Image {
	return h.sprites.Hive
}

func (h *HiveSoftware) GameOver() bool {
	return h.lives <= 0
}

func (h *HiveSoftware) Score() int {
	return h.score
}

// Update runs one game tick for the hive game
func (h *HiveSoftware) Update(i input.InputState) error {
	// Handle start countdown
	if h.startFrames > 0 {
		h.startFrames--
		return nil
	}

	// Check win condition (all food collected)
	if h.checkWinCondition() {
		h.food = CreateFood(h.sprites)
		h.resetPositions()
		assets.SoundStart.Rewind()
		assets.SoundStart.Play()
		return nil
	}

	h.handleInput(i)

	// Update bear (player)
	h.updateEntityFrame(h.bear)
	h.updateBearPosition()

	// Update bees (enemies)
	for _, bee := range h.bees {
		h.updateEntityFrame(bee)
		h.updateBeeDirection(bee)
		h.updateBeePosition(bee)

		// Update blue frames
		if bee.BlueFrames > 0 {
			bee.BlueFrames--
			if bee.BlueFrames <= FramesPerSecond*2 {
				// Start flashing
				if bee.FlashFrames != 0 {
					bee.FlashFrames--
				} else {
					bee.Flash = !bee.Flash
					bee.FlashFrames = 5
				}
			}
		} else {
			bee.FlashFrames = 0
			bee.Flash = false
		}
	}

	// Check collisions with bees
	for _, bee := range h.bees {
		if h.collideWithDistance(h.bear, bee, 1.0) {
			if bee.BlueFrames > 0 {
				h.score += 200
				h.resetBee(bee)
			} else {
				assets.SoundDeath.Rewind()
				assets.SoundDeath.Play()
				h.lives--
				if h.lives <= 0 {
					return nil
				}
				h.resetPositions()
			}
		}
	}

	// Check collisions with food
	for i, f := range h.food {
		if f == nil {
			continue
		}

		if h.collide(h.bear, f) {
			if f.IsPower() {
				assets.SoundPower.Rewind()
				assets.SoundPower.Play()
				h.score += 50
				for _, bee := range h.bees {
					bee.BlueFrames = BlueFramesDuration
					bee.FlashFrames = 0
					bee.Flash = false
				}
			} else {
				h.score += 10
			}
			h.food[i] = nil
			break
		}
	}

	return nil
}

// Draw renders the hive game to the screen
func (h *HiveSoftware) Draw(screen *ebiten.Image, buffer float64) {
	// Draw background
	drawImageAt(screen, h.sprites.Hive, buffer, buffer)

	// Draw score
	h.renderScore(screen, buffer)
	h.renderHighScore(screen, buffer)
	h.renderLives(screen, buffer)

	// Draw "Ready!" if in countdown
	if h.startFrames > 0 {
		h.renderReady(screen, buffer)
	}

	// Draw food
	for _, food := range h.food {
		if food != nil {
			h.renderEntity(screen, food, buffer)
		}
	}

	// Draw bear
	h.renderEntity(screen, h.bear, buffer)

	// Draw bees
	for _, bee := range h.bees {
		h.renderEntity(screen, bee, buffer)
	}
}

// Reset resets the game to initial state
func (h *HiveSoftware) Reset() {
	h.lives = 3
	h.score = 0
	h.bear = CreateBear(h.sprites)
	h.bees = CreateBees(h.sprites)
	h.food = CreateFood(h.sprites)
	h.startFrames = FramesPerSecond * 2
	h.lastInput = DirectionLeft
}

func (h *HiveSoftware) checkWinCondition() bool {
	for _, f := range h.food {
		if f != nil {
			return false
		}
	}
	return true
}

func (h *HiveSoftware) handleInput(i input.InputState) {
	h.setBearDirection(Direction(i.MoveDirection))
}

func (h *HiveSoftware) setBearDirection(newDirection Direction) {
	h.lastInput = newDirection

	corner := h.findCorner(h.bear)
	if corner == nil {
		// Not at a corner, only allow direction changes along the same axis
		validDirections := []Direction{}
		switch h.bear.Direction.Axis() {
		case AxisVertical:
			validDirections = []Direction{DirectionUp, DirectionDown}
		case AxisHorizontal:
			validDirections = []Direction{DirectionLeft, DirectionRight}
		}

		if !slices.Contains(validDirections, newDirection) {
			return
		}

		h.bear.Direction = newDirection
		return
	}

	// At a corner, check if direction is valid
	if !slices.Contains(corner.Directions, newDirection) {
		return
	}

	// Snap to corner position if changing axis
	if h.bear.Direction.Axis() != newDirection.Axis() {
		h.bear.X = corner.X
		h.bear.Y = corner.Y
	}

	h.bear.Direction = newDirection
}

func (h *HiveSoftware) updateEntityFrame(e *Entity) {
	if e.Velocity > 0 {
		e.Frame += e.FrameIncrement
		e.Frame = math.Mod(e.Frame, e.FrameTotal)
	} else {
		e.Frame = 0
	}
}

func (h *HiveSoftware) updateBearPosition() {
	validDirections := []Direction{h.bear.Direction}

	corner := h.findCorner(h.bear)
	if corner != nil {
		validDirections = corner.Directions
	}

	if slices.Contains(validDirections, h.bear.Direction) {
		switch h.bear.Direction {
		case DirectionUp:
			h.bear.Y -= h.bear.Velocity
		case DirectionDown:
			h.bear.Y += h.bear.Velocity
		case DirectionLeft:
			h.bear.X -= h.bear.Velocity
		case DirectionRight:
			h.bear.X += h.bear.Velocity
		}
	}

	// Wrap around at tunnel
	if h.bear.Y == float64(8*17+4) {
		if h.bear.X <= 0 {
			h.bear.X = float64(8 * 28)
		} else if h.bear.X >= float64(8*28) {
			h.bear.X = 0
		}
	}
}

func (h *HiveSoftware) updateBeeDirection(bee *Entity) {
	corner := h.findCorner(bee)
	if corner == nil {
		return
	}

	if corner == bee.LastCorner {
		return
	}

	// Choose a random valid direction (not the opposite of current direction)
	validDirections := make([]Direction, len(corner.Directions))
	copy(validDirections, corner.Directions)

	validDirections = slices.DeleteFunc(validDirections, func(d Direction) bool {
		return d == bee.Direction
	})

	if len(validDirections) == 0 {
		return
	}

	bee.X = corner.X
	bee.Y = corner.Y
	bee.Direction = validDirections[rand.Intn(len(validDirections))]
	bee.LastCorner = corner
}

func (h *HiveSoftware) updateBeePosition(bee *Entity) {
	validDirections := []Direction{bee.Direction}

	corner := h.findCorner(bee)
	if corner != nil {
		validDirections = corner.Directions
	}

	if slices.Contains(validDirections, bee.Direction) {
		switch bee.Direction {
		case DirectionUp:
			bee.Y -= bee.Velocity
		case DirectionDown:
			bee.Y += bee.Velocity
		case DirectionLeft:
			bee.X -= bee.Velocity
		case DirectionRight:
			bee.X += bee.Velocity
		}
	}

	// Wrap around at tunnel
	if bee.Y == float64(8*17+4) {
		if bee.X <= 0 {
			bee.X = float64(8 * 28)
		} else if bee.X >= float64(8*28) {
			bee.X = 0
		}
	}
}

func (h *HiveSoftware) resetPositions() {
	h.startFrames = FramesPerSecond * 2
	h.bear = CreateBear(h.sprites)
	h.bees = CreateBees(h.sprites)
}

func (h *HiveSoftware) resetBee(bee *Entity) {
	bee.X = 8*13 + 4
	bee.Y = 8*14 + 4
	bee.Direction = []Direction{DirectionLeft, DirectionRight}[rand.Intn(2)]
	bee.LastCorner = nil
	bee.BlueFrames = 0
	bee.FlashFrames = 0
	bee.Flash = false
}

func (h *HiveSoftware) findCorner(e *Entity) *Entity {
	for _, corner := range h.corners {
		if h.collide(e, corner) {
			return corner
		}
	}
	return nil
}

func (h *HiveSoftware) collide(e1 *Entity, e2 *Entity) bool {
	return math.Abs(e1.X-e2.X) <= DistanceThreshold && math.Abs(e1.Y-e2.Y) <= DistanceThreshold
}

func (h *HiveSoftware) collideWithDistance(e1 *Entity, e2 *Entity, distance float64) bool {
	return math.Abs(e1.X-e2.X) <= distance && math.Abs(e1.Y-e2.Y) <= distance
}

// Rendering functions

func (h *HiveSoftware) renderEntity(screen *ebiten.Image, e *Entity, buffer float64) {
	if e == nil || e.Sprite == nil {
		return
	}

	row := e.FrameDirection[e.Direction]

	// Handle blue frames for bees
	if e.BlueFrames > 0 {
		row += 2
		if e.Flash {
			row += 2
		}
	}

	// Get sprite frame
	sx := e.Width * float64(int(e.Frame))
	sy := e.Height * float64(int(row))
	sw := e.Width
	sh := e.Height

	spriteFrame := e.Sprite.SubImage(image.Rect(int(sx), int(sy), int(sx+sw), int(sy+sh))).(*ebiten.Image)

	// Draw at entity position
	opts := &ebiten.DrawImageOptions{}
	opts.GeoM.Translate(e.X-e.Width/2+buffer, e.Y-e.Height/2+buffer)
	screen.DrawImage(spriteFrame, opts)
}

func (h *HiveSoftware) renderScore(screen *ebiten.Image, buffer float64) {
	h.renderInteger(screen, h.score, 1, 1, buffer)
}

func (h *HiveSoftware) renderHighScore(screen *ebiten.Image, buffer float64) {
	highScore := int(math.Max(float64(h.score), float64(h.highScore)))
	h.renderInteger(screen, highScore, 11, 1, buffer)
}

func (h *HiveSoftware) renderLives(screen *ebiten.Image, buffer float64) {
	bearSprite := h.sprites.Bear
	if bearSprite == nil {
		return
	}

	for i := 0; i < h.lives-1; i++ {
		opts := &ebiten.DrawImageOptions{}
		opts.GeoM.Translate(float64(8*(2+i*2))+buffer, float64((8*34)+1)+buffer)

		// Get first frame of bear sprite
		sw := bearSprite.Bounds().Dx() / 4
		sh := bearSprite.Bounds().Dy() / 4
		spriteFrame := bearSprite.SubImage(image.Rect(0, 0, sw, sh)).(*ebiten.Image)

		screen.DrawImage(spriteFrame, opts)
	}
}

func (h *HiveSoftware) renderReady(screen *ebiten.Image, buffer float64) {
	readySprite := h.sprites.Ready
	if readySprite == nil {
		log.Println("ready sprite is not loaded")
		return
	}

	opts := &ebiten.DrawImageOptions{}
	opts.GeoM.Translate(float64(8*11)+buffer, float64(8*20)+buffer)
	screen.DrawImage(readySprite, opts)
}

func (h *HiveSoftware) renderInteger(screen *ebiten.Image, value int, tx int, ty int, buffer float64) {
	digitsSprite := h.sprites.Digits
	if digitsSprite == nil {
		log.Println("digits sprite is not loaded")
		return
	}

	digits := []int{
		value / 100_000,
		(value % 100_000) / 10_000,
		(value % 10_000) / 1_000,
		(value % 1_000) / 100,
		(value % 100) / 10,
		value % 10,
	}

	leadingZero := true
	for i, digit := range digits {
		if i >= len(digits)-2 {
			leadingZero = false
		}

		if digit == 0 && leadingZero {
			continue
		}

		if digit != 0 {
			leadingZero = false
		}

		// Get digit sprite
		dw := digitsSprite.Bounds().Dx() / 10
		dh := digitsSprite.Bounds().Dy()
		digitFrame := digitsSprite.SubImage(image.Rect(digit*dw, 0, (digit+1)*dw, dh)).(*ebiten.Image)

		opts := &ebiten.DrawImageOptions{}
		opts.GeoM.Translate(float64(8*(tx+i))+buffer, float64(8*ty)+buffer)
		screen.DrawImage(digitFrame, opts)
	}
}

func drawImageAt(screen *ebiten.Image, img *ebiten.Image, dx, dy float64) {
	opts := &ebiten.DrawImageOptions{}
	opts.GeoM.Translate(dx, dy)
	screen.DrawImage(img, opts)
}
