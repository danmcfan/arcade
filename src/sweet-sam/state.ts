// Port of the Go Sweet Sam minigame's state.go (docs/port-notes.md gives its old Go name).

import { dropEaten, elroyStep, noDropEaten } from "./release.ts";
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
import { inTunnel, isSleepy, newItems, pointToTile, tileEq, type Entity, type Tile } from "./entity.ts";
import {
  applyInput,
  becomeEyes,
  deathRoundDelayTicks,
  findTarget,
  moveEyes,
  restartAfterDeath,
  restartRound,
  startTicks,
  updateBlue,
  updateDirection,
  updateFrame,
  moveEntity,
  winner,
} from "./update.ts";
import { itemsEaten, updateFlower } from "./flower.ts";
import type { SweetSamSoftware } from "./software.ts";
import { intermissionAfter } from "./intermission.ts";

export type StateID = SweetSamStateId;

export const stateIDStart: StateID = "START";
export const stateIDPlay: StateID = "PLAY";
export const stateIDPause: StateID = "PAUSE";
export const stateIDDeathWait: StateID = "DEATHWAIT";
export const stateIDFinalDeathWait: StateID = "FINALDEATHWAIT";
export const stateIDGameOver: StateID = "GAMEOVER";
export const stateIDLevelClear: StateID = "LEVELCLEAR";
export const stateIDIntermission: StateID = "INTERMISSION";

/** Ticks everything stops while the maze flashes after a level is cleared. */
export const levelClearTicks = framesPerSecond * 2;
/** Ticks the maze shows each colour while it flashes. */
export const levelClearFlashTicks = 12;

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
    const sleepy = s.enemies.some(isSleepy);
    if (!sleepy && s.modeTicks === 0) {
      const modes = s.values().modeSequence;
      const modeConfig = modes[s.modeIndex];
      if (modeConfig === undefined) {
        // Go: index out of range panic. Unreachable: the last mode never ends (ticks -1).
        throw new Error(`runtime error: index out of range [${s.modeIndex}] with length ${modes.length}`);
      }
      s.modeCurrent = modeConfig.mode;
      s.modeTicks = modeConfig.ticks;
      const change = s.modeIndex > 0;
      s.modeIndex++;
      // A home bee does not reverse; after a real change it leaves RIGHT (Dossier, "Home Sweet Home").
      for (const e of s.awakeBees()) {
        if (e.home) {
          e.leaveRight ||= change;
        } else {
          e.reverseDirection = true;
          e.reverseTile = pointToTile(e.x, e.y);
        }
      }
    }

    if (!sleepy && s.modeTicks > 0) {
      s.modeTicks--;
    }

    if (winner(s)) {
      return stateIDLevelClear;
    }

    const values = s.values();
    const bearVelocity = values.bearVelocity * s.advantages.playerSpeedFactor;
    s.player.velocity = bearVelocity;
    const elroy = elroyStep(s.release, values, s.items.filter((it) => it !== null).length);
    for (const e of s.enemies) {
      e.velocity = e.kind === "red" && !e.home && elroy !== null ? elroy.velocity : values.beeVelocity;
      if (isSleepy(e)) {
        // Running shoes never slow the bear down.
        s.player.velocity = Math.max(values.bearSleepyVelocity, bearVelocity);
        e.velocity = values.sleepyBeeVelocity;
      }

      if (inTunnel(e)) {
        e.velocity = values.tunnelVelocity;
      }
    }

    applyInput(s, i);

    // Each bee's target this tick, for the junctions it reaches between sub-steps.
    const targets = new Map<Entity, Tile>();
    for (const e of s.enemies) {
      updateBlue(e, values.flashes);
      // Eyes steer themselves home (update.ts `moveEyes`) and cannot hurt or be eaten.
      if (e.eyes) {
        continue;
      }

      const target = findTarget(e, s.enemies, s.player, s.modeCurrent, elroy !== null);
      targets.set(e, target);
      updateDirection(e, s.corners, target);

      // A bee catches the bear in the same tile, so the two can swap tiles and pass through
      // (Dossier, "Just Passing Through").
      if (!tileEq(pointToTile(e.x, e.y), pointToTile(s.player.x, s.player.y))) {
        continue;
      }

      // D11: both branches return immediately; later bees skip updateBlue /
      // updateDirection, nothing moves, nothing is eaten, no award reset.
      if (isSleepy(e)) {
        playSound(sounds.sweetBee);

        s.camera.requestScreenShake(cameraShakeEnemyEatTicks, cameraShakeEnemyEatIntensity);
        s.particles.spawnBurst(e.x, e.y, particleColorCyan, particleBurstBeeEatenCount);

        let awardIdx = s.scaredEatAwardNext;
        if (awardIdx >= bonusEatFrameCount) {
          awardIdx = bonusEatFrameCount - 1;
        }
        s.addScore(scaredBeeEatPoints[awardIdx] ?? 0);
        spawnBonusEatIndicator(s, e.x, e.y, awardIdx);
        let nextAward = awardIdx + 1;
        if (nextAward >= bonusEatFrameCount) {
          nextAward = bonusEatFrameCount - 1;
        }
        s.scaredEatAwardNext = nextAward;
        becomeEyes(e);
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

    // The bear stands still while it swallows; the bees keep moving.
    const bearPaused = s.eatPauseTicks > 0;
    if (bearPaused) s.eatPauseTicks--;
    for (const e of s.movingEntities()) {
      if (bearPaused && e === s.player) continue;
      updateFrame(e);
      if (e.eyes) {
        moveEyes(e, s.corners);
      } else {
        // The bear has no target: it turns only on input (applyInput).
        moveEntity(e, s.corners, targets.get(e));
      }
    }

    // At most one item is eaten per tick.
    let ate = false;
    for (let idx = 0; idx < s.items.length; idx++) {
      const item = s.items[idx];
      if (item === null || item === undefined) {
        continue;
      }

      // Pac-Man eats a dot on entering its tile, so a cornering bear still clears the junction's.
      if (!tileEq(pointToTile(item.x, item.y), pointToTile(s.player.x, s.player.y))) {
        continue;
      }

      s.items[idx] = null;

      if (item.isPellet()) {
        s.addScore(10);
        s.eatPauseTicks = 1;
        // The chomp alternates its two notes, one per honey drop.
        playSound(itemsEaten(s) % 2 === 1 ? sounds.sweetChompHigh : sounds.sweetChompLow);
      }

      if (item.isPower()) {
        s.addScore(50);
        s.eatPauseTicks = 3;
        playSound(sounds.sweetSmoke);
        // A new honey pot starts the sleepy bee award over at 200.
        s.scaredEatAwardNext = 0;

        s.camera.requestScreenShake(cameraShakePowerPelletTicks, cameraShakePowerPelletIntensity);

        const sleepyFrames = Math.round(s.values().sleepyFrames * s.advantages.sleepyFactor);

        // Every bee turns sleepy, home ones too, but not eyes; only maze bees turn around.
        for (const e of s.awakeBees()) {
          if (!e.home) {
            e.reverseDirection = true;
            e.reverseTile = pointToTile(e.x, e.y);
          }

          e.blueFrames = sleepyFrames;
          e.flashFrames = 0;
          e.flash = false;
        }
      }

      dropEaten(s.release, s.enemies);
      ate = true;
      break;
    }
    if (!ate) {
      noDropEaten(s.release, s.enemies, s.values());
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
    restartAfterDeath(this.s);
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
    return intermissionAfter(s.level - 1) === null ? stateIDStart : stateIDIntermission;
  }

  onExit(): void {}
}

/**
 * A cutscene between two levels (#160), after levels 2, 5 and 9 as in
 * Pac-Man. The next level is already set up; the scene plays over a black
 * screen with its music, and the action key skips it.
 */
export class IntermissionState implements State {
  private readonly s: SweetSamSoftware;

  constructor(s: SweetSamSoftware) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = this.s.intermission()?.ticks ?? 0;
    playSound(sounds.sweetStart);
  }

  update(i: Input): StateID {
    if (i.space || this.s.pauseTicks <= 0) {
      return stateIDStart;
    }
    this.s.pauseTicks--;
    return stateIDIntermission;
  }

  onExit(): void {
    this.s.pauseTicks = 0;
  }
}

/** Active when the player runs out of lives. */
export class GameOverState implements State {
  onEnter(): void {}

  update(_i: Input): StateID {
    return stateIDGameOver;
  }

  onExit(): void {}
}
