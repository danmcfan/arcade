package hive

import (
	"fmt"

	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/input"
)

// StateID uniquely identifies each game state.
type StateID string

const (
	StateIDStart    StateID = "START"
	StateIDPlay     StateID = "PLAY"
	StateIDPause    StateID = "PAUSE"
	StateIDGameOver StateID = "GAMEOVER"
)

// State defines the interface that all game states must implement.
type State interface {
	// OnEnter is the "start trigger" called when entering the state.
	OnEnter()

	// Update runs every frame. It returns the ID of the next state
	// if an end condition is met, or the current state's ID to stay in it.
	Update(i input.Input) StateID

	// OnExit handles cleanup when moving out of this state.
	OnExit()
}

// StateMachine manages the current state and handles transitions.
type StateMachine struct {
	states       map[StateID]State
	currentState State
	currentID    StateID
}

func NewStateMachine() *StateMachine {
	return &StateMachine{
		states: make(map[StateID]State),
	}
}

func (sm *StateMachine) RegisterState(id StateID, state State) {
	sm.states[id] = state
}

// ChangeState forces a transition, triggering exit and enter behaviors.
func (sm *StateMachine) ChangeState(nextID StateID) {
	if sm.currentState != nil {
		sm.currentState.OnExit()
	}
	nextState, exists := sm.states[nextID]
	if !exists {
		panic(fmt.Sprintf("State %s not registered", nextID))
	}
	sm.currentID = nextID
	sm.currentState = nextState
	sm.currentState.OnEnter() // Trigger the start behavior
}

// Update is called by your main game loop.
func (sm *StateMachine) Update(i input.Input) {
	if sm.currentState == nil {
		return
	}
	// 1. Run the state logic and check for the "end condition"
	nextID := sm.currentState.Update(i)
	// 2. If the state says it's time to move on, transition
	if nextID != sm.currentID {
		sm.ChangeState(nextID)
	}
}

// StartState is active when a new round starts.
type StartState struct {
	s *HiveSoftware
}

func (st *StartState) OnEnter() {
	st.s.startTicks = startTicks
	assets.SoundStart.Rewind()
	assets.SoundStart.Play()
}

func (st *StartState) Update(i input.Input) StateID {
	if st.s.startTicks > 0 {
		st.s.startTicks--
		return StateIDStart
	}
	return StateIDPlay
}

func (st *StartState) OnExit() {}

// PlayState is active during normal gameplay.
type PlayState struct {
	s *HiveSoftware
}

func (st *PlayState) OnEnter() {}

func (st *PlayState) Update(i input.Input) StateID {
	if st.s.modeTicks == 0 {
		modeConfig := modeSequence[st.s.modeIndex]
		st.s.modeCurrent = modeConfig.mode
		st.s.modeTicks = modeConfig.ticks
		st.s.modeIndex++
		for _, e := range st.s.enemies {
			e.reverseDirection = true
			e.reverseTile = pointToTile(e.X, e.Y)
		}
	}

	if st.s.modeTicks > 0 {
		st.s.modeTicks--
	}

	if winner(st.s) {
		st.s.items = newItems()
		st.s.restartRound()
		return StateIDStart
	}

	st.s.player.Velocity = velocityPlayerNormal
	for _, e := range st.s.enemies {
		e.Velocity = velocityEnemyNormal
		if e.BlueFrames > 0 {
			st.s.player.Velocity = velocityPlayerPower
			e.Velocity = velocityEnemyPower
		}

		if e.Y == 8*17+4 && (e.X < tileSize*4.5 || e.X > tileSize*(tileWidth-4.5)) {
			e.Velocity = velocityEnemyTunnel
		}
	}

	applyInput(st.s, i)

	for _, e := range st.s.enemies {
		updateBlue(e)

		target := findTarget(e, st.s.enemies, st.s.player, st.s.modeCurrent)
		updateDirection(e, st.s.corners, target)

		if !collideWithDistance(e, st.s.player, 1.0) {
			continue
		}

		if e.BlueFrames > 0 {
			assets.SoundPower.Rewind()
			assets.SoundPower.Play()

			st.s.camera.RequestScreenShake(CameraShakeEnemyEatTicks, CameraShakeEnemyEatIntensity)
			st.s.particles.SpawnBurst(e.X, e.Y, particleColorTeal, particleBurstBeeEatenCount)

			st.s.score += 200
			resetEnemy(e)
			return StateIDPause
		}

		assets.SoundDeath.Rewind()
		assets.SoundDeath.Play()

		st.s.particles.SpawnBurst(st.s.player.X, st.s.player.Y, particleColorRed, particleBurstPlayerEatenCount)

		st.s.lives--
		if st.s.lives <= 0 {
			return StateIDGameOver
		}
		st.s.restartRound()
		return StateIDStart
	}

	for _, e := range st.s.movingEntities() {
		updateFrame(e)
		updatePosition(e, st.s.corners)
	}

	for idx, item := range st.s.items {
		if item == nil {
			continue
		}

		if !collideWithDistance(item, st.s.player, distanceThreshold) {
			continue
		}

		if item.IsPellet() {
			st.s.score += 10
		}

		if item.IsPower() {
			st.s.score += 50

			st.s.camera.RequestScreenShake(CameraShakePowerPelletTicks, CameraShakePowerPelletIntensity)

			for _, e := range st.s.enemies {
				if e.home {
					continue
				}

				e.reverseDirection = true
				e.reverseTile = pointToTile(e.X, e.Y)

				e.BlueFrames = blueFramesDuration
				e.FlashFrames = 0
				e.Flash = false
			}
		}

		for _, e := range st.s.enemies {
			if e.dotMinimum > 0 {
				e.dotMinimum--
			}
		}

		st.s.items[idx] = nil
		break
	}

	return StateIDPlay
}

func (st *PlayState) OnExit() {}

// PauseState is active during a short pause (e.g., when an enemy is eaten).
type PauseState struct {
	s *HiveSoftware
}

func (st *PauseState) OnEnter() {
	st.s.pauseTicks = framesPerSecond * 1
}

func (st *PauseState) Update(i input.Input) StateID {
	if st.s.pauseTicks > 0 {
		st.s.pauseTicks--
		return StateIDPause
	}
	return StateIDPlay
}

func (st *PauseState) OnExit() {}

// GameOverState is active when the player runs out of lives.
type GameOverState struct {
	s *HiveSoftware
}

func (st *GameOverState) OnEnter() {}

func (st *GameOverState) Update(i input.Input) StateID {
	return StateIDGameOver
}

func (st *GameOverState) OnExit() {}
