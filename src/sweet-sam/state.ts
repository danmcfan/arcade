// Port of the Go Sweet Sam minigame's state.go (docs/port-notes.md gives its old Go name).

import type { Input } from "../engine/input.ts";
import { sounds } from "../engine/assets.ts";
import { playSound } from "../engine/audio.ts";
import type { SweetSamStateId } from "../game/snapshot.ts";
import { framesPerSecond } from "./constants.ts";
import {
  cameraShakeEnemyEatIntensity,
  cameraShakeEnemyEatTicks,
  cameraShakePowerPelletIntensity,
  cameraShakePowerPelletTicks,
} from "./camera.ts";
import {
  particleBurstBeeEatenCount,
  particleBurstPlayerEatenCount,
  particleColorRed,
  particleColorCyan,
} from "./particle.ts";
import {
  bonusEatFrameCount,
  resetScaredEatAwardIfNobodyScared,
  scaredBeeEatPoints,
  spawnBonusEatIndicator,
} from "./bonusEat.ts";
import {
  newItems,
  pointToTile,
  tunnelLeftX,
  tunnelRightX,
  tunnelRowY,
  velocityEnemyPower,
  velocityEnemyTunnel,
  velocityPlayerPower,
} from "./entity.ts";
import {
  applyInput,
  collideWithDistance,
  deathRoundDelayTicks,
  distanceThreshold,
  findTarget,
  resetEnemy,
  restartRound,
  startTicks,
  updateBlue,
  updateDirection,
  updateFrame,
  updatePosition,
  winner,
} from "./update.ts";
import { itemsEaten, updateFlower } from "./flower.ts";
import type { SweetSamSoftware } from "./software.ts";

export type StateID = SweetSamStateId;

export const stateIDStart: StateID = "START";
export const stateIDPlay: StateID = "PLAY";
export const stateIDPause: StateID = "PAUSE";
export const stateIDDeathWait: StateID = "DEATHWAIT";
export const stateIDFinalDeathWait: StateID = "FINALDEATHWAIT";
export const stateIDGameOver: StateID = "GAMEOVER";
export const stateIDLevelClear: StateID = "LEVELCLEAR";

/** Ticks everything stops while the maze flashes after a level is cleared. */
export const levelClearTicks = framesPerSecond * 2;
/** Ticks the maze shows each colour while it flashes. */
export const levelClearFlashTicks = 12;
/** START ticks "LEVEL n" shows before READY on every level after the first. */
export const levelBannerTicks = framesPerSecond;

/**
 * How many START-state frames each visible or hidden slice lasts during
 * respawn blink. Lower = faster blink.
 */
export const playerRespawnBlinkToggleFrames = 15;

export function respawnBlinkHiddenForElapsed(elapsedFrames: number): boolean {
  return Math.trunc(elapsedFrames / playerRespawnBlinkToggleFrames) % 2 === 0;
}

/** Every game state implements this. */
export interface State {
  /** The "start trigger" called when entering the state. */
  onEnter(): void;
  /** Runs every frame; returns the next state's ID, or the current one to stay. */
  update(i: Input): StateID;
  /** Cleanup when moving out of this state. */
  onExit(): void;
}

/** Manages the current state and handles transitions. */
export class StateMachine {
  private readonly states = new Map<StateID, State>();
  private currentState: State | null = null;
  private currentID: StateID | "" = "";

  registerState(id: StateID, state: State): void {
    this.states.set(id, state);
  }

  /** Forces a transition, triggering exit and enter behaviors. */
  changeState(nextID: StateID): void {
    if (this.currentState !== null) {
      this.currentState.onExit();
    }
    const nextState = this.states.get(nextID);
    if (nextState === undefined) {
      throw new Error(`State ${nextID} not registered`);
    }
    this.currentID = nextID;
    this.currentState = nextState;
    this.currentState.onEnter(); // Trigger the start behavior
  }

  /** The active state identifier ("" before the first `changeState`, like Go's zero value). */
  currentId(): StateID | "" {
    return this.currentID;
  }

  update(i: Input): void {
    if (this.currentState === null) {
      return;
    }
    const nextID = this.currentState.update(i);
    if (nextID !== this.currentID) {
      this.changeState(nextID);
    }
  }
}

/** Active when a new round starts. */
export class StartState implements State {
  /** Counts down START frames while the player blink-in plays. */
  respawnBlinkRemaining = 0;

  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.startTicks = startTicks;
    this.respawnBlinkRemaining = startTicks;

    this.s.player.hidden = respawnBlinkHiddenForElapsed(0);

    playSound(sounds.sweetStart);
  }

  update(_i: Input): StateID {
    if (this.s.levelBannerTicks > 0) {
      this.s.levelBannerTicks--;
      return stateIDStart;
    }
    if (this.s.startTicks > 0) {
      if (this.respawnBlinkRemaining > 0) {
        const elapsed = startTicks - this.respawnBlinkRemaining;
        this.s.player.hidden = respawnBlinkHiddenForElapsed(elapsed);
        this.respawnBlinkRemaining--;
      } else {
        this.s.player.hidden = false;
      }
      this.s.startTicks--;
      return stateIDStart;
    }
    this.s.player.hidden = false;
    return stateIDPlay;
  }

  onExit(): void {
    // After READY / intro countdown, face left for normal play (START shows the bear facing down).
    this.s.player.direction = "LEFT";
  }
}

/** Active during normal gameplay. */
export class PlayState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.player.hidden = false;
  }

  update(i: Input): StateID {
    const s = this.s;
    // Sleepy time pauses the scatter/chase timer (Pac-Man Dossier).
    const sleepy = s.enemies.some((e) => e.blueFrames > 0);
    if (!sleepy && s.modeTicks === 0) {
      const modes = s.values().modeSequence;
      const modeConfig = modes[s.modeIndex];
      if (modeConfig === undefined) {
        // Go: index out of range panic. Unreachable: the last mode never ends (ticks -1).
        throw new Error(`runtime error: index out of range [${s.modeIndex}] with length ${modes.length}`);
      }
      s.modeCurrent = modeConfig.mode;
      s.modeTicks = modeConfig.ticks;
      s.modeIndex++;
      for (const e of s.enemies) {
        e.reverseDirection = true;
        e.reverseTile = pointToTile(e.x, e.y);
      }
    }

    if (!sleepy && s.modeTicks > 0) {
      s.modeTicks--;
    }

    if (winner(s)) {
      return stateIDLevelClear;
    }

    s.player.velocity = s.advantages.playerVelocity;
    const { beeVelocity } = s.values();
    for (const e of s.enemies) {
      e.velocity = beeVelocity;
      if (e.blueFrames > 0) {
        s.player.velocity = velocityPlayerPower;
        e.velocity = velocityEnemyPower;
      }

      if (e.y === tunnelRowY && (e.x < tunnelLeftX || e.x > tunnelRightX)) {
        e.velocity = velocityEnemyTunnel;
      }
    }

    applyInput(s, i);

    for (const e of s.enemies) {
      updateBlue(e);

      const target = findTarget(e, s.enemies, s.player, s.modeCurrent);
      updateDirection(e, s.corners, target);

      if (!collideWithDistance(e, s.player, 1.0)) {
        continue;
      }

      // D11: both branches return immediately; later bees skip updateBlue /
      // updateDirection, nothing moves, nothing is eaten, no award reset.
      if (e.blueFrames > 0) {
        playSound(sounds.sweetBee);

        s.camera.requestScreenShake(cameraShakeEnemyEatTicks, cameraShakeEnemyEatIntensity);
        s.particles.spawnBurst(e.x, e.y, particleColorCyan, particleBurstBeeEatenCount);

        let awardIdx = s.scaredEatAwardNext;
        if (awardIdx >= bonusEatFrameCount) {
          awardIdx = bonusEatFrameCount - 1;
        }
        s.scoreValue += scaredBeeEatPoints[awardIdx] ?? 0;
        spawnBonusEatIndicator(s, e.x, e.y, awardIdx);
        let nextAward = awardIdx + 1;
        if (nextAward >= bonusEatFrameCount) {
          nextAward = bonusEatFrameCount - 1;
        }
        s.scaredEatAwardNext = nextAward;
        resetEnemy(e);
        return stateIDPause;
      }

      playSound(sounds.sweetDeath);

      s.particles.spawnBurst(s.player.x, s.player.y, particleColorRed, particleBurstPlayerEatenCount);

      s.lives--;
      if (s.lives <= 0) {
        s.player.hidden = true;
        return stateIDFinalDeathWait;
      }
      s.player.hidden = true;
      return stateIDDeathWait;
    }

    for (const e of s.movingEntities()) {
      updateFrame(e);
      updatePosition(e, s.corners);
    }

    // At most one item is eaten per tick.
    for (let idx = 0; idx < s.items.length; idx++) {
      const item = s.items[idx];
      if (item === null || item === undefined) {
        continue;
      }

      if (!collideWithDistance(item, s.player, distanceThreshold)) {
        continue;
      }

      s.items[idx] = null;

      if (item.isPellet()) {
        s.scoreValue += 10;
        // The chomp alternates its two notes, one per honey drop.
        playSound(itemsEaten(s) % 2 === 1 ? sounds.sweetChompHigh : sounds.sweetChompLow);
      }

      if (item.isPower()) {
        s.scoreValue += 50;
        playSound(sounds.sweetSmoke);

        s.camera.requestScreenShake(cameraShakePowerPelletTicks, cameraShakePowerPelletIntensity);

        const sleepyFrames = Math.round(s.values().sleepyFrames * s.advantages.sleepyFactor);

        for (const e of s.enemies) {
          if (e.home) {
            continue;
          }

          e.reverseDirection = true;
          e.reverseTile = pointToTile(e.x, e.y);

          e.blueFrames = sleepyFrames;
          e.flashFrames = 0;
          e.flash = false;
        }
      }

      for (const e of s.enemies) {
        if (e.dotMinimum > 0) {
          e.dotMinimum--;
        }
      }

      break;
    }

    updateFlower(s);

    resetScaredEatAwardIfNobodyScared(s);

    return stateIDPlay;
  }

  onExit(): void {}
}

/** Active during a short pause (e.g., when an enemy is eaten). */
export class PauseState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = framesPerSecond * 1;
  }

  update(_i: Input): StateID {
    if (this.s.pauseTicks > 0) {
      this.s.pauseTicks--;
      return stateIDPause;
    }
    return stateIDPlay;
  }

  onExit(): void {}
}

/** Holds the maze as-is after a death so the round does not restart immediately. */
export class DeathWaitState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = deathRoundDelayTicks;
  }

  update(_i: Input): StateID {
    if (this.s.pauseTicks > 0) {
      this.s.pauseTicks--;
      return stateIDDeathWait;
    }
    restartRound(this.s);
    return stateIDStart;
  }

  onExit(): void {}
}

/**
 * Same beat as DeathWait — hidden player, particles/sound already fired in
 * Play — then game over for the host.
 */
export class FinalDeathWaitState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = deathRoundDelayTicks;
    this.s.player.hidden = true;
  }

  update(_i: Input): StateID {
    if (this.s.pauseTicks > 0) {
      this.s.pauseTicks--;
      return stateIDFinalDeathWait;
    }
    return stateIDGameOver;
  }

  onExit(): void {}
}

/**
 * After the last honey drop: everything stops while the maze flashes, then
 * the next level starts with the maze refilled and everyone back home.
 */
export class LevelClearState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = levelClearTicks;
    playSound(sounds.sweetClear);
  }

  update(_i: Input): StateID {
    const s = this.s;
    if (s.pauseTicks > 0) {
      s.pauseTicks--;
      return stateIDLevelClear;
    }
    s.level++;
    s.items = newItems();
    s.flowersShown = 0;
    restartRound(s);
    s.levelBannerTicks = levelBannerTicks;
    return stateIDStart;
  }

  onExit(): void {}
}

/** Active when the player runs out of lives. */
export class GameOverState implements State {
  onEnter(): void {}

  update(_i: Input): StateID {
    return stateIDGameOver;
  }

  onExit(): void {}
}
