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
An arcade machine: one in the hub that the player steps up to, and the same machine's thin outline (its bezel) framing the minigame's screen while it is played.
_Avoid_: machine (in prose), arcade box

**Attract loop**:
The few bars of its game a cabinet plays, quietly and on repeat, while the player faces it and its screen is on. In code, `attractSounds`; the hub's state still calls it `melodyPlaying`, after the Go melody it replaced.
_Avoid_: melody (in prose), jingle

**Hub song**:
The music that loops, quietly, the whole time the player is in the hub, prize counter menu included; it pauses during a minigame.
_Avoid_: hub melody, background music

**Minigame**:
A game played inside a cabinet: Sweet Sam, Firefly or Brass Monkey. In code, a `Software`; each is described once, cabinet and all, by its `Minigame` entry in `minigames` (`src/game/minigames.ts`).
_Avoid_: level, mode, sub-game

**Channel**:
Which group a sound belongs to, declared with it in `defineSound`: `minigame` sounds stop when the minigame pause menu opens and resume when it closes; `arcade` sounds (menu blips, the hub song, attract loops) do not.
_Avoid_: bus, mixer group

**Image output**:
One PNG an art generator declares with `imageOutput`: its file, its hard-coded size and how to draw it. `bun run art` writes every image output, and the image table from those under `src/assets/images`.
_Avoid_: art file, sprite file

**Sweet Sam**:
The Pac-Man-style minigame: a bear in a maze, chased by bees. Code name `sweetSam` (`src/sweet-sam/`).
_Avoid_: bear game

**Level**:
One maze in Sweet Sam, played until the bear has eaten every honey drop. The next level is the same maze, harder.
_Avoid_: round, stage, board

**Honey drop**:
One of the small dots along the Sweet Sam maze. The bear eats them all to clear the level.
_Avoid_: pellet, dot, food

**Honey pot**:
One of the four large items in the corners of the Sweet Sam maze. Eating one makes every bee sleepy for a while.
_Avoid_: power pellet, energizer, power-up, smoke pot

**Sleepy bee**:
A bee after the bear eats a honey pot: slow, harmless, and worth points if the bear eats it. The Sleepy bees prize keeps them sleepy longer.
_Avoid_: scared bee, blue bee, frightened

**Bonus flower**:
An item that appears in the Sweet Sam maze twice per level for a short time, worth points if the bear eats it.
_Avoid_: fruit, bonus item, pickup

**Firefly**:
The Galaga-style shooter: a firefly fighting off the insects and birds that try to eat it.
_Avoid_: galaxy, space shooter

**Stage**:
One group of Firefly enemies that flies in and attacks. The next stage starts when the player kills them all, and each stage is harder.
_Avoid_: wave, level, round

**Spark**:
The light the firefly shoots at enemies.
_Avoid_: bullet, laser, shot (for the firefly's)

**Moth**:
The basic Firefly enemy. One hit kills it.
_Avoid_: bug, bee, grunt

**Wasp**:
The Firefly enemy that dives at the firefly most often. One hit kills it.
_Avoid_: butterfly, diver

**Owl**:
The large Firefly enemy, a bird that swoops down to eat the firefly. Two hits kill it.
_Avoid_: boss, bird (when the Owl is meant)

**Brass Monkey**:
The Donkey Kong-style platformer: a robot monkey escaping the factory of the gnome who built it. Code name `brassMonkey` (`src/brass-monkey/`).
_Avoid_: gnome game

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

## Economy

**Wallet**:
What the player has: their tokens, tickets and owned prizes, and the player's high score on each machine. It holds every rule that changes them: what a cabinet start costs, what a run pays, and what the prize counter sells. The save and the scoreboard's counts come from it. In code, `Wallet` (`src/arcade/wallet.ts`).
_Avoid_: purse, bank, inventory, account

**Token**:
The currency spent to start a minigame: one token per play, taken from the wallet.
_Avoid_: coin, credit

**Ticket**:
The reward the payout gives when a minigame ends: one per 100 points, at least one. The wallet settles them when the run ends, and the payout counts them up.
_Avoid_: points

**Payout**:
The menu shown when a minigame ends, which turns the score into tickets.
_Avoid_: reward screen, cutscene

**Prize counter**:
The place in the hub where the player spends tickets on prizes: the prize desk across the bottom of the room, with its employee, and the menu it opens. What it offers, and at what price, comes from the wallet.
_Avoid_: shop, store, token exchange, redemption

**Employee**:
The arcade worker behind the prize counter who serves the player.
_Avoid_: counter worker, clerk, shopkeeper

**Scoreboard**:
The LED board on the hub's wall that shows the player's tokens and tickets, and the faced cabinet's name.
_Avoid_: HUD, status bar

**Last-chance token**:
The token the change machine sells for all the player's tickets, even 0, when they have no tokens and too few tickets to buy one. It is a wallet rule.
_Avoid_: free token, pity token, bailout

**Change machine**:
A machine in the hub, near the prize desk, that exchanges tickets for tokens: one token each time the player uses it. It has no menu.
_Avoid_: token machine, ticket exchange

**Prize**:
A decoration bought with tickets that shows in the hub and gives the player an ability or advantage in one minigame.
_Avoid_: power-up, upgrade, item, reward

**Free play**:
A play that costs nothing because the player's wallet has no tokens. It pays no tickets, but can still set the player's high score.
_Avoid_: free credit, bonus play

**House high score**:
A machine's fixed high score, set by the arcade, that the player must beat.
_Avoid_: target score, par

**Beaten**:
A machine is beaten when the player's high score on it is above its house high score. Facing its cabinet, the scoreboard then shows its HI and a gold star, and its HI shows the player's score instead of the house's.
_Avoid_: cleared, conquered

**Arcade win**:
The moment the player has beaten every machine's house high score. It happens once per save, and leaves the cake and the trophy in the hub.
_Avoid_: victory, game complete, ending

**Score**:
Points earned inside one minigame run. The wallet keeps the player's high score for each machine.
_Avoid_: tickets (they are separate)

## Menus and progress

**Title screen**:
What the page opens on: the logo plus Continue and New game.
_Avoid_: main menu, start screen

**Save**:
What Continue restores: the wallet (the player's high score on each machine, the player's tokens and tickets, the prizes they own, and whether the player has had the arcade win) and where the player stood. Minigame progress is not part of it.
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
