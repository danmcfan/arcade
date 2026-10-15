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
import { Menu } from "./menu.ts";
import { minigamePauseItems } from "./menus.ts";
import { Payout } from "./payout.ts";
import type { GameSnapshot } from "./snapshot.ts";
import type { Software } from "./software.ts";

/** The minigame Channel's sounds: paused with the minigame pause menu. */
const minigameSounds: readonly Sound[] = channels.minigame.map((name) => sounds[name]);

/** What the run shows over its software, if anything. */
type RunMenu =
  | { menu: null }
  /** `pausedSounds`: minigame sounds that were playing when it opened; Resume restarts them. */
  | { menu: "paused"; pausedSounds: Sound[] }
  /** Reached from CONTROLS, so the pause menu's cursor stays on it. */
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
  /** The pause menu (Resume / Controls / Quit game); its cursor stays put while the controls are open. */
  readonly pauseMenu = new Menu(
    () =>
      minigamePauseItems({
        resume: () => {
          this.resume();
        },
        controls: () => {
          if (this.state.menu === "paused") this.state = { menu: "controls", pausedSounds: this.state.pausedSounds };
        },
        quit: () => {
          // Quit game: the token stays spent, no tickets, no payout.
          this.quit = true;
          this.keys.maskHeld();
        },
      }),
    () => {
      this.resume();
    },
  );
  /** Set by Quit game: the next `update` return ends the run. */
  private quit = false;

  constructor(software: Software, kind: RunKind, wallet: Wallet, keys: MenuKeys) {
    this.software = software;
    this.kind = kind;
    this.wallet = wallet;
    this.keys = keys;
  }

  get menu(): RunSnapshot["menu"] {
    return this.state.menu;
  }

  /** Selected item of the pause menu while it or the controls are open, 0 otherwise. */
  get cursor(): number {
    return this.state.menu === "paused" || this.state.menu === "controls" ? this.pauseMenu.cursor : 0;
  }

  get payout(): Payout | null {
    return this.state.menu === "payout" ? this.state.payout : null;
  }

  /** One tick; `input` is `raw` with the hidden keys released. True when the run is over. */
  update(raw: Input, input: Input, edges: MenuEdges): boolean {
    const s = this.state;
    if (s.menu === null) return this.play(input, edges);
    if (s.menu === "paused") {
      this.pauseMenu.step(edges);
      return this.quit;
    }
    if (s.menu === "payout") return this.updatePayout(s.payout, raw, edges);
    if (edges.escape) {
      sounds.select.blip();
      this.state = { menu: "paused", pausedSounds: s.pausedSounds };
    }
    return false;
  }

  private play(input: Input, edges: MenuEdges): boolean {
    if (edges.escape) {
      sounds.select.blip();
      const pausedSounds = minigameSounds.filter((s) => s.playing);
      for (const s of minigameSounds) s.pause();
      this.state = { menu: "paused", pausedSounds };
      this.pauseMenu.open();
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

  /** Resume: the minigame carries on from this tick. */
  private resume(): void {
    if (this.state.menu !== "paused") return;
    for (const sound of this.state.pausedSounds) sound.play();
    this.state = { menu: null };
    this.keys.maskHeld();
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
