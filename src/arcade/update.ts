// Port of internal/arcade/update.go, plus the token a cabinet start costs, the
// prize counter (solid, opened with Space while facing it), and the cabinet
// screens switching on while the player faces them, and the change machine
// (solid, Space while facing it trades tickets for a token). Go's hub melody is now
// the faced cabinet's own attract loop.

import { direction, type Direction, type Input } from "../engine/input.ts";
import { attractSounds, sounds } from "../engine/assets.ts";
import { changeMachineRect, pressChangeMachine, tickNotice } from "./changeMachine.ts";
import { checkCollision, type Rect } from "./collision.ts";
import type { Entity } from "./entity.ts";
import { findMachine } from "./machine.ts";
import type { Software } from "../game/software.ts";
import { updateScreen } from "./screen.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { blocked, type State } from "./state.ts";

/** What a hub tick asks of the Game: start a cabinet's software, or open the prize counter menu. */
export type HubEvent = { start: Software; run: "paid" | "free" } | { openCounter: true } | null;

export function update(s: State, i: Input): HubEvent {
  applyInput(s, i);
  updatePlayer(s);

  const newRect: Rect = {
    x: s.player.x - s.player.width / 2,
    y: s.player.y - s.player.height / 2,
    w: s.player.width,
    h: s.player.height,
  };
  const machine = findMachine(newRect, s.machines);
  const ok = machine !== null;
  let event: HubEvent = null;

  if (ok && s.player.direction === "UP") {
    if (!s.melodyPlaying) {
      s.imageTitle = machine.title;
      s.melodyPlaying = true;
      attractSounds[machine.title].play();
      sounds.screenOn.blip();
    }
  } else if (s.melodyPlaying) {
    stopMelody(s);
    s.imageTitle = null;
  }

  if (ok && s.player.direction === "UP" && i.space) {
    // Go leaves imageTitle set here; only melodyPlaying is cleared (D11).
    stopMelody(s);

    event = {
      run: s.wallet.startRun(),
      start: machine.newSoftware(s.wallet.shownHighScore(machine.name), s.wallet.prizes),
    };
  } else if (i.space && facesCounter(s)) {
    event = { openCounter: true };
  } else if (i.space && !s.actionHeld && facing(s.player, changeMachineRect)) {
    pressChangeMachine(s);
  }
  s.actionHeld = i.space;
  tickNotice(s, facing(s.player, changeMachineRect));

  for (const m of s.machines) updateScreen(m.screen, s.melodyPlaying && s.imageTitle === m.title);
  return event;
}

/** Stop the playing cabinet's attract loop, from the top next time. */
function stopMelody(s: State): void {
  s.melodyPlaying = false;
  if (s.imageTitle === null) return;
  attractSounds[s.imageTitle].pause();
  attractSounds[s.imageTitle].rewind();
}

/** The player faces the prize desk, so the action key opens the prize counter. */
function facesCounter(s: State): boolean {
  return s.counters.some((r) => facing(s.player, r));
}

/** What the player faces that the action key works: a cabinet, by title, the prize desk or the change machine. */
export type Faced = ArcadeTitle | "prizeCounter" | "changeMachine";

/** What the LED scoreboard names (src/arcade/ticker.ts): the cabinet whose screen is on, the prize desk or the change machine; nothing while the prize counter menu is open. */
export function faced(s: State, menuOpen: boolean): Faced | null {
  if (menuOpen) return null;
  if (s.melodyPlaying) return s.imageTitle;
  if (facesCounter(s)) return "prizeCounter";
  return facing(s.player, changeMachineRect) ? "changeMachine" : null;
}

/** The player touches `r` on the side they face: their rect, 1 px further on, overlaps it. */
export function facing(p: Entity, r: Rect): boolean {
  const [x, y] = newPosition(p.x, p.y, p.direction, 1);
  return checkCollision({ x: x - p.width / 2, y: y - p.height / 2, w: p.width, h: p.height }, r);
}

function applyInput(s: State, i: Input): void {
  // `direction()` is "" exactly when not moving.
  const d = direction(i);
  if (d !== "") {
    s.player.direction = d;
    s.player.velocity = 1;
    return;
  }

  s.player.velocity = 0;
}

function updatePlayer(s: State): void {
  const [newX, newY] = newPosition(s.player.x, s.player.y, s.player.direction, s.player.velocity);

  const newRect: Rect = {
    x: newX - s.player.width / 2,
    y: newY - s.player.height / 2,
    w: s.player.width,
    h: s.player.height,
  };
  const collides = blocked(s, newRect);

  if (!collides) {
    s.player.x = newX;
    s.player.y = newY;
  }

  s.player.frame = newFrame(s.player.frame, s.player.velocity, s.player.frameIncrement, s.player.frameTotal);
}

export function newPosition(x: number, y: number, dir: Direction, velocity: number): [number, number] {
  let newX = x;
  let newY = y;

  switch (dir) {
    case "UP":
      newY -= velocity;
      break;
    case "DOWN":
      newY += velocity;
      break;
    case "LEFT":
      newX -= velocity;
      break;
    case "RIGHT":
      newX += velocity;
      break;
  }

  return [newX, newY];
}

export function newFrame(currentFrame: number, velocity: number, frameIncrement: number, frameTotal: number): number {
  if (velocity > 0) {
    const frame = currentFrame + frameIncrement;
    return frame % frameTotal; // math.Mod
  }
  return 0;
}
