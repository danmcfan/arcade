// Pixel-art source for Brass Monkey (ADR 0006): the monkey and the Gnome, and
// the items (the gear and ember hazards and the bolt), as fills in rows of
// Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank). Frames
// are built from shared parts (a head over a body, a body with arms) so a part
// is drawn once. scripts/gen-brass-monkey-art.ts builds each frame, draws its
// 1 px black outline in the blank border and writes them to
// src/assets/images/brass-monkey/ (`bun run art`); gen-brass-monkey-art.test.ts
// fails when the committed PNGs drift from this file. Picked in the #38
// playgrounds (branch prototype/38-brass-monkey-art).

/**
 * The monkey: a polished brass robot chimp seen from the side, facing right,
 * with a cyan eye, a steel grille for a mouth and a steel neck joint. 16×16,
 * the game's hitbox. Every side-on frame is this head over one of the bodies
 * below; the walk is stand, step, stand, other step (sheet columns 0, 1, 0,
 * 2), and the step frames sit 1 px lower, so their bodies are a row shorter.
 */
export const monkeyHead: readonly string[] = [
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
];

/** Standing: arm hanging, feet together, tail curled up behind. */
export const monkeyStand: readonly string[] = [
  "..o...oywyo.....",
  ".o.o.oowyyoor...",
  ".o..oooyyyoor...",
  "..oo.oooooorr...",
  ".....rr..rr.....",
  "................",
];

/** A step, under the head 1 px lower: arm back, legs apart. */
export const monkeyStep: readonly string[] = [
  "..o...oywyo.....",
  ".o.o.rowyyyor...",
  ".o..orooyyyo....",
  "....rr....rr....",
  "................",
];

/** The other step, under the head 1 px lower: arm forward, legs crossing. */
export const monkeyOtherStep: readonly string[] = [
  "..o...oywyo.....",
  ".o.o.oowyyrr....",
  ".o..oooyyyor....",
  "......rrrr......",
  "................",
];

/** Jumping: arm up and reaching forward, legs apart. Not used until #39. */
export const monkeyJump: readonly string[] = [
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
  "..rlroooooooorl.",
  "..rrrooooooorr..",
  "..rr.oooooo.....",
  "..rr..oooo......",
  "..rr...mm.......",
  "..rrooooooo.....",
  "...roooooooo....",
  ".....oooooorr...",
  ".....ooooo.rr...",
  ".....rr..rr.....",
  "................",
];

/** A part drawn over a sprite with its top-left at (x, y). */
export interface Part {
  x: number;
  y: number;
  rows: readonly string[];
}

/**
 * The Gnome: a D&D gnome artificer facing out, with a shock of white hair,
 * goggles pushed up, long pointed ears and a teal work coat. 32×32, drawn as
 * the left half and mirrored. This is the Gnome without its arms; each frame
 * adds one of the arm parts below.
 */
export const gnomeBody: readonly string[] = [
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
  "........tttttttw",
  "........ttttttyw",
  "........ddddddyy",
  "........tttttttt",
  "........ttttttt.",
  ".........mmmm...",
  ".........mmmm...",
  "........kkkkk...",
  "........kkkkkk..",
];

/** Idle: the arms hang at the sides. */
export const gnomeArmsDown: Part = { x: 6, y: 23, rows: [".n", "nn", "nn", "nn", "oo"] };

/** Throwing: both arms up past the ears, holding a gear over the head (its left half). Not used until #39. */
export const gnomeArmsUp: Part = {
  x: 2,
  y: 2,
  rows: [
    "............l.",
    "...........lll",
    "..........llmm",
    ".......oollmmk",
    "......noollmmk",
    ".....nn...llmm",
    "....nn.....lll",
    "...nn.......l.",
    "..nn..........",
    ".nn...........",
    "nn............",
    "nn............",
    "nn............",
    "nn............",
    "nn............",
    "nn............",
    ".nn...........",
    ".nn...........",
    "..nn..........",
    "..nn..........",
    "...nn.........",
    "...nn.........",
  ],
};

/**
 * The gear: a hazard the Gnome throws, rolling down the girders. A small steel
 * gear, 12×12, with eight teeth and a square hub, lit from the top left like
 * the gear the Gnome holds in its throw. Two frames, the second turned half a
 * tooth; the game alternates them as it rolls. Not used until #39.
 */
export const gear: readonly (readonly string[])[] = [
  [
    "............",
    ".....ww.....",
    "..ww.ww.ll..",
    "..wlwlllll..",
    "...wlmmlm...",
    ".wwlmkklldd.",
    ".wwlmkklldd.",
    "...llllld...",
    "..llmlldld..",
    "..ll.dd.dd..",
    ".....dd.....",
    "............",
  ],
  [
    "............",
    "...ww..ll...",
    "...wlwwll...",
    ".wwlllllllm.",
    ".wlllmmlllm.",
    "..wlmkklld..",
    "..wlmkklld..",
    ".llllllllld.",
    ".lllllllldd.",
    "...llddld...",
    "...mm..dd...",
    "............",
  ],
];

/**
 * The ember: a hazard that wanders the girders and climbs ladders. A living
 * flame with two eyes, 12×12, drawn without the tip of the flame; each
 * flicker frame adds one of the tips below. Not used until #39.
 */
export const emberFlame: readonly string[] = [
  "............",
  "............",
  "............",
  ".....yyo....",
  "....yyyyo...",
  "...yywyyyo..",
  "...ykyykyo..",
  "...ykyykyr..",
  "...yyyyyor..",
  "....oyyorr..",
  ".....rrr....",
  "............",
];

/** The two flicker frames' tips: upright, then leaning left. The sheet adds their mirror images so the flame sways. */
export const emberTips: readonly Part[] = [
  { x: 6, y: 2, rows: ["y"] },
  { x: 5, y: 2, rows: ["y"] },
];

/**
 * The bolt: collected for points. A brass hex bolt standing on its threads,
 * 10×14: a hex head with a lit face, a front face and a shaded face over a
 * threaded shank. Not used until #39.
 */
export const bolt: readonly string[] = [
  "..........",
  "..wyyyyo..",
  ".wwyyyyor.",
  ".wwyyyyor.",
  ".wwyyyyor.",
  "..ooooor..",
  "...wyyo...",
  "...ooor...",
  "...wyyo...",
  "...ooor...",
  "...wyyo...",
  "...ooor...",
  "....yo....",
  "..........",
];

/** Where the glint that runs over the bolt's head is centred, frame by frame: a white + over the bolt's pixels. */
export const boltGlints: readonly (readonly [number, number])[] = [
  [2, 3],
  [4, 2],
  [6, 3],
];
