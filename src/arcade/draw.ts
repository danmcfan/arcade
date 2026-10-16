// Port of internal/arcade/draw.go, plus the cabinet screens switching on, the
// prize desk's employee, the decorations of the prizes the player owns and
// the LED scoreboard. Everything is drawn inside the hub image (the 160x144
// Game Boy frame, #72); Go's title card is now the scoreboard's text.

import { imageArcade, imageScreens } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawChangeMachine } from "./changeMachine.ts";
import { drawDebugOverlay } from "./debug.ts";
import { drawEmployee } from "./employee.ts";
import { prize } from "./prizes.ts";
import { drawTicker } from "./ticker.ts";
import { screenFrame } from "./screen.ts";
import { powerCabinetX, powerFrameHeight, powerFrameWidth } from "../ui/hubArt.ts";
import type { State } from "./state.ts";
import type { Faced } from "./update.ts";

/** Draw the hub; the scoreboard names `named` (see `faced`), or shows the counts when null. */
export function draw(
  screen: Surface,
  s: State,
  tick: number,
  buffer: number,
  debugMode: boolean,
  named: Faced | null,
): void {
  drawImage(screen, imageArcade, buffer, buffer);
  // A screen's frame covers its cabinet and the carpet its light falls on.
  s.machines.forEach((m, row) => {
    const frame = screenFrame(m.screen);
    if (frame === null) return;
    const img = cutImage(
      imageScreens,
      frame * powerFrameWidth,
      row * powerFrameHeight,
      powerFrameWidth,
      powerFrameHeight,
    );
    drawImage(screen, img, m.rect.x - powerCabinetX + buffer, m.rect.y + buffer);
  });
  drawChangeMachine(screen, buffer);
  // The desk is in the room image; the employee stands in it, out of the player's reach.
  drawEmployee(screen, buffer);
  // Decorations are not solid: the player walks in front of them.
  for (const id of s.wallet.prizes) {
    const p = prize(id);
    drawImage(screen, p.sprite, p.x + buffer, p.y + buffer);
  }

  const player = s.player;
  const row = player.frameDirection[player.direction];
  const playerImageFrame = cutImage(
    player.image,
    Math.trunc(player.frame) * player.width,
    row * player.height,
    player.width,
    player.height,
  );
  drawImage(screen, playerImageFrame, player.x + buffer - player.width / 2, player.y + buffer - player.height / 2);

  const machine = s.machines.find((m) => m.title === named);
  const beatenHi = machine === undefined ? null : s.wallet.beatenHighScore(machine.name);
  const notice = s.notice?.kind ?? null;
  drawTicker(
    screen,
    { tokens: s.wallet.tokens, tickets: s.wallet.tickets, faced: named, beatenHi, notice },
    tick,
    buffer,
  );

  if (debugMode) {
    drawDebugOverlay(screen, s, buffer);
  }
}

/** Go `img.SubImage(image.Rect(int(x), int(y), int(x+w), int(y+h)))`. */
export function cutImage(img: Sprite, x: number, y: number, w: number, h: number): Sprite {
  return sub(img, Math.trunc(x), Math.trunc(y), Math.trunc(x + w), Math.trunc(y + h));
}

function drawImage(screen: Surface, img: Sprite, x: number, y: number): void {
  screen.draw(img, x, y);
}
