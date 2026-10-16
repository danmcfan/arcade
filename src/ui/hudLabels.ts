// The HUD's thick labels cut from hud.png, ready to draw (#212).

import { imageHud } from "../engine/assets.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { hudBandHeight, hudLabelHeight, hudLabels, hudLabelWidths } from "./hudArt.ts";

export function hudLabelSprite(name: keyof typeof hudLabels): Sprite {
  const top = hudLabels[name] * hudBandHeight;
  return sub(imageHud, 0, top, hudLabelWidths[name], top + hudLabelHeight);
}
