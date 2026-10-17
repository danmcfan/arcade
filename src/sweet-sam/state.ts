// Port of the Go Sweet Sam minigame's state.go (docs/port-notes.md gives its old Go name).

import { dropEaten, elroyStep, noDropEaten } from "./release.ts";
import type { Input } from "../engine/input.ts";
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
  isSleepy,
  newItems,
  pointToTile,
  tileEq,
  tunnelLeftX,
  tunnelRightX,
  tunnelRowY,
  velocityEnemyPower,
  velocityEnemyTunnel,
  velocityPlayerPower,
} from "./entity.ts";
import {
  applyInput,
  becomeEyes,
  deathFrameAt,
  deathRoundDelayTicks,
  findTarget,
  moveEyes,
  restartAfterDeath,
  restartRound,
  startTicks,
  updateBlue,
  updateDirection,
  updateFrame,
  updatePosition,
  winner,
} from "./update.ts";
import { itemsEaten, updateFlower } from "./flower.ts";
import type { Board } from "./board.ts";
import { intermissionAfter, intermissionPoses, type IntermissionPose, type IntermissionScene } from "./intermission.ts";

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

  private readonly s: Board;

  constructor(s: Board) {
    this.s = s;
  }

  onEnter(): void {
    this.s.startTicks = startTicks;
    this.respawnBlinkRemaining = startTicks;

    this.s.player.hidden = respawnBlinkHiddenForElapsed(0);

    this.s.sound("sweetStart");
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
  private readonly s: Board;

  constructor(s: Board) {
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

    s.player.velocity = s.advantages.playerVelocity;
    const { beeVelocity } = s.values();
    const elroy = elroyStep(s.release, s.values(), s.items.filter((it) => it !== null).length);
    for (const e of s.enemies) {
      e.velocity = e.kind === "red" && !e.home && elroy !== null ? elroy.velocity : beeVelocity;
      if (isSleepy(e)) {
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
      // Eyes steer themselves home (update.ts `moveEyes`) and cannot hurt or be eaten.
      if (e.eyes) {
        continue;
      }

      const target = findTarget(e, s.enemies, s.player, s.modeCurrent, elroy !== null);
      updateDirection(e, s.corners, target);

      // A bee catches the bear in the same tile, so the two can swap tiles and pass through
      // (Dossier, "Just Passing Through").
      if (!tileEq(pointToTile(e.x, e.y), pointToTile(s.player.x, s.player.y))) {
        continue;
      }

      // D11: both branches return immediately; later bees skip updateBlue /
      // updateDirection, nothing moves, nothing is eaten, no award reset.
      if (isSleepy(e)) {
        s.sound("sweetBee");

        s.emit({ kind: "shake", ticks: cameraShakeEnemyEatTicks, intensity: cameraShakeEnemyEatIntensity });
        s.emit({ kind: "burst", x: e.x, y: e.y, color: particleColorCyan, count: particleBurstBeeEatenCount });

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

      s.sound("sweetDeath");

      s.emit({
        kind: "burst",
        x: s.player.x,
        y: s.player.y,
        color: particleColorRed,
        count: particleBurstPlayerEatenCount,
      });

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
        updatePosition(e, s.corners);
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
        s.sound(itemsEaten(s) % 2 === 1 ? "sweetChompHigh" : "sweetChompLow");
      }

      if (item.isPower()) {
        s.addScore(50);
        s.eatPauseTicks = 3;
        s.sound("sweetSmoke");
        // A new honey pot starts the sleepy bee award over at 200.
        s.scaredEatAwardNext = 0;

        s.emit({ kind: "shake", ticks: cameraShakePowerPelletTicks, intensity: cameraShakePowerPelletIntensity });

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
  private readonly s: Board;

  constructor(s: Board) {
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
  private readonly s: Board;

  constructor(s: Board) {
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

  /** The bear's death frame (0 dazed … 3 puddle) at this tick of the wait. */
  deathFrame(): number {
    return deathFrameAt(deathRoundDelayTicks - this.s.pauseTicks);
  }
}

/**
 * Same beat as DeathWait — hidden player, particles/sound already fired in
 * Play — then game over for the host.
 */
export class FinalDeathWaitState implements State {
  private readonly s: Board;

  constructor(s: Board) {
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

  /** The bear's death frame (0 dazed … 3 puddle) at this tick of the wait. */
  deathFrame(): number {
    return deathFrameAt(deathRoundDelayTicks - this.s.pauseTicks);
  }
}

/**
 * After the last honey drop: everything stops while the maze flashes, then
 * the next level starts with the maze refilled and everyone back home.
 */
export class LevelClearState implements State {
  private readonly s: Board;

  constructor(s: Board) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = levelClearTicks;
    this.s.sound("sweetClear");
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
    return intermissionAfter(s.level - 1) === null ? stateIDStart : stateIDIntermission;
  }

  /** The maze shows its flash colours this tick. */
  flash(): boolean {
    return Math.trunc((levelClearTicks - this.s.pauseTicks) / levelClearFlashTicks) % 2 === 1;
  }

  onExit(): void {}
}

/**
 * A cutscene between two levels (#160), after levels 2, 5 and 9 as in
 * Pac-Man. The next level is already set up; the scene plays over a black
 * screen with its music, and the action key skips it.
 */
export class IntermissionState implements State {
  private readonly s: Board;

  constructor(s: Board) {
    this.s = s;
  }

  onEnter(): void {
    this.s.pauseTicks = intermissionAfter(this.s.level - 1)?.ticks ?? 0;
    this.s.sound("sweetStart");
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

  /** The cutscene playing (after the level before this one). */
  scene(): IntermissionScene | null {
    return intermissionAfter(this.s.level - 1);
  }

  /** The cutscene's actors at this tick. */
  poses(): IntermissionPose[] | null {
    const scene = this.scene();
    return scene === null ? null : intermissionPoses(scene, scene.ticks - this.s.pauseTicks);
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
