// Port of internal/lumberjack/game.go. The Go package globals (`player`,
// `trees`) are fields of a `Lumberjack` instance, so every scene starts fresh.

import type { Input } from "../../engine/input.ts";
import * as rng from "../../engine/rng.ts";
import type { Surface } from "../../engine/surface.ts";
import type { Scene } from "../../game/software.ts";
import type { LumberjackSnapshot } from "../../game/snapshot.ts";
import { height, scale, tileHeight, tileWidth, width } from "./constants.ts";
import { overlaps, resolve } from "./hitbox.ts";
import { Player, type LumberjackInput } from "./player.ts";
import { Spritesheet, mustFrame } from "./sprite.ts";
import { Tree } from "./tree.ts";

const grassSpritesheet = new Spritesheet("Tiles/Grass/Grass_1_Middle.png", tileWidth, tileHeight);

export class Lumberjack implements Scene {
  readonly name = "lumberjack";

  player = new Player();
  // Go untyped constants: width/4 = 128, width*3/4 = 384, height/4 = 72.
  trees: Tree[] = [new Tree(width / 4, height / 4), new Tree((width * 3) / 4, height / 4)];

  /** Completed `step()` calls (snapshot `tick`). */
  private tick = 0;

  /** Go `Game.Update`, with the keys already read into `i`. */
  step(i: Input): void {
    const input: LumberjackInput = {
      up: i.up,
      down: i.down,
      left: i.left,
      right: i.right,
      space: i.space,
    };
    const player = this.player;
    player.update(input, this.trees);

    for (const tree of this.trees) {
      // Damage lands on every tick of frameX == 2 while overlapping (8 ticks,
      // 80 per swing), re-triggering the shake each tick. Health is not
      // clamped and a tree at <= 0 still collides (D11).
      if (overlaps(player.actionHitbox(), tree.hitbox()) && player.acting && player.frameX === 2) {
        chop(tree, player);
      }

      tree.update();
      const withinX = tree.positionX - 20 < player.positionX && tree.positionX + 20 > player.positionX;

      const above = player.positionY < tree.positionY + 16;
      const withinY = tree.positionY - 32 < player.positionY && above;

      tree.behind = above;
      tree.transparent = withinX && withinY;
    }

    this.tick++;
  }

  draw(screen: Surface): void {
    // move to background specific function, grid specific function
    for (let x = 0; x < width; x += tileWidth) {
      for (let y = 0; y < height; y += tileHeight) {
        const grassFrame = mustFrame(grassSpritesheet, 0, 0);
        // Translate(x, y) then Scale(scale, scale).
        screen.draw(grassFrame, x * scale, y * scale);
      }
    }

    // move to z-index drawing that takes all entities and determines draw order
    for (const tree of this.trees) {
      if (!tree.behind) {
        tree.draw(screen);
      }
    }
    this.player.draw(screen);
    for (const tree of this.trees) {
      if (tree.behind) {
        tree.draw(screen);
      }
    }
  }

  layout(): [number, number] {
    return [width * scale, height * scale];
  }

  snapshot(): LumberjackSnapshot {
    const p = this.player;
    return {
      tick: this.tick,
      rng: rng.state(),
      player: {
        x: p.positionX,
        y: p.positionY,
        dir: p.direction,
        frameX: p.frameX,
        frameY: p.frameY,
        frameCounter: p.frameCounter,
        moving: p.moving,
        acting: p.acting,
      },
      trees: this.trees.map((t) => ({
        x: t.positionX,
        y: t.positionY,
        theta: t.theta,
        thetaInc: t.thetaIncreasing,
        shaking: t.shaking,
        shakeRight: t.shakeRight,
        behind: t.behind,
        transparent: t.transparent,
        health: t.health,
      })),
    };
  }
}

/** Go `NewGame()`. */
export function newGame(): Lumberjack {
  return new Lumberjack();
}

/** One tick of an overlapping swing: shake and damage `tree` once per overlapping axis. */
function chop(tree: Tree, player: Player): void {
  const [overlapX, overlapY] = resolve(player.actionHitbox(), tree.hitbox());
  if (overlapX < 0) {
    tree.shake(true);
    tree.health -= 10;
  } else if (overlapX > 0) {
    tree.shake(false);
    tree.health -= 10;
  }

  if (overlapY < 0) {
    tree.shake(true);
    tree.health -= 10;
  } else if (overlapY > 0) {
    tree.shake(false);
    tree.health -= 10;
  }
}
