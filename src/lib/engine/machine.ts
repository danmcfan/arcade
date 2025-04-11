import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { Sprite } from "@/lib/engine/sprite";
import type { Hitbox } from "@/lib/engine/hitbox";
import { intersects } from "@/lib/engine/hitbox";

export type Machine = {
  frame: number;
  timeDelta: number;
  sprite: Sprite;
  x: number;
  y: number;
  name: string;
  hitbox: Hitbox;
  isActive: boolean;
};

export function createMachine(
  name: string,
  x: number,
  y: number,
  sprite: Sprite,
  hitbox: Hitbox
): Machine {
  return {
    frame: 0,
    timeDelta: 0,
    sprite,
    x,
    y,
    name,
    hitbox,
    isActive: false,
  };
}

export function updateMachines(state: RefObject<State | null>) {
  if (!state.current) return;

  const { player, machines, timeDelta } = state.current;
  if (!player) return;

  for (const machine of machines) {
    const doesIntersect = intersects(player.hitbox, machine.hitbox);
    if (doesIntersect && player.direction === "up") {
      machine.isActive = true;
    } else {
      machine.isActive = false;
    }

    if (machine.isActive) {
      machine.timeDelta += timeDelta;
      if (machine.timeDelta > 100) {
        machine.frame += 1;
        machine.frame = machine.frame >= 9 ? 1 : machine.frame;
        machine.sprite.x = machine.frame * machine.sprite.width;
        machine.timeDelta = 0;
      }
    } else {
      machine.frame = 0;
      machine.sprite.x = 0;
      machine.timeDelta = 0;
    }

    if (
      (state.current.keysDown.has("Space") ||
        state.current.keysDown.has("Enter") ||
        state.current.keysDown.has("KeyE")) &&
      machine.isActive
    ) {
      state.current.activeGame = machine.name;
      if (state.current.transitions.length === 0) {
        state.current.transitions.push({
          type: "fadeOut",
          time: 0,
          duration: 1000,
        });
      }
    }
  }
}

export function drawMachines(state: State) {
  const { ctx, machines, scale } = state;
  if (!ctx) return;

  ctx.save();

  for (const machine of machines) {
    ctx.drawImage(
      machine.sprite.image,
      machine.sprite.x,
      machine.sprite.y,
      machine.sprite.width,
      machine.sprite.height,
      Math.floor(machine.x * state.scale),
      Math.floor(machine.y * state.scale),
      Math.floor(machine.sprite.width * state.scale),
      Math.floor(machine.sprite.height * state.scale)
    );
  }

  ctx.restore();

  if (state.debug) {
    ctx.save();

    for (const machine of state.machines) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.25)";
      ctx.fillRect(
        Math.floor(machine.hitbox.x * scale),
        Math.floor(machine.hitbox.y * scale),
        Math.floor(machine.hitbox.width * scale),
        Math.floor(machine.hitbox.height * scale)
      );
    }

    ctx.restore();
  }
}
