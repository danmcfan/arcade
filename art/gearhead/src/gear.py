"""Gear projectile the engineer throws (the barrel stand-in). 16x16."""
from pix import *

from palette import *

K = INK
P = {"0": STEEL[0], "1": STEEL[1], "2": STEEL[2], "3": STEEL[3], "4": STEEL[4], "a": AMBER[1], "y": AMBER[0]}


def gear_at(theta):
    """A 6-tooth steel gear with a brass hub, drawn directly at angle theta (degrees) so every
    frame stays crisp. Lit from the top-left."""
    import math
    im = Image.new("RGBA", (16, 16), CLEAR)
    px = im.load()
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - 8, y + 0.5 - 8
            r = math.hypot(dx, dy)
            phi = (math.degrees(math.atan2(dy, dx)) - theta) % 60
            tooth = 15 <= phi < 45
            lit = (-dx - dy) / max(r, 0.01)  # +1 facing the light, -1 away
            if r < 1.5:
                continue  # axle hole
            if r < 2.8:
                c = "a" if lit > -0.3 else "y"
            elif r < 3.6:
                c = "1"
            elif r < 5.6 or (r < 7.2 and tooth):
                edge = r > 4.7
                if edge and lit > 0.45:
                    c = "4"
                elif edge and lit < -0.55:
                    c = "1"
                else:
                    c = "3" if lit > -0.25 else "2"
            else:
                continue
            px[x, y] = P[c] + (255,)
    return outline(im, K)


def gear_frames():
    """Rolling gear projectile, 16x16, 4 frames; 6 teeth => the loop repeats every 60 degrees."""
    return [gear_at(a) for a in (0, 15, 30, 45)]
