"""Gearhead villain: the gnome engineer who built Gearhead (Donkey Kong's role). 32x32 frames."""
from pix import *

from palette import *

P = {
    "o": INK,
    "1": RED[0], "2": RED[1], "3": RED[2], "4": RED[3],
    "s": STEEL[1], "S": STEEL[2], "Z": STEEL[3],
    "y": AMBER[0], "a": AMBER[1], "A": AMBER[2],
    "e": CYAN[0], "E": CYAN[2],
    "f": SKIN[0], "b": SKIN[1], "c": SKIN[2],
    "V": STEEL[3], "W": STEEL[4], "w": WHITE,
    "T": TEAL[0], "t": TEAL[1], "u": TEAL[2], "U": TEAL[3],
    "n": COPPER[0], "m": COPPER[1], "M": COPPER[2], "h": COPPER[2], "H": COPPER[3],
}
K = INK


def g(art):
    return grid(art, P)


HAT = g("""
............32.
...........332.
..........3321.
.........43321.
........433321.
.......4333221.
......43333221.
.....433333221.
....4333333221.
...43333333322.
..433333333332.
""")

GOGGLES = g("""
.ssssssssssssss.
.yaaay.ss.yaaay.
yaEeeaysSyaEeeay
yaeeeaysSyaeeeay
.yaay......yaay.
""")

FACE = g("""
.bbbbbbbbbbbb.
.WWWbbbbbbWWW.
.bobbbbbbbbob.
fbbbbbccbbbbbf
.fbbbcbbbfbbf.
..fbbbffbbbf..
""")

FACE_ANGRY = g("""
.bbbbbbbbbbbb.
.bWWWbbbbWWWb.
.bboobbbboobb.
fbbbbbccbbbbbf
.fbbbcbbbfbbf.
..fbbbffbbbf..
""")

FACE_LAUGH = g("""
.bbbbbbbbbbbb.
.WWWbbbbbbWWW.
.obobbbbbobob.
fbbbbbccbbbbbf
.fbbbcbbbfbbf.
..fbbbffbbbf..
""")

FACE_DAZED = g("""
.bbbbbbbbbbbb.
.bbbbbbbbbbbb.
.obobbbbbobob.
fbobbbccbbobbf
.obobcbbbobof.
..fbbbffbbbf..
""")

BEARD = g("""
wWW..........WVV
wwWWWW....WWWWVV
wWWWWWWooWWWWWWV
WwWWWWooooWWWWVV
.WwWWVWWWWVWWWV.
.WWwWWVWWVWWWVW.
..WWwWWWWWWWVW..
...WWWVWWVWWV...
....WWWWWWWV....
......WWWV......
""")

BEARD_LAUGH = g("""
wWW..........WVV
wwWWWW....WWWWVV
wWWWWooooooWWWWV
WwWWo1333331oWVV
.WwWWoooooooWWV.
.WWwWWVWWVWWWVW.
..WWwWWWWWWWVW..
...WWWVWWVWWV...
....WWWWWWWV....
......WWWV......
""")

COAT = g("""
...uuuuuuuuuuuu...
..uUuuuuuuuuuutt..
.uUuuummmmmmuuttT.
.uUuummMmmmmnuttT.
.uuuumMmmmmmnuttT.
.uuuummmmmmmnuttT.
.uuuummmmmmmnuttT.
.nnnnnnnnaAnnnnnn.
.uuuummmmyymnuttT.
.tuuummmmmmmnuttT.
..ttttttttttttTT..
""")

COAT_BACK = g("""
...uuuuuuuuuuuu...
..uUuuuuuuuuuutt..
.uUuuuuuuuuuuuttT.
.uUuuuuuuuuuuuttT.
.uuuuuuuuuuuuuttT.
.uuuuuuuuuuuuuttT.
.uuuuuuuuuuuuuttT.
.nnnnnnnnnnnnnnnn.
.uuuuttuuuuttuttT.
.tuuuttuuuuttuttT.
..ttttttttttttTT..
""")

HEAD_BACK = g("""
.3333333333322.
433333333332221
sssssssssssssss
WwWWWWWWWWWWWVV
wWWWWWWWWWWWWVV
WWWWWWWWWWWWWVV
.WWWWWWWWWWWVV.
..WWWWWWWWWVV..
""")

ARM = g("""
.uuu.
uUuut
uuutt
.uut.
.uut.
.uut.
hHHhh
hHhhm
hhhmm
.mmm.
""")

ARM_UP = g("""
.HHh.
hHhhm
hhhmm
hhmmm
.uut.
.uut.
.uut.
uuutt
uUuut
.uuu.
""")

ARM_CHEST = g("""
.uuu.....
uUuut....
uuutt....
.uut.....
.uutuuhHh.
..uuuuhHhm
...tttmhmm
......mmm.
""")

ARM_OUT = g("""
....uuuuuuhHHh
...uUuuuuuhHhhm
...uuuuuuthhhmm
......tttttmmm.
""")

BOOT = g("""
.nm.
.nm.
nmMmm
nmmmn
""")


def put(c, part, x, y):
    layer(c, part, x, y, K)


def gear_img(theta=0):
    from gear import gear_at
    return gear_at(theta)


def frame(face=FACE, beard=BEARD, arms=("down", "down"), bob=0, back=False,
          gear=None, gear_front=True, sparks=(), boots=(0, 0)):
    c = Image.new("RGBA", (32, 32), CLEAR)
    y = bob
    put(c, BOOT, 10, 27 - boots[0])
    put(c, flip(BOOT), 17, 27 - boots[1])

    def arm(side, pose, front):
        l = side == "l"
        if pose == "down" and front:
            put(c, ARM if l else flip(ARM), 5 if l else 22, 17 + y)
        elif pose == "up" and not front:
            put(c, ARM_UP if l else flip(ARM_UP), 4 if l else 23, 7 + y)
        elif pose == "chest" and front:
            put(c, ARM_CHEST if l else flip(ARM_CHEST), 5 if l else 18, 17 + y)
        elif pose == "out" and front:
            part = flip(ARM_OUT) if l else ARM_OUT
            put(c, part, -1 if l else 18, 17 + y)

    for s, p in zip("lr", arms):
        arm(s, p, False)
    if gear is not None and not gear_front:
        c.alpha_composite(gear_img(gear[2]), (gear[0], gear[1] + y))
    put(c, COAT_BACK if back else COAT, 7, 17 + y)
    if back:
        put(c, HEAD_BACK, 8, 10 + y)
        put(c, HAT, 8, 0 + y)
    else:
        put(c, face, 9, 12 + y)
        put(c, beard, 8, 17 + y)
        put(c, HAT, 8, 0 + y)
        put(c, GOGGLES, 8, 8 + y)
    for s, p in zip("lr", arms):
        arm(s, p, True)
    if gear is not None and gear_front:
        c.alpha_composite(gear_img(gear[2]), (gear[0], gear[1] + y))
    spark = g("""
.E.
EeE
.E.
""")
    for sx, sy in sparks:
        c.alpha_composite(spark, (sx, sy))
    return c


def frames():
    f = {}
    f["idle_1"] = frame()
    f["idle_2"] = frame(bob=1)
    f["stomp_1"] = frame(face=FACE_ANGRY, arms=("up", "chest"), boots=(2, 0))
    f["stomp_2"] = frame(face=FACE_ANGRY, arms=("chest", "up"), boots=(0, 2), bob=1)
    f["grab"] = frame(arms=("out", "down"), gear=(-3, 12, 0))
    f["hold"] = frame(arms=("chest", "chest"), gear=(8, 18, 15), bob=1)
    f["throw"] = frame(face=FACE_ANGRY, arms=("down", "out"))
    f["laugh"] = frame(face=FACE_LAUGH, beard=BEARD_LAUGH, arms=("up", "up"), bob=1)
    f["climb_1"] = frame(arms=("up", "down"), back=True, boots=(0, 2))
    f["climb_2"] = frame(arms=("down", "up"), back=True, boots=(2, 0))
    f["dazed_1"] = frame(face=FACE_DAZED, sparks=[(4, 2), (26, 4)])
    f["dazed_2"] = frame(face=FACE_DAZED, sparks=[(7, 4), (24, 1)], bob=1)
    return f


ORDER = ["idle_1", "idle_2", "stomp_1", "stomp_2",
         "grab", "hold", "throw", "laugh",
         "climb_1", "climb_2", "dazed_1", "dazed_2"]
