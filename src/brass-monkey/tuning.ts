// Brass Monkey's numbers: how the monkey moves, how often the Gnome sends its
// hazards and how fast they go, the points, the bonus and how much harder each
// loop through the floors gets. Every value is in floor pixels and ticks (1/60 s).

/** Lives at the start of a run. */
export const startLives = 3;
/** The score that earns the run's one extra life (Donkey Kong's 7,000). */
export const extraLifeAt = 7000;

/** The monkey walks this many px a tick. */
export const walkSpeed = 1;
/** It climbs a ladder this many px a tick. */
export const climbSpeed = 0.75;
/** A jump's upward speed, in px a tick; with `gravity` it rises 15 px and lands 31 ticks later. */
export const jumpSpeed = 2;
/** Added to the falling speed every tick, for the monkey and the gears alike. */
export const gravity = 0.125;
/** The fastest anything falls, in px a tick. */
export const maxFallSpeed = 3;
/**
 * A fall from higher than this, measured from the top of the arc, costs a
 * life. A jump's own arc is 15 px, so the monkey can jump on the flat but not
 * walk off a girder to the one below (21 px or more).
 */
export const maxFall = 20;
/** How far from a ladder's middle the monkey can be and still grab it. */
export const ladderReach = 4;
/** A conveyor carries what stands on it this many px a tick. */
export const beltSpeed = 0.5;
/** A lift's platforms move this many px a tick. */
export const liftSpeed = 0.5;
/** A spring moves right this many px a tick along the Gnome's girder... */
export const springSpeed = 1;
/** ...bouncing off it at this upward speed, in px a tick: with `gravity`, 16 px high. */
export const springBounce = 2;
/**
 * The conveyors all reverse this often. Donkey Kong's 50m belts change
 * direction, but no source gives a timer (StrategyWiki ties it to Kong's
 * position), so 10 s is our call: long enough for a pan to ride a whole belt.
 */
export const beltReverseTicks = 600;

/**
 * At the head of a ladder, a gear rolls down it this often on loop 0 as the
 * floor starts. As in Donkey Kong, where Kong steers barrels down ladders more
 * as the difficulty rises, the chance grows with the loop and the time on the floor...
 */
export const gearLadderChance = 0.25;
/** ...by this much each loop... */
export const gearLadderLoopRise = 0.1;
/** ...and this much every `gearLadderRiseTicks` on the floor... */
export const gearLadderTimeRise = 0.05;
export const gearLadderRiseTicks = 600;
/** ...up to this. */
export const maxGearLadderChance = 0.75;
/** With the monkey below the ladder the chance is multiplied by this; with it level or above, by `gearAwayFactor`. */
export const gearTowardFactor = 1.5;
export const gearAwayFactor = 0.5;

/** The gear's ladder chance on loop `loop`, `floorTicks` into the floor, the monkey below the ladder or not. */
export function gearLadderChanceFor(loop: number, floorTicks: number, monkeyBelow: boolean): number {
  const rise = gearLadderLoopRise * loop + gearLadderTimeRise * Math.floor(floorTicks / gearLadderRiseTicks);
  const base = Math.min(maxGearLadderChance, gearLadderChance + rise);
  return monkeyBelow ? Math.min(maxGearLadderChance, base * gearTowardFactor) : base * gearAwayFactor;
}

/** At a ladder towards the monkey (up when it is higher, down when lower), an ember takes it this often... */
export const emberTowardChance = 0.6;
/** ...and at a ladder away from it, this often. */
export const emberAwayChance = 0.15;
/** With the monkey level (this close up and down), at a ladder down an ember takes it this often... */
export const emberLevelY = 8;
export const emberDownChance = 0.5;
/** ...and at a ladder up, this often. */
export const emberUpChance = 0.25;

/** An ember on a girder turns to face the monkey every this many ticks on loop 0... */
export const emberTurnEvery = 120;
/** ...this many fewer each loop... */
export const emberTurnLoopStep = 20;
/** ...but no more often than this. */
export const minEmberTurnEvery = 40;

/** Ticks between an ember's turns towards the monkey on loop `loop`. */
export function emberTurnEveryFor(loop: number): number {
  return Math.max(minEmberTurnEvery, emberTurnEvery - emberTurnLoopStep * loop);
}

/**
 * Wild gears, as Donkey Kong's diagonal barrels: from loop `wildFromLoop` on,
 * a gear is wild this often per loop past the first, up to `maxWildChance`. A
 * wild gear ignores the girders and drops in hops towards the monkey.
 */
export const wildFromLoop = 1;
export const wildChancePerLoop = 0.15;
export const maxWildChance = 0.5;

/** The chance a gear the Gnome sends on loop `loop` is wild. */
export function wildChanceFor(loop: number): number {
  return loop < wildFromLoop ? 0 : Math.min(maxWildChance, wildChancePerLoop * loop);
}

/** A wild gear's hop lasts this many ticks, starting down at `wildHopSpeed` px a tick and speeding up with `gravity`. */
export const wildHopTicks = 20;
export const wildHopSpeed = 0.25;
/** Across, it moves this fraction of the gear speed towards the monkey. */
export const wildDrift = 0.75;

/**
 * Of the gears after the first of each life (always hot), this many are hot,
 * as Donkey Kong's blue barrels: one that reaches the furnace lights it and
 * sends out an ember.
 */
export const hotGearChance = 0.25;

/** The score for one, two, then three or more hazards cleared in one jump, as in arcade Donkey Kong. */
export const jumpPoints = [100, 300, 800] as const;
/** A hazard smashed by the wrench scores one of these, picked at random (Donkey Kong's hammer). */
export const smashPoints = [300, 500, 800] as const;
/** Points for a bolt on each loop, as Pauline's hat, parasol and purse score in Donkey Kong; the last holds from then on. */
const boltPointsByLoop = [300, 500, 800] as const;

/** Points for a bolt on loop `loop` (0 the first time through). */
export function boltPointsFor(loop: number): number {
  return boltPointsByLoop[Math.min(loop, boltPointsByLoop.length - 1)] ?? 0;
}

/** Ticks a collected bolt's points float where it was. */
export const popupTicks = 60;
/** Points for pulling a rivet, as in Donkey Kong. */
export const rivetPoints = 100;
/** A pulled rivet leaves a hole this many px either side of its middle: the monkey falls in walking onto it. */
export const holeHalf = 4;

/** The monkey's hitbox and a hazard's touch the hazard when their centres are this close across... */
export const touchX = 9;
/** ...and this close up and down. */
export const touchY = 10;
/** A hazard counts as jumped when it passes under the airborne monkey this close across. */
export const jumpOverX = 6;
/** ...and no more than this far below the monkey's feet. */
export const jumpOverHeight = 32;
/** The monkey picks up a bolt this close across and up and down. */
export const boltReach = 10;
/** ...and a wrench this close. */
export const wrenchReach = 8;
/**
 * Ticks the wrench lasts: 10 s, the hammer time commonly quoted for Donkey
 * Kong (MarioWiki gives none). Jumping and climbing do nothing until it ends.
 */
export const wrenchTicks = 600;
/** The wrench flashes for its last 2 s. */
export const wrenchFlashTicks = 120;
/**
 * The swing smashes a hazard whose centre is up to this far in front of the
 * monkey's middle, as close up and down as a touch (`touchY`)...
 */
export const smashReach = 18;
/** ...or this far behind it; any further behind, the hazard touches the monkey as it would without the wrench. */
export const smashBehind = 2;
/** On the raised frames the swing also smashes this far above the monkey's middle, drawn over its head. */
export const smashRaisedY = 20;
/** Ticks a smash's points show where the hazard was. */
export const smashShowTicks = 45;

/** How each floor is played on the first loop. */
export interface FloorTuning {
  /** Ticks between gears (pans, on a floor with pans; springs on the elevator floor); the first comes after `firstGear`. */
  gearEvery: number;
  firstGear: number;
  /** Ticks between embers the Gnome throws, on a floor without a furnace; the first comes after `firstEmber`. */
  emberEvery: number;
  firstEmber: number;
  /** The most embers on the floor at once. */
  maxEmbers: number;
  /** A gear rolls this many px a tick. */
  gearSpeed: number;
  /** An ember walks this many px a tick... */
  emberWalkSpeed: number;
  /** ...and climbs this many. */
  emberClimbSpeed: number;
  /** The bonus when the floor starts. */
  bonusStart: number;
}

/** The girder floor, the conveyor floor, the elevator floor, then the rivet floor (no gears: embers come in from the sides). */
export const floorTunings: readonly FloorTuning[] = [
  {
    gearEvery: 150,
    firstGear: 60,
    emberEvery: 600,
    firstEmber: 300,
    maxEmbers: 2,
    gearSpeed: 1,
    emberWalkSpeed: 0.5,
    emberClimbSpeed: 0.5,
    bonusStart: 5000,
  },
  {
    gearEvery: 180,
    firstGear: 60,
    emberEvery: 420,
    firstEmber: 180,
    maxEmbers: 3,
    gearSpeed: 1,
    emberWalkSpeed: 0.5,
    emberClimbSpeed: 0.5,
    bonusStart: 5000,
  },
  {
    gearEvery: 120,
    firstGear: 90,
    emberEvery: 600,
    firstEmber: 300,
    maxEmbers: 2,
    gearSpeed: 1,
    emberWalkSpeed: 0.5,
    emberClimbSpeed: 0.5,
    bonusStart: 5000,
  },
  {
    gearEvery: Infinity,
    firstGear: Infinity,
    emberEvery: 300,
    firstEmber: 120,
    maxEmbers: 4,
    gearSpeed: 1,
    emberWalkSpeed: 0.5,
    emberClimbSpeed: 0.5,
    bonusStart: 5000,
  },
];

/** The bonus drops by `bonusStep` every `bonusTicks`; at 0 the monkey loses a life. */
export const bonusStep = 100;
export const bonusTicks = 120;

/** Each loop after the first multiplies the ticks between hazards by this (sent more often)... */
export const loopSpawnFactor = 0.8;
/** ...and their speeds by this (faster)... */
export const loopSpeedFactor = 1.2;
/** ...but hazards never come more often than every `minSpawnEvery` ticks. */
export const minSpawnEvery = 60;
/** As in Donkey Kong, each loop adds this to the bonus the floor starts with, up to `maxBonusStart`. */
export const loopBonusRise = 1000;
export const maxBonusStart = 8000;
/** Hazards speed up only so far: an ember always walks and climbs slower than the monkey, so it can be outrun. */
export const maxGearSpeed = 2;
export const maxEmberWalkSpeed = 0.9 * walkSpeed;
export const maxEmberClimbSpeed = 0.9 * climbSpeed;

/** `floor`'s tuning on loop `loop` (0 the first time through). */
export function tuningFor(floor: number, loop: number): FloorTuning {
  const base = floorTunings[floor];
  if (base === undefined) throw new Error(`no tuning for floor ${floor}`);
  const spawn = (n: number): number => Math.max(minSpawnEvery, Math.round(n * loopSpawnFactor ** loop));
  const speed = (n: number, max: number): number => Math.min(max, n * loopSpeedFactor ** loop);
  return {
    ...base,
    gearEvery: spawn(base.gearEvery),
    emberEvery: spawn(base.emberEvery),
    gearSpeed: speed(base.gearSpeed, maxGearSpeed),
    emberWalkSpeed: speed(base.emberWalkSpeed, maxEmberWalkSpeed),
    emberClimbSpeed: speed(base.emberClimbSpeed, maxEmberClimbSpeed),
    bonusStart: Math.min(maxBonusStart, base.bonusStart + loopBonusRise * loop),
  };
}

/** Ticks the monkey lies stunned after losing a life before the floor restarts (or the run ends). */
export const dyingTicks = 90;
/** Ticks the finished floor holds before the next one starts. */
export const clearTicks = 120;
/** Ticks of the escaped scene after the last floor: about 3 s. */
export const escapeTicks = 180;
/** Ticks of the "How high can you get?" screen before each floor: 2.5 s, as its jingle plays out. */
export const howHighTicks = 150;
/** Ticks a new lap shows its number over the first floor. */
export const lapBannerTicks = 120;
/** The Gnome raises its arms this many ticks before a hazard leaves its hands. */
export const throwTicks = 20;
/** Ticks of the intro before the first floor of a run: about 4 s. */
export const introTicks = 240;
/** The intro's first ticks, the Gnome climbing up to its perch. */
export const introClimbTicks = 140;
/** The ticks into the intro when the Gnome lands a stomp; each bends the girders further. */
export const introStomps: readonly number[] = [165, 190, 215];
/** How high each stomp's hop lifts the Gnome, in px. */
export const introHop = 4;
/** Ticks each stomp's hop lasts, up and back down. */
export const introHopTicks = 8;
/** Ticks a stomp shakes the floor. */
export const introShakeTicks = 8;
