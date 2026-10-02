"""Gearhead (Donkey Kong clone) robot monkey. 32x32 frames in the workshop's green palette."""
from pix import *

# All colours come from workshop.png / gnome.png.
K = (30, 58, 41)  # outline (gnome dark)
P = {
    "K": K,
    "S": (48, 93, 66),  # shadow metal
    "M": (77, 128, 97),  # girder green
    "L": (137, 162, 87),  # body metal (gnome body)
    "H": (190, 220, 127),  # face plate / highlight
    "E": (238, 255, 204),  # glow (ladders / text)
}
OFF = {P["E"]: P["S"]}  # antenna bulb / chest light switched off


def g(art):
    return grid(art, P)


ANTENNA = g("""
.EE.
EEEE
.EE.
.LL.
.SS.
""")

HEAD = g("""
.....LLLLLL.....
...LLLLLLLLLL...
..LHLLLLLLLLLL..
.LHLLHHLLHHLLLS.
.LLHHHHHHHHHHLS.
LLHHEEKHHEEKHHLS
LLHHEEKHHEEKHHLS
LLHHHHHHHHHHHHLS
.LLHHHKHHKHHHLS.
.SHHHHHHHHHHHHS.
.SHKHHHHHHHHKHS.
..SHKKKKKKKKHS..
...SSHHHHHHSS...
.....SSSSSS.....
""")

HEAD_LAUGH = g("""
.....LLLLLL.....
...LLLLLLLLLL...
..LHLLLLLLLLLL..
.LHLLHHLLHHLLLS.
.LLHHHHHHHHHHLS.
LLHHKKKHHKKKHHLS
LLHKHHHKKHHHKHLS
LLHHHHHHHHHHHHLS
.LLHHHKHHKHHHLS.
.SHKKKKKKKKKKHS.
.SHKEEEEEEEEKHS.
..SHKSSSSSSKHS..
...SSKKKKKKSS...
.....SSSSSS.....
""")

HEAD_DAZED = g("""
.....LLLLLL.....
...LLLLLLLLLL...
..LHLLLLLLLLLL..
.LHLLHHLLHHLLLS.
.LLHKHKHHKHKHLS.
LLHHHKHHHHKHHHLS
LLHHKHKHHKHKHHLS
LLHHHHHHHHHHHHLS
.LLHHHKHHKHHHLS.
.SHHHHHHHHHHHHS.
.SHHHHKKKKHHHHS.
..SHHKHHHHKHHS..
...SSHHHHHHSS...
.....SSSSSS.....
""")

HEAD_BACK = g("""
.....LLLLLL.....
...LLLLLLLLLL...
..LHLLLLLLLLLL..
.LHLLLLLLLLLLLS.
.LLLLSSSSSSLLLS.
LLLLSMMMMMMSLLLS
LLLLSMEMMEMSLLLS
LLLLSMMMMMMSLLLS
.LLLLSSSSSSLLLS.
.SLLLLLLLLLLLLS.
.SLLLLLLLLLLLLS.
..SLLLLLLLLLLS..
...SSLLLLLLSS...
.....SSSSSS.....
""")

EAR = g("""
.SSSS.
SLHHLS
SHMMHS
SHMMHS
SLHHLS
.SSSS.
""")

TORSO = g("""
..LLLLLLLL..
.LLLLLLLLLS.
LLHHHHHHHHLS
LHHSSSSSSHHS
LHHSEESESHHS
LHHSSSSSSHHS
LLHHHHHHHHSS
.SLLLLLLLLS.
..SSSSSSSS..
""")

TORSO_BACK = g("""
..LLLLLLLL..
.LLLLLLLLLS.
LLLSSSSSSLLS
LLLSMHHMSLLS
LLLSMHHMSLLS
LLLSSSSSSLLS
LLLLLLLLLLSS
.SLLLLLLLLS.
..SSSSSSSS..
""")

ARM = g("""
.LLL.
LHLLS
.SLS.
.LHL.
.SLS.
.LHL.
.SLS.
.LHL.
LLLLL
LHHLS
LLLLS
.SSS.
""")
ARM_UP = g("""
LLLLL......
LHHLS......
LLLLS......
.SSS.......
.LHL.......
.SLS.......
.LHL.......
.SLS.......
.LHLSLSLSL.
.SLLHLHLHLL
..SSSSSSSSS
""")

ARM_CHEST = g("""
.LLL......
LHLLS.....
.SLS......
.LHL......
.SLS.LLLL.
.LHLSLHHLS
.SLLLLHHLS
..SSSLLLLS
.....SSSS.
""")

ARM_OUT = g("""
LLLL........
LHHLSLSLSLL.
LHHLHLHLHLLS
LLLLSSSSSSS.
.SSS........
""")

LEG = g("""
.SLS.
.LHL.
.SLS.
LLLLL
LHHLS
SSSSS
""")

TAIL = g("""
..LLL.
.L...L
.L..LL
..LL..
.L....
L.....
""")

GEAR = g("""
......SS......
...SS.LL.SS...
...LLLLLLLL...
..LLHHHHHHLL..
.SLHHLLLLHHLS.
..LHLLSSLLHL..
SLLHLSKKSLHLLS
SLLHLSKKSLHLLS
..LHLLSSLLHL..
.SLHHLLLLHHLS.
..LLHHHHHHLL..
...LLLLLLLL...
...SS.LL.SS...
......SS......
""")

SPARK = g("""
.E.
EHE
.E.
""")


def put(c, part, x, y):
    layer(c, part, x, y, K)


def frame(head=HEAD, arms=("down", "down"), bob=0, bulb=True, back=False, legs=(0, 0),
          gear=None, sparks=(), tail=True):
    c = Image.new("RGBA", (32, 32), CLEAR)
    y0 = 2 + bob
    if tail and not back:
        put(c, TAIL, 22, 17 + y0)
    if tail and back:
        put(c, flip(TAIL), 4, 17 + y0)
    # legs (independent vertical offsets for walking/climbing)
    put(c, LEG, 10, 23 + y0 - legs[0] - bob)
    put(c, flip(LEG), 17, 23 + y0 - legs[1] - bob)

    def arm(side, pose):
        if pose == "down":
            part = ARM if side == "l" else flip(ARM)
            put(c, part, 5 if side == "l" else 22, 15 + y0)
        elif pose == "up":
            part = ARM_UP if side == "l" else flip(ARM_UP)
            put(c, part, 0 if side == "l" else 21, 6 + y0)
        elif pose == "out":
            part = ARM_OUT if side == "l" else flip(ARM_OUT)
            put(c, part, -1 if side == "l" else 21, 15 + y0)
        elif pose == "chest":
            part = ARM_CHEST if side == "l" else flip(ARM_CHEST)
            put(c, part, 5 if side == "l" else 18, 15 + y0)

    put(c, TORSO_BACK if back else TORSO, 10, 15 + y0)
    for side, pose in zip("lr", arms):
        if pose != "up":
            arm(side, pose)
    put(c, EAR, 3, 7 + y0)
    put(c, EAR, 23, 7 + y0)
    for side, pose in zip("lr", arms):
        if pose == "up":
            arm(side, pose)
    put(c, HEAD_BACK if back else head, 8, 2 + y0)
    put(c, ANTENNA, 14, -1 + y0)
    if gear is not None:
        c.alpha_composite(gear_at(0), (gear[0], gear[1] + y0))
    for sx, sy in sparks:
        c.alpha_composite(SPARK, (sx, sy))
    if not bulb:
        c = recolor(c, {P["E"]: P["S"]}) if back else _bulb_off(c, y0)
    return c


def _bulb_off(c, y0):
    # only switch off the antenna bulb, not the eyes
    top = recolor(c.crop((0, 0, 32, 3 + y0)), OFF)
    c.paste(top, (0, 0))
    return c


def frames():
    f = {}
    f["idle_1"] = frame()
    f["idle_2"] = frame(bob=1, bulb=False)
    f["pound_1"] = frame(arms=("up", "chest"))
    f["pound_2"] = frame(arms=("chest", "up"), bob=1)
    f["grab"] = frame(arms=("down", "down"), gear=(16, 14))
    f["hold"] = frame(arms=("chest", "chest"), gear=(9, 12), bob=1)
    f["throw"] = frame(arms=("down", "out"))
    f["laugh"] = frame(arms=("up", "up"), head=HEAD_LAUGH, bob=1, bulb=False)
    f["climb_1"] = frame(arms=("up", "down"), back=True, legs=(0, 2))
    f["climb_2"] = frame(arms=("down", "up"), back=True, legs=(2, 0))
    f["dazed_1"] = frame(head=HEAD_DAZED, sparks=[(3, 1), (26, 3)], bulb=False)
    f["dazed_2"] = frame(head=HEAD_DAZED, sparks=[(6, 3), (23, 0)], bob=1, bulb=False)
    return f


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
