// Typed asset registry, mirroring internal/assets/assets.go plus the wave and
// lumberjack images (D5, D12). Image sizes are hard-coded from the PNG headers
// (checked by assets.test.ts) so code can read them with no DOM.
// `shipExplosion.png` is not loaded by Go and is deliberately not imported.

import { whole, type ImageAsset, type Sprite } from "./image.ts";
import { Sound } from "./audio.ts";

import arcadeUrl from "../assets/images/arcade.png";
import gamerUrl from "../assets/images/gamer.png";
import fireflyUrl from "../assets/images/firefly.png";
import gearheadUrl from "../assets/images/gearhead.png";
import sweetUrl from "../assets/images/sweet.png";
import hiveUrl from "../assets/images/hive.png";
import cabinetUrl from "../assets/images/cabinet.png";
import bearUrl from "../assets/images/bear.png";
import beeUrl from "../assets/images/bee.png";
import foodUrl from "../assets/images/food.png";
import readyUrl from "../assets/images/ready.png";
import digitsUrl from "../assets/images/digits.png";
import bonusUrl from "../assets/images/bonus.png";
import galaxyUrl from "../assets/images/galaxy.png";
import shipUrl from "../assets/images/ship.png";
import bulletUrl from "../assets/images/bullet.png";
import bugUrl from "../assets/images/bug.png";
import explosionUrl from "../assets/images/explosion.png";
import workshopUrl from "../assets/images/workshop.png";
import gnomeUrl from "../assets/images/gnome.png";
import fontUrl from "../assets/images/font.png";
import logoUrl from "../assets/images/logo.png";

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

import melodyUrl from "../assets/sounds/melody.ogg";
import startUrl from "../assets/sounds/start.wav";
import powerUrl from "../assets/sounds/power.wav";
import deathUrl from "../assets/sounds/death.wav";
import laserUrl from "../assets/sounds/laser.wav";
import boomUrl from "../assets/sounds/boom.wav";

function asset(url: string, width: number, height: number): ImageAsset {
  return { url, width, height, image: null };
}

/** Every arcade image, keyed by its file name in internal/assets/images. */
export const images = {
  arcade: asset(arcadeUrl, 160, 144),
  gamer: asset(gamerUrl, 64, 96),
  firefly: asset(fireflyUrl, 160, 144),
  gearhead: asset(gearheadUrl, 160, 144),
  sweet: asset(sweetUrl, 160, 144),

  hive: asset(hiveUrl, 224, 288),
  cabinet: asset(cabinetUrl, 1680, 428),
  bear: asset(bearUrl, 64, 64),
  bee: asset(beeUrl, 64, 96),
  food: asset(foodUrl, 32, 24),
  ready: asset(readyUrl, 48, 8),
  digits: asset(digitsUrl, 80, 8),
  bonus: asset(bonusUrl, 64, 16),

  galaxy: asset(galaxyUrl, 224, 288),
  ship: asset(shipUrl, 16, 16),
  bullet: asset(bulletUrl, 8, 8),
  bug: asset(bugUrl, 96, 64),
  explosion: asset(explosionUrl, 160, 32),

  workshop: asset(workshopUrl, 224, 256),
  gnome: asset(gnomeUrl, 64, 64),

  // Title screen and menus; generated from src/ui/glyphs.ts by `bun run art`.
  font: asset(fontUrl, 128, 192),
  logo: asset(logoUrl, 100, 17),
} as const;

// Go `assets.ImageX` package variables, as whole-image sprites.
export const imageArcade: Sprite = whole(images.arcade);
export const imageGamer: Sprite = whole(images.gamer);
export const imageTitleFirefly: Sprite = whole(images.firefly);
export const imageTitleGearhead: Sprite = whole(images.gearhead);
export const imageTitleSweet: Sprite = whole(images.sweet);

export const imageHive: Sprite = whole(images.hive);
export const imageCabinet: Sprite = whole(images.cabinet);
export const imageBear: Sprite = whole(images.bear);
export const imageBee: Sprite = whole(images.bee);
export const imageFood: Sprite = whole(images.food);
export const imageReady: Sprite = whole(images.ready);
export const imageDigits: Sprite = whole(images.digits);
export const imageBonus: Sprite = whole(images.bonus);

export const imageGalaxy: Sprite = whole(images.galaxy);
export const imageShip: Sprite = whole(images.ship);
export const imageBullet: Sprite = whole(images.bullet);
export const imageBug: Sprite = whole(images.bug);
export const imageExplosion: Sprite = whole(images.explosion);

export const imageWorkshop: Sprite = whole(images.workshop);
export const imageGnome: Sprite = whole(images.gnome);

export const imageFont: Sprite = whole(images.font);
export const imageLogo: Sprite = whole(images.logo);

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
  waveThree,
  ...Object.values(lumberjackImages),
  debugFont,
];

/** Go `assets.SoundX` package variables. Only the melody loops. */
export const sounds = {
  melody: new Sound("melody", melodyUrl, true),
  start: new Sound("start", startUrl, false),
  power: new Sound("power", powerUrl, false),
  death: new Sound("death", deathUrl, false),
  laser: new Sound("laser", laserUrl, false),
  boom: new Sound("boom", boomUrl, false),
} as const;

export const soundMelody: Sound = sounds.melody;
export const soundStart: Sound = sounds.start;
export const soundPower: Sound = sounds.power;
export const soundDeath: Sound = sounds.death;
export const soundLaser: Sound = sounds.laser;
export const soundBoom: Sound = sounds.boom;

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
