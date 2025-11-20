package hive

import (
	"arcade/internal/assets"
	"arcade/internal/input"
	"fmt"
	"image/color"
	"math"
	"math/rand"
	"slices"
)

const (
	distanceThreshold = 0.5
	startTicks        = framesPerSecond * 2
)

type mode int

const (
	modeScatter mode = iota
	modeChase
)

var modeSequence = []modeConfig{
	{mode: modeScatter, ticks: framesPerSecond * 7},
	{mode: modeChase, ticks: framesPerSecond * 20},
	{mode: modeScatter, ticks: framesPerSecond * 7},
	{mode: modeChase, ticks: framesPerSecond * 20},
	{mode: modeScatter, ticks: framesPerSecond * 5},
	{mode: modeChase, ticks: framesPerSecond * 20},
	{mode: modeScatter, ticks: framesPerSecond * 5},
	{mode: modeChase, ticks: -1},
}

type modeConfig struct {
	mode  mode
	ticks int
}

func (s *HiveSoftware) Update(i input.Input) error {
	if s.startTicks > 0 {
		s.startTicks--
		return nil
	}

	if s.pauseTicks > 0 {
		s.pauseTicks--
		return nil
	}

	if s.modeTicks == 0 {
		modeConfig := modeSequence[s.modeIndex]
		s.modeCurrent = modeConfig.mode
		s.modeTicks = modeConfig.ticks
		s.modeIndex++
		for _, e := range s.enemies {
			e.reverseDirection = true
			e.reverseTile = pointToTile(e.X, e.Y)
		}
	}

	if s.modeTicks > 0 {
		s.modeTicks--
	}

	if winner(s) {
		s.items = newItems()
		restart(s)

		assets.SoundStart.Rewind()
		assets.SoundStart.Play()

		return nil
	}

	s.player.Velocity = velocityPlayerNormal
	for _, e := range s.enemies {
		e.Velocity = velocityEnemyNormal
		if e.BlueFrames > 0 {
			s.player.Velocity = velocityPlayerPower
			e.Velocity = velocityEnemyPower
		}

		if e.Y == 8*17+4 && (e.X < tileSize*4.5 || e.X > tileSize*(tileWidth-4.5)) {
			e.Velocity = velocityEnemyTunnel
		}
	}

	applyInput(s, i)

	for _, e := range s.enemies {
		updateBlue(e)

		target := findTarget(e, s.enemies, s.player, s.modeCurrent)
		updateDirection(e, s.corners, target)

		if !collideWithDistance(e, s.player, 1.0) {
			continue
		}

		if e.BlueFrames > 0 {
			assets.SoundPower.Rewind()
			assets.SoundPower.Play()

			s.pauseTicks = framesPerSecond * 1
			s.score += 200
			resetEnemy(e)
			continue
		}

		assets.SoundDeath.Rewind()
		assets.SoundDeath.Play()

		s.lives--
		if s.lives <= 0 {
			return nil
		}
		restart(s)
	}

	for _, e := range s.movingEntities() {
		updateFrame(e)
		updatePosition(e, s.corners)
	}

	for i, item := range s.items {
		if item == nil {
			continue
		}

		if !collideWithDistance(item, s.player, distanceThreshold) {
			continue
		}

		if item.IsPellet() {
			s.score += 10
		}

		if item.IsPower() {
			s.score += 50

			for _, e := range s.enemies {
				e.reverseDirection = true
				e.reverseTile = pointToTile(e.X, e.Y)

				e.BlueFrames = blueFramesDuration
				e.FlashFrames = 0
				e.Flash = false
			}
		}

		for _, e := range s.enemies {
			if e.dotMinimum > 0 {
				e.dotMinimum--
			}
		}

		s.items[i] = nil
		break
	}

	return nil
}

func start(s *HiveSoftware) {
	s.lives = 3
	s.score = 0
	s.player = NewPlayer()
	s.enemies = newEnemies()
	s.items = newItems()
	s.startTicks = startTicks

	assets.SoundStart.Rewind()
	assets.SoundStart.Play()
}

func winner(s *HiveSoftware) bool {
	for _, item := range s.items {
		if item != nil {
			return false
		}
	}
	return true
}

func applyInput(s *HiveSoftware, i input.Input) {
	newDirection := i.Direction()
	corner := findCorner(s.player, s.corners)
	if corner == nil {
		validDirections := []input.Direction{}
		switch s.player.Direction.Axis() {
		case input.AxisVertical:
			validDirections = []input.Direction{input.DirectionUp, input.DirectionDown}
		case input.AxisHorizontal:
			validDirections = []input.Direction{input.DirectionLeft, input.DirectionRight}
		}

		if !slices.Contains(validDirections, newDirection) {
			return
		}

		s.player.Direction = newDirection
		return
	}

	if !slices.Contains(corner.Directions, newDirection) {
		return
	}

	if s.player.Direction.Axis() != newDirection.Axis() {
		s.player.X = corner.X
		s.player.Y = corner.Y
	}

	s.player.Direction = newDirection
}

func updateFrame(e *Entity) {
	if e.Velocity > 0 {
		e.Frame += e.FrameIncrement
		e.Frame = math.Mod(e.Frame, e.FrameTotal)
	} else {
		e.Frame = 0
	}
}

func updateBlue(e *Entity) {
	if e.BlueFrames > 0 {
		e.BlueFrames--
		if e.BlueFrames <= framesPerSecond*2 {
			if e.FlashFrames != 0 {
				e.FlashFrames--
			} else {
				e.Flash = !e.Flash
				e.FlashFrames = 5
			}
		}
	} else {
		e.FlashFrames = 0
		e.Flash = false
	}
}

func updatePosition(e *Entity, cs []*Entity) {
	if e.dotMinimum > 0 {
		return
	}

	if e.home {
		if e.X < tileSize*14 {
			e.X += velocityEnemyTunnel
			return
		}

		if e.X > tileSize*14 {
			e.X -= velocityEnemyTunnel
			return
		}

		if e.Y > tileSize*14.5 {
			e.Y -= velocityEnemyTunnel
			return
		}

		e.home = false
	}

	validDirections := []input.Direction{e.Direction}

	corner := findCorner(e, cs)
	if corner != nil {
		validDirections = corner.Directions
	}

	if slices.Contains(validDirections, e.Direction) {
		switch e.Direction {
		case input.DirectionUp:
			e.Y -= e.Velocity
		case input.DirectionDown:
			e.Y += e.Velocity
		case input.DirectionLeft:
			e.X -= e.Velocity
		case input.DirectionRight:
			e.X += e.Velocity
		}
	}

	if e.Y == float64(8*17+4) {
		if e.X <= 0 {
			e.X = float64(8 * 28)
		} else if e.X >= float64(8*28) {
			e.X = 0
		}
	}
}

func updateDirection(e *Entity, cs []*Entity, target tile) {
	tileCurrent := pointToTile(e.X, e.Y)
	if e.reverseDirection && tileCurrent != e.reverseTile {
		e.reverseDirection = false
		e.Direction = e.Direction.Opposite()
		return
	}

	corner := findCorner(e, cs)
	if corner == nil {
		return
	}

	tileCorner := pointToTile(corner.X, corner.Y)

	validDirections := make([]input.Direction, len(corner.Directions))
	copy(validDirections, corner.Directions)

	validDirections = slices.DeleteFunc(validDirections, func(d input.Direction) bool {
		return d == e.Direction.Opposite()
	})

	if len(validDirections) == 0 {
		panic(fmt.Sprintf("no valid directions for enemy at (%v, %v)", e.X, e.Y))
	}

	if e.BlueFrames > 0 {
		e.Direction = validDirections[rand.Intn(len(validDirections))]
		e.X = corner.X
		e.Y = corner.Y
		return
	}

	distances := make(map[input.Direction]float64)

	minDistance := math.MaxFloat64
	for _, direction := range validDirections {
		tileNext := tileCorner
		switch direction {
		case input.DirectionUp:
			tileNext.y--
		case input.DirectionDown:
			tileNext.y++
		case input.DirectionLeft:
			tileNext.x--
		case input.DirectionRight:
			tileNext.x++
		}

		distance := distance(tileNext, target)
		if distance < minDistance {
			minDistance = distance
		}
		distances[direction] = distance
	}

	minDirections := make([]input.Direction, 0)
	for direction, distance := range distances {
		if distance == minDistance {
			minDirections = append(minDirections, direction)
		}
	}

	switch {
	case slices.Contains(minDirections, input.DirectionUp):
		e.Direction = input.DirectionUp
	case slices.Contains(minDirections, input.DirectionLeft):
		e.Direction = input.DirectionLeft
	case slices.Contains(minDirections, input.DirectionDown):
		e.Direction = input.DirectionDown
	case slices.Contains(minDirections, input.DirectionRight):
		e.Direction = input.DirectionRight
	}

	e.X = corner.X
	e.Y = corner.Y
}

func restart(s *HiveSoftware) {
	s.startTicks = startTicks
	s.player = NewPlayer()
	s.enemies = newEnemies()

	s.modeIndex = 0
	s.modeTicks = 0
}

func resetEnemy(e *Entity) {
	e.X = tileSize * 14
	e.Y = tileSize * 17.5
	e.Direction = []input.Direction{input.DirectionLeft, input.DirectionRight}[rand.Intn(2)]
	e.BlueFrames = 0
	e.FlashFrames = 0
	e.Flash = false
	e.home = true
	e.dotMinimum = 0
}

func findCorner(e *Entity, cs []*Entity) *Entity {
	for _, c := range cs {
		if collideWithDistance(c, e, distanceThreshold) {
			return c
		}
	}
	return nil
}

func collideWithDistance(a *Entity, b *Entity, distance float64) bool {
	return math.Abs(a.X-b.X) <= distance && math.Abs(a.Y-b.Y) <= distance
}

func findTarget(e *Entity, enemies []*Entity, player *Entity, mode mode) tile {
	if mode == modeScatter {
		return e.target
	}

	tilePlayer := pointToTile(player.X, player.Y)

	switch e.color {
	case colorRed:
		return tilePlayer
	case colorPink:
		switch player.Direction {
		case input.DirectionUp:
			tilePlayer.y -= 4
		case input.DirectionDown:
			tilePlayer.y += 4
		case input.DirectionLeft:
			tilePlayer.x -= 4
		case input.DirectionRight:
			tilePlayer.x += 4
		}
		return tilePlayer
	case colorTeal:
		enemyRed := getEnemy(enemies, colorRed)
		tileRed := pointToTile(enemyRed.X, enemyRed.Y)

		switch player.Direction {
		case input.DirectionUp:
			tilePlayer.y -= 2
		case input.DirectionDown:
			tilePlayer.y += 2
		case input.DirectionLeft:
			tilePlayer.x -= 2
		case input.DirectionRight:
			tilePlayer.x += 2
		}

		dx := tilePlayer.x - tileRed.x
		dy := tilePlayer.y - tileRed.y

		tilePlayer.x += dx
		tilePlayer.y += dy

		return tilePlayer
	case colorOrange:
		distance := distance(pointToTile(e.X, e.Y), tilePlayer)
		if distance < 8 {
			return e.target
		}
		return tilePlayer
	}

	panic(fmt.Sprintf("unknown color: %v", e.color))
}

func getEnemy(e []*Entity, color color.Color) *Entity {
	for _, enemy := range e {
		if enemy.color == color {
			return enemy
		}
	}
	return nil
}
