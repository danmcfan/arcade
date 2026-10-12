# Arcade

A pixel-art "games within a game": the player walks around an arcade and plays the minigames inside its cabinets.

## The arcade

**Hub**:
The arcade room the player walks around between games.
_Avoid_: lobby, main room, overworld

**Player**:
The character the person controls in the hub.
_Avoid_: gamer, avatar, hero

**Cabinet**:
An arcade machine: one in the hub that the player steps up to, and the same machine's bezel framing the minigame while it is played.
_Avoid_: machine (in prose), arcade box

**Minigame**:
A game played inside a cabinet: Sweet Sam, Firefly or Brass Monkey. In code, a `Software`.
_Avoid_: level, mode, sub-game

**Sweet Sam**:
The Pac-Man-style minigame: a bear in a maze, chased by bees. Code name `hive`.
_Avoid_: hive (in player-facing text), bear game

**Firefly**:
The Galaga-style shooter: a firefly fighting off the insects and birds that try to eat it.
_Avoid_: galaxy, space shooter

**Brass Monkey**:
The Donkey Kong-style platformer: a robot monkey escaping the factory of the gnome who built it. Code name `gearhead` until it is renamed.
_Avoid_: gearhead (in player-facing text), gnome game

**Gnome**:
The Brass Monkey villain who built the monkey. It stands at the top of each floor and sends hazards down.
_Avoid_: boss, Kong

**Floor**:
One factory floor in Brass Monkey. The monkey escapes it by climbing to its exit.
_Avoid_: level, stage, board

**Hazard**:
Anything the gnome sends that costs the monkey a life when it touches the monkey: a gear or an ember.
_Avoid_: enemy, obstacle

**Gear**:
A hazard that rolls down the girders. The monkey jumps over it.
_Avoid_: barrel, cog

**Ember**:
A hazard that moves along the girders and climbs ladders.
_Avoid_: spark (a spark is the firefly's light), fireball

**Bolt**:
An item the monkey collects in Brass Monkey for points.
_Avoid_: coin, pickup

**Lab scene**:
A demo reachable only by URL (`?scene=wave`, `?scene=lumberjack`), outside the hub and not part of the game.
_Avoid_: minigame, bonus game

## Economy

**Token**:
The currency spent to start a minigame: one token per play.
_Avoid_: coin, credit

**Ticket**:
The reward the payout gives when a minigame ends.
_Avoid_: points

**Payout**:
The menu shown when a minigame ends, which turns the score into tickets.
_Avoid_: reward screen, cutscene

**Prize counter**:
The place in the hub where the player spends tickets on tokens and prizes.
_Avoid_: shop, store, token exchange, redemption

**Last-chance token**:
The token the prize counter sells for all the player's tickets, even 0, when they have no tokens and too few tickets to buy one.
_Avoid_: free token, pity token, bailout

**Prize**:
A decoration bought with tickets that shows in the hub and gives the player an ability or advantage in one minigame.
_Avoid_: power-up, upgrade, item, reward

**Free play**:
A play that costs nothing because the player has no tokens. It pays no tickets.
_Avoid_: free credit, bonus play

**Score**:
Points earned inside one minigame run. The hub keeps the high score.
_Avoid_: tickets (they are separate)

## Menus and progress

**Title screen**:
What the page opens on: the logo plus Continue and New game.
_Avoid_: main menu, start screen

**Save**:
What Continue restores: the hub high score, where the player stood, and their tokens and tickets. Minigame progress is not part of it.
_Avoid_: save file, progress, slot

**Continue**:
The title-screen choice that resumes from the save. It appears only when a save exists.
_Avoid_: load, resume (Resume is a pause-menu choice)

**New game**:
The title-screen choice that starts over. It asks for confirmation when a save would be deleted.
_Avoid_: restart, reset

**Intro**:
The how-to-play screen shown after New game, before the hub.
_Avoid_: tutorial, help

**Hub pause menu**:
The menu Esc opens in the hub: Resume, Controls, Quit to menu.
_Avoid_: pause menu (say which one), in-game menu, options

**Minigame pause menu**:
The menu Esc opens during a minigame: Resume, Controls, Quit game. Quitting a minigame pays no tickets for that run.
_Avoid_: pause menu (say which one), quit dialog

## Verification

**Tick**:
One fixed 1/60 s step of game time. All game timing is counted in ticks.
_Avoid_: frame (a frame is one draw)

**Parity fixture**:
A recorded scenario (input script, per-tick trace, golden frames) that the TypeScript game must reproduce exactly. Most were recorded from the original Go game; ones whose behaviour changed on purpose are re-recorded from the TypeScript game.
_Avoid_: snapshot test, golden test

**Golden frame**:
A reference image of one tick of a parity fixture, at logical resolution.
_Avoid_: screenshot, baseline

**Logical resolution**:
The game's own pixel grid (e.g. 192×176 for the hub) before it is scaled up to the screen.
_Avoid_: canvas size, native size

**Test hook**:
The `window.__arcade` API that `?debug` installs, so a check can pause, step, seed and read back the game.
_Avoid_: debug API, cheat mode

**Verify check**:
A browser script in `scripts/verify/` that drives the real page and produces the screenshots and video for a PR.
_Avoid_: e2e test, smoke test
