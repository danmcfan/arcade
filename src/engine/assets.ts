// Typed asset registry, mirroring internal/assets/assets.go plus the wave and
// lumberjack images (D5, D12). Image sizes are hard-coded from the PNG headers
// (checked by assets.test.ts) so code can read them with no DOM.

import { whole, type ImageAsset, type Sprite } from "./image.ts";
import { Sound } from "./audio.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";

import arcadeUrl from "../assets/images/arcade.png";
import playerUrl from "../assets/images/player.png";
import fireflyUrl from "../assets/images/firefly.png";
import brassMonkeyUrl from "../assets/images/brass-monkey.png";
import sweetUrl from "../assets/images/sweet.png";
import sweetSamMazeUrl from "../assets/images/sweet-sam-maze.png";
import cabinetUrl from "../assets/images/cabinet.png";
import cabinetFireflyUrl from "../assets/images/cabinet-firefly.png";
import cabinetBrassMonkeyUrl from "../assets/images/cabinet-brass-monkey.png";
import bearUrl from "../assets/images/bear.png";
import beeUrl from "../assets/images/bee.png";
import foodUrl from "../assets/images/food.png";
import readyUrl from "../assets/images/ready.png";
import digitsUrl from "../assets/images/digits.png";
import bonusUrl from "../assets/images/bonus.png";
import workshopUrl from "../assets/images/workshop.png";
import fontUrl from "../assets/images/font.png";
import logoUrl from "../assets/images/logo.png";
import iconsUrl from "../assets/images/icons.png";
import counterUrl from "../assets/images/counter.png";
import prizesUrl from "../assets/images/prizes.png";
import screensUrl from "../assets/images/screens.png";

import fireflySpriteUrl from "../assets/images/firefly/firefly.png";
import sparkUrl from "../assets/images/firefly/spark.png";
import mothUrl from "../assets/images/firefly/moth.png";
import waspUrl from "../assets/images/firefly/wasp.png";
import owlUrl from "../assets/images/firefly/owl.png";
import hitUrl from "../assets/images/firefly/hit.png";
import fireflyBackgroundUrl from "../assets/images/firefly/background.png";
import monkeyUrl from "../assets/images/brass-monkey/monkey.png";
import gnomeUrl from "../assets/images/brass-monkey/gnome.png";
import gearUrl from "../assets/images/brass-monkey/gear.png";
import emberUrl from "../assets/images/brass-monkey/ember.png";
import boltUrl from "../assets/images/brass-monkey/bolt.png";

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
import startUrl from "../assets/sounds/start.wav";
import powerUrl from "../assets/sounds/power.wav";
import deathUrl from "../assets/sounds/death.wav";
import laserUrl from "../assets/sounds/laser.wav";
import boomUrl from "../assets/sounds/boom.wav";
import titleMusicUrl from "../assets/sounds/title.wav";
import moveUrl from "../assets/sounds/move.wav";
import selectUrl from "../assets/sounds/select.wav";
import ticketUrl from "../assets/sounds/ticket.wav";
import denyUrl from "../assets/sounds/deny.wav";

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

  firefly: asset(fireflyUrl, 160, 144),
  brassMonkey: asset(brassMonkeyUrl, 160, 144),
  sweet: asset(sweetUrl, 160, 144),

  sweetSamMaze: asset(sweetSamMazeUrl, 224, 288),
  cabinet: asset(cabinetUrl, 1680, 428),
  // Recoloured from cabinet.png by `bun run art` (art/cabinets.json).
  cabinetFirefly: asset(cabinetFireflyUrl, 1680, 428),
  cabinetBrassMonkey: asset(cabinetBrassMonkeyUrl, 1680, 428),
  bear: asset(bearUrl, 64, 64),
  bee: asset(beeUrl, 64, 96),
  food: asset(foodUrl, 32, 24),
  ready: asset(readyUrl, 48, 8),
  digits: asset(digitsUrl, 80, 8),
  bonus: asset(bonusUrl, 64, 16),

  workshop: asset(workshopUrl, 224, 256),

  // Title screen, menus, HUD, the hub's prize counter and prize decorations;
  // generated from src/ui/glyphs.ts, src/ui/icons.ts, src/ui/counterArt.ts and
  // src/ui/prizeArt.ts by `bun run art`.
  font: asset(fontUrl, 128, 192),
  logo: asset(logoUrl, 100, 17),
  icons: asset(iconsUrl, 23, 9),
  counter: asset(counterUrl, 40, 14),
  prizes: asset(prizesUrl, 31, 11),
} as const;

// Go `assets.ImageX` package variables, as whole-image sprites.
export const imageArcade: Sprite = whole(images.arcade);
export const imagePlayer: Sprite = whole(images.player);
/** The hub's cabinet screens switching on and off (src/ui/hubArt.ts `powerSheetRows`). */
export const imageScreens: Sprite = whole(images.screens);
export const imageTitleFirefly: Sprite = whole(images.firefly);
export const imageTitleBrassMonkey: Sprite = whole(images.brassMonkey);
export const imageTitleSweet: Sprite = whole(images.sweet);

export const imageSweetSamMaze: Sprite = whole(images.sweetSamMaze);
export const imageCabinet: Sprite = whole(images.cabinet);
export const imageCabinetFirefly: Sprite = whole(images.cabinetFirefly);
export const imageCabinetBrassMonkey: Sprite = whole(images.cabinetBrassMonkey);
export const imageBear: Sprite = whole(images.bear);
export const imageBee: Sprite = whole(images.bee);
export const imageFood: Sprite = whole(images.food);
export const imageReady: Sprite = whole(images.ready);
export const imageDigits: Sprite = whole(images.digits);
export const imageBonus: Sprite = whole(images.bonus);

export const imageWorkshop: Sprite = whole(images.workshop);

export const imageFont: Sprite = whole(images.font);
export const imageLogo: Sprite = whole(images.logo);
export const imageIcons: Sprite = whole(images.icons);
export const imageCounter: Sprite = whole(images.counter);
export const imagePrizes: Sprite = whole(images.prizes);

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
  hit: asset(hitUrl, 160, 32),
  background: asset(fireflyBackgroundUrl, 224, 288),
} as const;

/** The player in Firefly (not the hub title card, `imageTitleFirefly`). */
export const imageFirefly: Sprite = whole(fireflyImages.firefly);
export const imageSpark: Sprite = whole(fireflyImages.spark);
export const imageMoth: Sprite = whole(fireflyImages.moth);
/** @public Firefly art not drawn yet; kept with its siblings. */
export const imageWasp: Sprite = whole(fireflyImages.wasp);
/** @public Firefly art not drawn yet; kept with its siblings. */
export const imageOwl: Sprite = whole(fireflyImages.owl);
export const imageHit: Sprite = whole(fireflyImages.hit);
export const imageFireflyBackground: Sprite = whole(fireflyImages.background);

/**
 * Brass Monkey's characters and items (src/assets/images/brass-monkey/),
 * generated from src/brass-monkey/art.ts by `bun run art`. The game draws the
 * gear, the ember and the bolt from #39.
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
} as const;

/** The monkey's sheet: walk 1-3, jump, climb 1-2, each 16×16. */
export const imageMonkey: Sprite = whole(brassMonkeyImages.monkey);
/** The Gnome's sheet: idle, throw, each 32×32. */
export const imageGnome: Sprite = whole(brassMonkeyImages.gnome);

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
  ...Object.values(fireflyImages),
  ...Object.values(brassMonkeyImages),
  waveThree,
  ...Object.values(lumberjackImages),
  debugFont,
];

/**
 * The hub's song, screen sound and the cabinets' attract loops, the Go
 * `assets.SoundX` minigame sounds, then the title scene's music and menu and
 * payout sounds. All but the minigame sounds are generated by
 * scripts/gen-ui-sounds.ts. The songs and attract loops loop; the hub's play
 * quietly, under everything else.
 */
export const sounds = {
  hub: new Sound("hub", hubUrl, true, 0.3),
  screenOn: new Sound("screenOn", screenOnUrl, false, 0.5),
  attractBrassMonkey: new Sound("attractBrassMonkey", attractBrassMonkeyUrl, true, 0.35),
  attractSweet: new Sound("attractSweet", attractSweetUrl, true, 0.35),
  attractFirefly: new Sound("attractFirefly", attractFireflyUrl, true, 0.35),
  start: new Sound("start", startUrl, false),
  power: new Sound("power", powerUrl, false),
  death: new Sound("death", deathUrl, false),
  laser: new Sound("laser", laserUrl, false),
  boom: new Sound("boom", boomUrl, false),
  title: new Sound("title", titleMusicUrl, true),
  move: new Sound("move", moveUrl, false),
  select: new Sound("select", selectUrl, false),
  ticket: new Sound("ticket", ticketUrl, false),
  deny: new Sound("deny", denyUrl, false),
} as const;

export const soundHub: Sound = sounds.hub;
export const soundScreenOn: Sound = sounds.screenOn;
export const soundStart: Sound = sounds.start;
export const soundPower: Sound = sounds.power;
export const soundDeath: Sound = sounds.death;
export const soundLaser: Sound = sounds.laser;
export const soundBoom: Sound = sounds.boom;
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
