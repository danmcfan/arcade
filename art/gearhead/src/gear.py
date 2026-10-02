"""Gear projectile the engineer throws (the barrel stand-in). 16x16."""
from pix import *

K = (30, 58, 41)
P = {"k": K, "S": (48, 93, 66), "M": (77, 128, 97), "L": (137, 162, 87),
     "H": (190, 220, 127), "E": (238, 255, 204)}


def gear_at(theta):
    """A 6-tooth gear drawn directly at angle theta (degrees), so every frame stays crisp."""
    import math
    im = Image.new("RGBA", (16, 16), CLEAR)
    px = im.load()
    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - 8, y + 0.5 - 8
            r = math.hypot(dx, dy)
            phi = (math.degrees(math.atan2(dy, dx)) - theta) % 60
            tooth = 15 <= phi < 45
            if r < 1.6:
                continue  # axle hole
            if r < 2.9:
                c = "S"
            elif r < 4.0:
                c = "H" if dx + dy < 0 else "L"
            elif r < 5.4:
                c = "M" if dx + dy > 4 else "L"
            elif r < 7.1 and tooth:
                c = "M" if dx + dy > 4 else "L"
            else:
                continue
            px[x, y] = P[c] + (255,)
    return outline(im, K)


def gear_frames():
    """Rolling gear projectile, 16x16, 4 frames; 6 teeth => the loop repeats every 60 degrees."""
    return [gear_at(a) for a in (0, 15, 30, 45)]
