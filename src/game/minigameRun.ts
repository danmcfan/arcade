// One play of a minigame, from the token spent (or a direct start) to the
// payout: the software, the minigame pause menu (Resume / Controls / Quit
// game) and the payout, which settles the score through the Wallet. The Game
// builds one when the hub starts a cabinet, and drops it when `update` says
// the run is over.

import { sounds } from "../engine/assets.ts";
import type { Sound } from "../engine/audio.ts";
import type { Input, MenuEdges, MenuKeys } from "../engine/input.ts";
import { channels } from "../engine/sounds.generated.ts";
import type { RunKind, Wallet } from "../arcade/wallet.ts";
import { controlsIndex, minigamePauseMenu, quitGameIndex } from "./menus.ts";
import { Payout } from "./payout.ts";
import type { GameSnapshot } from "./snapshot.ts";
import type { Software } from "./software.ts";

/** The minigame Channel's sounds: paused with the minigame pause menu. */
const minigameSounds: readonly Sound[] = channels.minigame.map((name) => sounds[name]);

/** What the run shows over its software, if anything. */
type RunMenu =
  | { menu: null }
  /** `pausedSounds`: minigame sounds that were playing when it opened; Resume restarts them. */
  | { menu: "paused"; cursor: number; pausedSounds: Sound[] }
  /** Reached from CONTROLS, so the cursor stays on it. */
  | { menu: "controls"; pausedSounds: Sound[] }
  | { menu: "payout"; payout: Payout };

/** The run's part of `GameSnapshot`. */
type RunSnapshot = Pick<GameSnapshot, "run" | "menu" | "cursor" | "payout" | "sw">;

export class MinigameRun {
  readonly software: Software;
  readonly kind: RunKind;
  private readonly wallet: Wallet;
  /** The Game's menu keys: a closing menu hides the keys still held. */
  private readonly keys: MenuKeys;
  private state: RunMenu = { menu: null };

  constructor(software: Software, kind: RunKind, wallet: Wallet, keys: MenuKeys) {
    this.software = software;
    this.kind = kind;
    this.wallet = wallet;
    this.keys = keys;
  }

  get menu(): RunSnapshot["menu"] {
    return this.state.menu;
  }

  /** Selected item of the pause menu; CONTROLS in the controls, 0 otherwise. */
  get cursor(): number {
    if (this.state.menu === "paused") return this.state.cursor;
    return this.state.menu === "controls" ? controlsIndex : 0;
  }

  get payout(): Payout | null {
    return this.state.menu === "payout" ? this.state.payout : null;
  }

  /** One tick; `input` is `raw` with the hidden keys released. True when the run is over. */
  update(raw: Input, input: Input, edges: MenuEdges): boolean {
    const s = this.state;
    if (s.menu === null) return this.play(input, edges);
    if (s.menu === "paused") return this.updatePauseMenu(s, raw, edges);
    if (s.menu === "payout") return this.updatePayout(s.payout, raw, edges);
    if (edges.space || edges.escape) {
      sounds.select.blip();
      this.state = { menu: "paused", cursor: controlsIndex, pausedSounds: s.pausedSounds };
    }
    return false;
  }

  private play(input: Input, edges: MenuEdges): boolean {
    if (edges.escape) {
      sounds.select.blip();
      const pausedSounds = minigameSounds.filter((s) => s.playing);
      for (const s of minigameSounds) s.pause();
      this.state = { menu: "paused", cursor: 0, pausedSounds };
      return false;
    }

    this.software.update(input);
    if (!this.software.gameOver()) return false;
    const score = this.software.score();
    // Paid out at once, so a save taken during the count keeps them.
    const tickets = this.wallet.settleRun(score, this.kind);
    if (this.kind === "direct") return true;
    this.state = { menu: "payout", payout: new Payout(score, tickets, this.kind === "free") };
    return false;
  }

  private updatePauseMenu(s: { cursor: number; pausedSounds: Sound[] }, raw: Input, edges: MenuEdges): boolean {
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta !== 0) {
      const n = minigamePauseMenu.length;
      s.cursor = (s.cursor + delta + n) % n;
      sounds.move.blip();
    }
    if (!edges.space && !edges.escape) return false;
    sounds.select.blip();
    if (edges.escape || s.cursor === 0) {
      // Resume: the minigame carries on from this tick.
      this.state = { menu: null };
      for (const sound of s.pausedSounds) sound.play();
      this.keys.maskHeld(raw);
      return false;
    }
    if (s.cursor === quitGameIndex) {
      // Quit game: the token stays spent, no tickets, no payout.
      this.keys.maskHeld(raw);
      return true;
    }
    this.state = { menu: "controls", pausedSounds: s.pausedSounds };
    return false;
  }

  private updatePayout(payout: Payout, raw: Input, edges: MenuEdges): boolean {
    if (edges.space) sounds.select.blip();
    if (payout.step(edges.space)) sounds.ticket.blip();
    if (!payout.done) return false;
    this.keys.maskHeld(raw);
    return true;
  }

  snapshot(): RunSnapshot {
    return {
      run: this.kind,
      menu: this.menu,
      cursor: this.cursor,
      payout: this.payout === null ? null : this.payout.snapshot(),
      sw: this.software.snapshot(),
    };
  }
}
