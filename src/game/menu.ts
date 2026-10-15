// A Menu: a list of items, each carrying its label, whether it can be chosen
// right now and what choosing it does, plus the cursor over them. It owns the
// cursor wrap and the menu sounds (move, select, deny), so every menu (title,
// New game check, hub pause, minigame pause, prize counter) moves and sounds
// the same. Drawing stays in src/ui/menu.ts; a Menu hands it labels, the
// cursor and the greyed-out items.

import { sounds } from "../engine/assets.ts";
import type { MenuEdges } from "../engine/input.ts";

export interface MenuItem {
  label: string;
  /** Drawn on the right, e.g. a price; prize counter only. */
  value?: string;
  /** Drawn beside the label, e.g. NO TICKETS beside QUIT GAME. */
  note?: string;
  /** False when it can't be chosen right now: drawn grey, Space plays the deny sound. */
  enabled: boolean;
  choose: () => void;
}

/** What one `step` did: moved the cursor, chose an item, refused a disabled one, backed out, or nothing. */
export type MenuStep = "moved" | "chosen" | "denied" | "back" | null;

export class Menu {
  cursor = 0;
  readonly items: () => readonly MenuItem[];
  private readonly back: (() => void) | undefined;

  /**
   * `items` is called each step and draw, so labels and enabled states follow
   * the game (a save appearing, the Wallet changing). `back` is what Esc does;
   * without it Esc is ignored.
   */
  constructor(items: () => readonly MenuItem[], back?: () => void) {
    this.items = items;
    this.back = back;
  }

  /** Put the cursor back on the first item, as when the menu opens. */
  open(): void {
    this.cursor = 0;
  }

  step(edges: MenuEdges): MenuStep {
    const items = this.items();
    let result: MenuStep = null;
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta !== 0) {
      this.cursor = (this.cursor + delta + items.length) % items.length;
      sounds.move.blip();
      result = "moved";
    }
    if (edges.escape && this.back) {
      sounds.select.blip();
      this.back();
      return "back";
    }
    if (!edges.space) return result;
    const item = items[this.cursor];
    if (item === undefined) throw new Error(`menu: no item at ${this.cursor}`);
    if (!item.enabled) {
      sounds.deny.blip();
      return "denied";
    }
    sounds.select.blip();
    item.choose();
    return "chosen";
  }

  labels(): string[] {
    return this.items().map((i) => i.label);
  }
}
