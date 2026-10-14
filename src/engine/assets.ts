// Typed asset registry, mirroring internal/assets/assets.go plus the wave and
// lumberjack images (D5, D12). Image sizes are hard-coded from the PNG headers
// (checked by assets.test.ts) so code can read them with no DOM.

import { whole, type ImageAsset, type Sprite } from "./image.ts";
import { Sound } from "./audio.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";

import arcadeUrl from "../assets/images/arcade.png";
import playerUrl from "../assets/images/player.png";
import cabinetUrl from "../assets/images/cabinet.png";
import cabinetFireflyUrl from "../assets/images/cabinet-firefly.png";
import cabinetBrassMonkeyUrl from "../assets/images/cabinet-brass-monkey.png";
import fontUrl from "../assets/images/font.png";
import logoUrl from "../assets/images/logo.png";
import iconsUrl from "../assets/images/icons.png";
import tickerUrl from "../assets/images/ticker.png";
import employeeUrl from "../assets/images/employee.png";
import prizesUrl from "../assets/images/prizes.png";
import screensUrl from "../assets/images/screens.png";

import sweetSamMazeUrl from "../assets/images/sweet-sam/maze.png";
import bearUrl from "../assets/images/sweet-sam/bear.png";
import sweetSamMazeFlashUrl from "../assets/images/sweet-sam/maze-flash.png";
import flowerUrl from "../assets/images/sweet-sam/flower.png";
import beesUrl from "../assets/images/sweet-sam/bees.png";
import honeyDropUrl from "../assets/images/sweet-sam/honey-drop.png";
import honeyPotUrl from "../assets/images/sweet-sam/honey-pot.png";
import readyUrl from "../assets/images/sweet-sam/ready.png";
import digitsUrl from "../assets/images/sweet-sam/digits.png";
import pointsUrl from "../assets/images/sweet-sam/points.png";

import fireflySpriteUrl from "../assets/images/firefly/firefly.png";
import sparkUrl from "../assets/images/firefly/spark.png";
import mothUrl from "../assets/images/firefly/moth.png";
import waspUrl from "../assets/images/firefly/wasp.png";
import owlUrl from "../assets/images/firefly/owl.png";
import owlHurtUrl from "../assets/images/firefly/owl-hurt.png";
import shotUrl from "../assets/images/firefly/shot.png";
import hitUrl from "../assets/images/firefly/hit.png";
import fireflyBackgroundUrl from "../assets/images/firefly/background.png";
import monkeyUrl from "../assets/images/brass-monkey/monkey.png";
import gnomeUrl from "../assets/images/brass-monkey/gnome.png";
import gearUrl from "../assets/images/brass-monkey/gear.png";
import emberUrl from "../assets/images/brass-monkey/ember.png";
import boltUrl from "../assets/images/brass-monkey/bolt.png";
import girderUrl from "../assets/images/brass-monkey/girder.png";
import ladderUrl from "../assets/images/brass-monkey/ladder.png";
import conveyorUrl from "../assets/images/brass-monkey/conveyor.png";
import doorUrl from "../assets/images/brass-monkey/door.png";
import wallUrl from "../assets/images/brass-monkey/wall.png";
import girderFloorUrl from "../assets/images/brass-monkey/girder-floor.png";
import conveyorFloorUrl from "../assets/images/brass-monkey/conveyor-floor.png";

import waveThreeUrl from "../lab/wave/three.png";

import debugFontUrl from "./debugfont.png";

import ljGrassUrl from "../lab/lumberjack/images/Tiles/Grass/Grass_1_Middle.png";
import ljBaseUrl from "../lab/lumberjack/images/Player/Player_Base/Player_Base_animations.png";
import ljHairUrl from "../lab/lumberjack/images/Player/Head/Hair_1/Hair_1_Brown.png";
import ljShirtUrl from "../lab/lumberjack/images/Player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png";
import ljHandsUrl from "../lab/lumberjack/images/Player/Hands/Hands_1_Bare.png";
import ljPantsUrl from "../lab/lumberjack/images/Player/Legs/OG_Pants/Pants_1_Blue.png";
import ljShoesUrl from "../lab/lumberjack/images/Player/Feet/Shoes_1_Brown.png";
import ljToolsUrl from "../lab/lumberjack/images/Player/Tools/Iron/Iron_Tools.png";
import ljOakUrl from "../lab/lumberjack/images/Trees/Big_Oak_Tree.png";

import hubUrl from "../assets/sounds/hub.wav";
import screenOnUrl from "../assets/sounds/screen-on.wav";
import attractBrassMonkeyUrl from "../assets/sounds/attract-brass-monkey.wav";
import attractSweetUrl from "../assets/sounds/attract-sweet.wav";
import attractFireflyUrl from "../assets/sounds/attract-firefly.wav";
import sweetStartUrl from "../assets/sounds/sweet-sam-start.wav";
import sweetChompHighUrl from "../assets/sounds/sweet-sam-chomp-high.wav";
import sweetChompLowUrl from "../assets/sounds/sweet-sam-chomp-low.wav";
import sweetSmokeUrl from "../assets/sounds/sweet-sam-smoke.wav";
import sweetBeeUrl from "../assets/sounds/sweet-sam-bee.wav";
import sweetFlowerUrl from "../assets/sounds/sweet-sam-flower.wav";
import sweetDeathUrl from "../assets/sounds/sweet-sam-death.wav";
import sweetClearUrl from "../assets/sounds/sweet-sam-clear.wav";
import sparkSoundUrl from "../assets/sounds/spark.wav";
import hitSoundUrl from "../assets/sounds/hit.wav";
import lifeLostUrl from "../assets/sounds/life-lost.wav";
import stageUrl from "../assets/sounds/stage.wav";
import titleMusicUrl from "../assets/sounds/title.wav";
import moveUrl from "../assets/sounds/move.wav";
import selectUrl from "../assets/sounds/select.wav";
import ticketUrl from "../assets/sounds/ticket.wav";
import denyUrl from "../assets/sounds/deny.wav";
import monkeyJumpUrl from "../assets/sounds/monkey-jump.wav";
import monkeyBoltUrl from "../assets/sounds/monkey-bolt.wav";
import monkeyHazardUrl from "../assets/sounds/monkey-hazard.wav";
import monkeyDeathUrl from "../assets/sounds/monkey-death.wav";
import monkeyFloorUrl from "../assets/sounds/monkey-floor.wav";
import monkeyEscapeUrl from "../assets/sounds/monkey-escape.wav";

function asset(url: string, width: number, height: number): ImageAsset {
  return { url, width, height, image: null };
}

/** Every arcade image, keyed by its file name in internal/assets/images. */
export const images = {
  // The hub room, its screens switching on and off, and the player's sheet;
  // generated from src/ui/hubArt.ts and src/ui/playerArt.ts by `bun run art`.
  arcade: asset(arcadeUrl, 160, 144),
  screens: asset(screensUrl, 392, 108),
  player: asset(playerUrl, 64, 96),

  cabinet: asset(cabinetUrl, 1680, 428),
  // Recoloured from cabinet.png by `bun run art` (art/cabinets.json).
  cabinetFirefly: asset(cabinetFireflyUrl, 1680, 428),
  cabinetBrassMonkey: asset(cabinetBrassMonkeyUrl, 1680, 428),

  // Title screen, menus, menu icons, the hub scoreboard, the desk employee and prize decorations;
  // generated from src/ui/glyphs.ts, icons.ts, tickerArt.ts, employeeArt.ts and
  // src/ui/prizeArt.ts by `bun run art`.
  font: asset(fontUrl, 128, 192),
  logo: asset(logoUrl, 100, 17),
  icons: asset(iconsUrl, 23, 9),
  ticker: asset(tickerUrl, 111, 25),
  employee: asset(employeeUrl, 48, 24),
  prizes: asset(prizesUrl, 91, 12),
} as const;

// Go `assets.ImageX` package variables, as whole-image sprites.
export const imageArcade: Sprite = whole(images.arcade);
export const imagePlayer: Sprite = whole(images.player);
/** The hub's cabinet screens switching on and off (src/ui/hubArt.ts `powerSheetRows`). */
export const imageScreens: Sprite = whole(images.screens);

export const imageCabinet: Sprite = whole(images.cabinet);
export const imageCabinetFirefly: Sprite = whole(images.cabinetFirefly);
export const imageCabinetBrassMonkey: Sprite = whole(images.cabinetBrassMonkey);

export const imageFont: Sprite = whole(images.font);
export const imageLogo: Sprite = whole(images.logo);
export const imageIcons: Sprite = whole(images.icons);
/** The LED scoreboard's lit letters (src/ui/tickerArt.ts). */
export const imageTicker: Sprite = whole(images.ticker);
/** The prize desk's employee, idle frames left to right (src/ui/employeeArt.ts). */
export const imageEmployee: Sprite = whole(images.employee);
export const imagePrizes: Sprite = whole(images.prizes);

/**
 * Sweet Sam's sprites (src/assets/images/sweet-sam/), generated from
 * src/sweet-sam/art.ts by `bun run art`. Sprite frames are 16×16; bees.png
 * is one 64×96 sheet per bee (`beeOrder`), the honey drop and honey pot
 * are 4 frames of 8×12, and the points are 4 popup frames of 16×16. The
 * flash maze and the bonus flower are #47's.
 */
export const sweetSamImages = {
  maze: asset(sweetSamMazeUrl, 224, 288),
  bear: asset(bearUrl, 64, 80),
  bees: asset(beesUrl, 64, 384),
  honeyDrop: asset(honeyDropUrl, 32, 12),
  honeyPot: asset(honeyPotUrl, 32, 12),
  ready: asset(readyUrl, 48, 8),
  digits: asset(digitsUrl, 80, 8),
  points: asset(pointsUrl, 64, 16),
  mazeFlash: asset(sweetSamMazeFlashUrl, 224, 288),
  flower: asset(flowerUrl, 16, 16),
} as const;

export const imageSweetSamMaze: Sprite = whole(sweetSamImages.maze);
export const imageSweetSamMazeFlash: Sprite = whole(sweetSamImages.mazeFlash);
export const imageFlower: Sprite = whole(sweetSamImages.flower);
export const imageBear: Sprite = whole(sweetSamImages.bear);
export const imageBees: Sprite = whole(sweetSamImages.bees);
export const imageHoneyDrop: Sprite = whole(sweetSamImages.honeyDrop);
export const imageHoneyPot: Sprite = whole(sweetSamImages.honeyPot);
/** READY!, six 8×8 letters. */
export const imageReady: Sprite = whole(sweetSamImages.ready);
/** Sweet Sam's score dial digits, 0 to 9, 8×8 each. */
export const imageDigits: Sprite = whole(sweetSamImages.digits);
/** The points for eating a sleepy bee: 200, 400, 800, 1600. */
export const imagePoints: Sprite = whole(sweetSamImages.points);

/**
 * Firefly's sprites (src/assets/images/firefly/), generated from
 * src/firefly/art.ts by `bun run art`. The Moth, Wasp and Owl are rotation
 * sheets: 6 columns of 15° by 4 rows of 90°, clockwise from facing up.
 */
export const fireflyImages = {
  firefly: asset(fireflySpriteUrl, 16, 16),
  spark: asset(sparkUrl, 8, 8),
  moth: asset(mothUrl, 96, 64),
  wasp: asset(waspUrl, 96, 64),
  owl: asset(owlUrl, 192, 128),
  owlHurt: asset(owlHurtUrl, 192, 128),
  shot: asset(shotUrl, 4, 8),
  hit: asset(hitUrl, 160, 32),
  background: asset(fireflyBackgroundUrl, 224, 288),
} as const;

/** The player in Firefly. */
export const imageFirefly: Sprite = whole(fireflyImages.firefly);
export const imageSpark: Sprite = whole(fireflyImages.spark);
export const imageMoth: Sprite = whole(fireflyImages.moth);
export const imageWasp: Sprite = whole(fireflyImages.wasp);
export const imageOwl: Sprite = whole(fireflyImages.owl);
/** The Owl after its first hit. */
export const imageOwlHurt: Sprite = whole(fireflyImages.owlHurt);
/** An enemy shot. */
export const imageShot: Sprite = whole(fireflyImages.shot);
export const imageHit: Sprite = whole(fireflyImages.hit);
export const imageFireflyBackground: Sprite = whole(fireflyImages.background);

/**
 * Brass Monkey's characters, items and floors (src/assets/images/brass-monkey/),
 * generated from src/brass-monkey/art.ts and floors.ts by `bun run art`. The
 * game draws all of them (#39).
 */
export const brassMonkeyImages = {
  monkey: asset(monkeyUrl, 96, 16),
  gnome: asset(gnomeUrl, 64, 32),
  /** Two turns, each 12×12. */
  gear: asset(gearUrl, 24, 12),
  /** Two flickers and their mirrors, each 12×12. */
  ember: asset(emberUrl, 48, 12),
  /** At rest, then three glint frames, each 10×14. */
  bolt: asset(boltUrl, 40, 14),
  girder: asset(girderUrl, 8, 8),
  /** Row `y % 4` is drawn at height y. */
  ladder: asset(ladderUrl, 8, 4),
  /** The left end, middle and right end, 4 frames each, 8×8. */
  conveyor: asset(conveyorUrl, 96, 8),
  door: asset(doorUrl, 16, 24),
  wall: asset(wallUrl, 32, 32),
  /** The girder floor: the wall, girders, ladders and exit door, laid out by src/brass-monkey/floors.ts. */
  girderFloor: asset(girderFloorUrl, 224, 256),
  /** The conveyor floor, its conveyors in their first frame. */
  conveyorFloor: asset(conveyorFloorUrl, 224, 256),
} as const;

/** The monkey's sheet: walk 1-3, jump, climb 1-2, each 16×16. */
export const imageMonkey: Sprite = whole(brassMonkeyImages.monkey);
/** The Gnome's sheet: idle, throw, each 32×32. */
export const imageGnome: Sprite = whole(brassMonkeyImages.gnome);
export const imageGirderFloor: Sprite = whole(brassMonkeyImages.girderFloor);
export const imageConveyorFloor: Sprite = whole(brassMonkeyImages.conveyorFloor);
/** Two turns, each 12×12. */
export const imageGear: Sprite = whole(brassMonkeyImages.gear);
/** Two flickers and their mirrors, each 12×12. */
export const imageEmber: Sprite = whole(brassMonkeyImages.ember);
/** At rest, then three glint frames, each 10×14. */
export const imageBolt: Sprite = whole(brassMonkeyImages.bolt);
/** The left end, middle and right end, 4 frames each, 8×8. */
export const imageConveyor: Sprite = whole(brassMonkeyImages.conveyor);
export const imageDoor: Sprite = whole(brassMonkeyImages.door);
export const imageWall: Sprite = whole(brassMonkeyImages.wall);

/** internal/wave/three.png: grass, sand, water tiles (16×16 each). */
export const waveThree: ImageAsset = asset(waveThreeUrl, 48, 16);

/**
 * The Go engine's debug font (`text.png`, Apache-2.0, see
 * debugfont.LICENSE.txt): 6×16 glyphs indexed by code point. Drawn by
 * `debugPrint` in text.ts (D14).
 */
export const debugFont: ImageAsset = asset(debugFontUrl, 192, 128);

/**
 * The 9 lumberjack sheets Go draws, keyed by the path Go passes to
 * `NewSpritesheet` (relative to `internal/lumberjack/images/`).
 * `Trees/Oak_Leaf_Particle.png` is loaded by Go but never drawn: skipped.
 */
export const lumberjackImages = {
  "Tiles/Grass/Grass_1_Middle.png": asset(ljGrassUrl, 16, 16),
  "Player/Player_Base/Player_Base_animations.png": asset(ljBaseUrl, 576, 3584),
  "Player/Head/Hair_1/Hair_1_Brown.png": asset(ljHairUrl, 576, 3584),
  "Player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png": asset(ljShirtUrl, 576, 3584),
  "Player/Hands/Hands_1_Bare.png": asset(ljHandsUrl, 576, 3584),
  "Player/Legs/OG_Pants/Pants_1_Blue.png": asset(ljPantsUrl, 576, 3584),
  "Player/Feet/Shoes_1_Brown.png": asset(ljShoesUrl, 576, 3584),
  "Player/Tools/Iron/Iron_Tools.png": asset(ljToolsUrl, 384, 768),
  "Trees/Big_Oak_Tree.png": asset(ljOakUrl, 192, 80),
} as const;
export type LumberjackImagePath = keyof typeof lumberjackImages;

/** Every image to decode before the first tick (D5). */
export const allImages: readonly ImageAsset[] = [
  ...Object.values(images),
  ...Object.values(sweetSamImages),
  ...Object.values(fireflyImages),
  ...Object.values(brassMonkeyImages),
  waveThree,
  ...Object.values(lumberjackImages),
  debugFont,
];

/**
 * The hub's song, screen sound and the cabinets' attract loops, the
 * minigame sounds (Sweet Sam's, then Firefly's), then the title scene's music
 * and menu and payout sounds, then Brass Monkey's. All are generated by
 * scripts/gen-ui-sounds.ts. The songs and attract loops loop; the hub's play
 * quietly, under everything else.
 */
export const sounds = {
  hub: new Sound("hub", hubUrl, true, 0.3),
  screenOn: new Sound("screenOn", screenOnUrl, false, 0.5),
  attractBrassMonkey: new Sound("attractBrassMonkey", attractBrassMonkeyUrl, true, 0.35),
  attractSweet: new Sound("attractSweet", attractSweetUrl, true, 0.35),
  attractFirefly: new Sound("attractFirefly", attractFireflyUrl, true, 0.35),
  sweetStart: new Sound("sweetStart", sweetStartUrl, false),
  sweetChompHigh: new Sound("sweetChompHigh", sweetChompHighUrl, false),
  sweetChompLow: new Sound("sweetChompLow", sweetChompLowUrl, false),
  sweetSmoke: new Sound("sweetSmoke", sweetSmokeUrl, false),
  sweetBee: new Sound("sweetBee", sweetBeeUrl, false),
  sweetFlower: new Sound("sweetFlower", sweetFlowerUrl, false),
  sweetDeath: new Sound("sweetDeath", sweetDeathUrl, false),
  sweetClear: new Sound("sweetClear", sweetClearUrl, false),
  spark: new Sound("spark", sparkSoundUrl, false),
  hit: new Sound("hit", hitSoundUrl, false),
  lifeLost: new Sound("lifeLost", lifeLostUrl, false),
  stage: new Sound("stage", stageUrl, false),
  title: new Sound("title", titleMusicUrl, true),
  move: new Sound("move", moveUrl, false),
  select: new Sound("select", selectUrl, false),
  ticket: new Sound("ticket", ticketUrl, false),
  deny: new Sound("deny", denyUrl, false),
  monkeyJump: new Sound("monkeyJump", monkeyJumpUrl, false),
  monkeyBolt: new Sound("monkeyBolt", monkeyBoltUrl, false),
  monkeyHazard: new Sound("monkeyHazard", monkeyHazardUrl, false),
  monkeyDeath: new Sound("monkeyDeath", monkeyDeathUrl, false),
  monkeyFloor: new Sound("monkeyFloor", monkeyFloorUrl, false),
  monkeyEscape: new Sound("monkeyEscape", monkeyEscapeUrl, false),
} as const;

/** Brass Monkey's sound effects (generated by scripts/gen-ui-sounds.ts), by the run's name for each. */
export const brassMonkeySounds = {
  jump: sounds.monkeyJump,
  bolt: sounds.monkeyBolt,
  hazard: sounds.monkeyHazard,
  death: sounds.monkeyDeath,
  floor: sounds.monkeyFloor,
  escape: sounds.monkeyEscape,
} as const;

export const soundHub: Sound = sounds.hub;
export const soundScreenOn: Sound = sounds.screenOn;
/** Sweet Sam's sounds (#47), generated from `sweetSamTunes` in src/ui/sounds.ts. */
export const sweetSamSounds = {
  start: sounds.sweetStart,
  chompHigh: sounds.sweetChompHigh,
  chompLow: sounds.sweetChompLow,
  smoke: sounds.sweetSmoke,
  bee: sounds.sweetBee,
  flower: sounds.sweetFlower,
  death: sounds.sweetDeath,
  clear: sounds.sweetClear,
} as const;
export const soundSpark: Sound = sounds.spark;
export const soundHit: Sound = sounds.hit;
export const soundLifeLost: Sound = sounds.lifeLost;
export const soundStage: Sound = sounds.stage;
export const soundTitleMusic: Sound = sounds.title;
export const soundMove: Sound = sounds.move;
export const soundSelect: Sound = sounds.select;
export const soundTicket: Sound = sounds.ticket;
export const soundDeny: Sound = sounds.deny;

export const allSounds: readonly Sound[] = Object.values(sounds);

/**
 * Browser only: decode every image (`await img.decode()`) and attach it to
 * its `ImageAsset.image` (D5, D12). Resolves once all are decoded; rejects
 * naming the first URL that fails. `create` is a seam for tests.
 */
export async function loadImages(
  list: readonly ImageAsset[] = allImages,
  create: () => HTMLImageElement = () => new Image(),
): Promise<void> {
  await Promise.all(
    list.map(async (a) => {
      const img = create();
      img.src = a.url;
      try {
        await img.decode();
      } catch (err) {
        throw new Error(`loadImages: could not decode ${a.url}`, { cause: err });
      }
      a.image = img;
    }),
  );
}

/** Each cabinet's attract loop, played quietly while the player faces it. */
export const attractSounds: Readonly<Record<ArcadeTitle, Sound>> = {
  brassMonkey: sounds.attractBrassMonkey,
  sweet: sounds.attractSweet,
  firefly: sounds.attractFirefly,
};
