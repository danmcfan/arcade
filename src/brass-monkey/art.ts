// Pixel-art source for Brass Monkey's characters (ADR 0006): the monkey and
// the Gnome. Every frame is its fill in rows of Sweetie 16 letters (`sweetie`
// in src/ui/sweetie16.ts, `.` is blank), with a blank border where
// scripts/gen-brass-monkey-art.ts draws the 1 px black outline. It writes
// them to src/assets/images/brass-monkey/ (`bun run art`), and
// gen-brass-monkey-art.test.ts fails when the committed PNGs drift from this
// file. Picked in the #38 playground (branch prototype/38-brass-monkey-art).

/**
 * The monkey: a polished brass robot chimp seen from the side, facing right,
 * with a cyan eye, a steel grille for a mouth and a steel neck joint. 16×16,
 * the game's hitbox. The walk is stand, step, stand, other step (sheet
 * columns 0, 1, 0, 2); the steps bob 1 px down.
 */
export const monkeyWalk: readonly (readonly string[])[] = [
  [
    "................",
    "......oooo......",
    ".....oywoooo....",
    "...royyoyyyo....",
    "..ryrooyycky....",
    "..rlrooyycky....",
    "...rrooyyyyyy...",
    ".....ooyymlmy...",
    "......ooyyyy....",
    ".......mmm......",
    "..o...oywyo.....",
    ".o.o.oowyyoor...",
    ".o..oooyyyoor...",
    "..oo.oooooorr...",
    ".....rr..rr.....",
    "................",
  ],
  [
    "................",
    "................",
    "......oooo......",
    ".....oywoooo....",
    "...royyoyyyo....",
    "..ryrooyycky....",
    "..rlrooyycky....",
    "...rrooyyyyyy...",
    ".....ooyymlmy...",
    "......ooyyyy....",
    ".......mmm......",
    "..o...oywyo.....",
    ".o.o.rowyyyor...",
    ".o..orooyyyo....",
    "....rr....rr....",
    "................",
  ],
  [
    "................",
    "................",
    "......oooo......",
    ".....oywoooo....",
    "...royyoyyyo....",
    "..ryrooyycky....",
    "..rlrooyycky....",
    "...rrooyyyyyy...",
    ".....ooyymlmy...",
    "......ooyyyy....",
    ".......mmm......",
    "..o...oywyo.....",
    ".o.o.oowyyrr....",
    ".o..oooyyyor....",
    "......rrrr......",
    "................",
  ],
];

/** The monkey jumping: arm up and reaching forward, legs apart. Not used until #39. */
export const monkeyJump: readonly string[] = [
  "................",
  "......oooo......",
  ".....oywoooo....",
  "...royyoyyyo....",
  "..ryrooyycky....",
  "..rlrooyycky....",
  "...rrooyyyyyy...",
  ".....ooyymlmy...",
  "......ooyyyy....",
  ".......mmm......",
  "..o...oywyo.rr..",
  ".o.o.oowyyorr...",
  ".o..oooyyyoo....",
  "..oo.ooooooo....",
  "....rr.....rr...",
  "................",
];

/**
 * The monkey climbing, seen from behind: left arm up, right arm and leg down.
 * The other climbing frame is its mirror image. Not used until #39.
 */
export const monkeyClimb: readonly string[] = [
  "................",
  "......oywo......",
  ".....oywooo.....",
  "...rooooooooor..",
  "..ryroooooooryr.",
  "..rlroooooooorlr",
  "..rrrooooooorr..",
  "..rr.oooooo.....",
  "..rr..oooo......",
  "..rr...mm.......",
  "..rrooooooo.....",
  "...roooooooo....",
  ".....oooooorr...",
  ".....ooooo.rr...",
  ".....rr..rr.....",
  ".....rr.........",
];

/**
 * The Gnome: a D&D gnome artificer facing out, with a shock of white hair,
 * goggles pushed up, long pointed ears and a teal work coat. 32×32; each
 * frame is its left half, mirrored.
 */
export const gnomeIdle: readonly string[] = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "........w..ww..w",
  "........ww.wwwww",
  ".......wwwwwwwww",
  "......wwwmmmmmmm",
  "......wwmcccmmmm",
  "......wwmcwcmmmm",
  "......wwwmmmoooo",
  "....o..wwooooooo",
  "....oo.wowwwoooo",
  ".....oowooookooy",
  "......woooookoro",
  "......wroooooroo",
  ".......ooooooorr",
  ".......woooookkk",
  "........oooooooo",
  ".........tttttww",
  ".......ntttttttw",
  "......nnttttttyw",
  "......nnddddddyy",
  "......nntttttttt",
  "......oottttttt.",
  ".........mmmm...",
  ".........mmmm...",
  "........kkkkk...",
  "........kkkkkk..",
];

/** The Gnome throwing: both arms up, a gear held over its head. Not used until #39. */
export const gnomeThrow: readonly string[] = [
  "................",
  "................",
  "..............l.",
  ".............lll",
  "............llmm",
  ".........oollmmk",
  "........noollmmk",
  ".......nn..wllmm",
  "......nnww.wwlll",
  ".....nnwwwwwwwlw",
  "....nnwwwmmmmmmm",
  "...nn.wwmcccmmmm",
  "..nn..wwmcwcmmmm",
  "..nn..wwwmmmoooo",
  "..nno..wwooooooo",
  "..nnoo.wowwwoooo",
  "..nn.oowooookooy",
  "..nn..woooookoro",
  "...nn.wroooooroo",
  "...nn..ooooooorr",
  "....nn.woooookkk",
  "....nn..oooooooo",
  ".....nn..tttttww",
  ".....nn.tttttttw",
  "........ttttttyw",
  "........ddddddyy",
  "........tttttttt",
  "........ttttttt.",
  ".........mmmm...",
  ".........mmmm...",
  "........kkkkk...",
  "........kkkkkk..",
];
