package hive

import (
	"fmt"

	"github.com/danmcfan/arcade/internal/assets"
	"github.com/danmcfan/arcade/internal/input"
)

// StateID uniquely identifies each game state.
type StateID string

const (
	StateIDStart          StateID = "START"
	StateIDPlay           StateID = "PLAY"
	StateIDPause          StateID = "PAUSE"
	StateIDDeathWait      StateID = "DEATHWAIT"
	StateIDFinalDeathWait StateID = "FINALDEATHWAIT"
	StateIDGameOver       StateID = "GAMEOVER"
)

// PlayerRespawnBlinkToggleFrames is how many START-state frames each visible or hidden slice lasts
// during respawn blink. Lower = faster blink; tune this single value to change the effect.
const PlayerRespawnBlinkToggleFrames = 15

func respawnBlinkHiddenForElapsed(elapsedFrames int) bool {
	return (elapsedFrames/PlayerRespawnBlinkToggleFrames)%2 == 0
}

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

// CurrentID reports the active state identifier (needed e.g. to defer host GameOver until a death sequence finishes).
func (sm *StateMachine) CurrentID() StateID {
	return sm.currentID
}

// Update is called by your main game loop.
func (sm *StateMachine) Update(i input.Input) {
	if sm.currentState == nil {
		return
	}
	nextID := sm.currentState.Update(i)
	if nextID != sm.currentID {
		sm.ChangeState(nextID)
	}
}

// StartState is active when a new round starts.
type StartState struct {
	s *HiveSoftware

	// respawnBlinkRemaining counts down START frames while the player blink-in plays.
	respawnBlinkRemaining int
}

func (st *StartState) OnEnter() {
	st.s.startTicks = startTicks
	st.respawnBlinkRemaining = startTicks

	if st.s.player != nil {
		st.s.player.Hidden = respawnBlinkHiddenForElapsed(0)
	}

	assets.SoundStart.Rewind()
	assets.SoundStart.Play()
}

func (st *StartState) Update(i input.Input) StateID {
	if st.s.startTicks > 0 {
		if st.respawnBlinkRemaining > 0 && st.s.player != nil {
			elapsed := startTicks - st.respawnBlinkRemaining
			st.s.player.Hidden = respawnBlinkHiddenForElapsed(elapsed)
			st.respawnBlinkRemaining--
		} else if st.s.player != nil {
			st.s.player.Hidden = false
		}
		st.s.startTicks--
		return StateIDStart
	}
	if st.s.player != nil {
		st.s.player.Hidden = false
	}
	return StateIDPlay
}

func (st *StartState) OnExit() {
	// After READY / intro countdown, face left for normal play (START shows the bear facing down).
	if st.s.player != nil {
		st.s.player.Direction = input.DirectionLeft
	}
}

// PlayState is active during normal gameplay.
type PlayState struct {
	s *HiveSoftware
}

func (st *PlayState) OnEnter() {
	if st.s.player != nil {
		st.s.player.Hidden = false
	}
}

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

			awardIdx := st.s.scaredEatAwardNext
			if awardIdx >= bonusEatFrameCount {
				awardIdx = bonusEatFrameCount - 1
			}
			st.s.score += scaredBeeEatPoints[awardIdx]
			st.s.spawnBonusEatIndicator(e.X, e.Y, awardIdx)
			nextAward := awardIdx + 1
			if nextAward >= bonusEatFrameCount {
				nextAward = bonusEatFrameCount - 1
			}
			st.s.scaredEatAwardNext = nextAward
			resetEnemy(e)
			return StateIDPause
		}

		assets.SoundDeath.Rewind()
		assets.SoundDeath.Play()

		st.s.particles.SpawnBurst(st.s.player.X, st.s.player.Y, particleColorRed, particleBurstPlayerEatenCount)

		st.s.lives--
		if st.s.lives <= 0 {
			st.s.player.Hidden = true
			return StateIDFinalDeathWait
		}
		st.s.player.Hidden = true
		return StateIDDeathWait
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

	resetScaredEatAwardIfNobodyScared(st.s)

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

// DeathWaitState holds the maze as-is after a death so the round does not restart immediately.
type DeathWaitState struct {
	s *HiveSoftware
}

func (st *DeathWaitState) OnEnter() {
	st.s.pauseTicks = deathRoundDelayTicks
}

func (st *DeathWaitState) Update(i input.Input) StateID {
	if st.s.pauseTicks > 0 {
		st.s.pauseTicks--
		return StateIDDeathWait
	}
	st.s.restartRound()
	return StateIDStart
}

func (st *DeathWaitState) OnExit() {}

// FinalDeathWaitState: same beat as DeathWait — hidden player, particles/sound already fired in Play — then game over for the host.
type FinalDeathWaitState struct {
	s *HiveSoftware
}

func (st *FinalDeathWaitState) OnEnter() {
	st.s.pauseTicks = deathRoundDelayTicks
	if st.s.player != nil {
		st.s.player.Hidden = true
	}
}

func (st *FinalDeathWaitState) Update(i input.Input) StateID {
	if st.s.pauseTicks > 0 {
		st.s.pauseTicks--
		return StateIDFinalDeathWait
	}
	return StateIDGameOver
}

func (st *FinalDeathWaitState) OnExit() {}

// GameOverState is active when the player runs out of lives.
type GameOverState struct {
	s *HiveSoftware
}

func (st *GameOverState) OnEnter() {}

func (st *GameOverState) Update(i input.Input) StateID {
	return StateIDGameOver
}

func (st *GameOverState) OnExit() {}
