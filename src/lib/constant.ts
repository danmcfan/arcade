import { SpriteSheetID } from "@/lib/sprite";

export const DEBUG = false;

export const SWEET_SAM = false;

export const LEVEL_WIDTH = SWEET_SAM ? 304 : 160;
export const LEVEL_HEIGHT = SWEET_SAM ? 368 : 144;
export const LEVEL_SPRITE_SHEET_ID = SWEET_SAM
  ? SpriteSheetID.HIVE
  : SpriteSheetID.ARCADE;

export const MS_PER_FRAME = 1000 / 60;

export const DISTANCE_THRESHOLD = 0.25;
