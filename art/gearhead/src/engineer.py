"""Gearhead villain: the gnome engineer who built Gearhead (Donkey Kong's role). 32x32 frames."""
from pix import *

K = (30, 58, 41)
P = {
    "k": K,
    "S": (48, 93, 66),
    "M": (77, 128, 97),
    "L": (137, 162, 87),
    "H": (190, 220, 127),
    "E": (238, 255, 204),
}


def g(art):
    return grid(art, P)


HAT = g("""
...........MS.
..........MMS.
.........MMMS.
........MMMMS.
.......MMMMSS.
......MMMMMMS.
.....MMLMMMMS.
.....MLMMMMMMS
....MMLMMMMMMS
...MMMMMMMMMMMS
""")

GOGGLES = g("""
SSSSSSSSSSSSSSSS
SkkkkkSSSSkkkkkS
kEEHMMkSSkEEHMMk
kEHMMMkkkkEHMMMk
SkkkkkSSSSkkkkkS
""")

FACE = g("""
.HHHHHHHHHHHH.
.SSSHHHHHHSSS.
.HkkHHHHHHkkH.
HHHHHLLLLHHHHH
.HHHLLHHLLHHH.
..HHHLLLLHHH..
""")

FACE_ANGRY = g("""
.HHHHHHHHHHHH.
.HSSSHHHHSSSH.
.HHkkHHHHkkHH.
HHHHHLLLLHHHHH
.HHHLLHHLLHHH.
..HHHLLLLHHH..
""")

FACE_LAUGH = g("""
.HHHHHHHHHHHH.
.SSSHHHHHHSSS.
.HkHkHHHHkHkH.
HHHHHLLLLHHHHH
.HHHLLHHLLHHH.
..HHHLLLLHHH..
""")

FACE_DAZED = g("""
.HHHHHHHHHHHH.
.HHHHHHHHHHHH.
.kHkHHHHHkHkH.
HHkHHLLLLHkHHH
.kHkLLHHLLkHk.
..HHHLLLLHHH..
""")

BEARD = g("""
EEE..........EEE
EEEEEE....EEEEEE
EEEEEEEkkEEEEEEE
EHEEEEkkkkEEEEHE
.EHEEEEEEEEEEHE.
.EEHEEEEEEEEHEE.
..EEHEEEEEEHEE..
...EEEHEEHEEE...
....EEEEEEEE....
......EEEE......
""")

BEARD_LAUGH = g("""
EEE..........EEE
EEEEEE....EEEEEE
EEEEEkkkkkkEEEEE
EHEEkSSSSSSkEEHE
.EHEEkkkkkkEEHE.
.EEHEEEEEEEEHEE.
..EEHEEEEEEHEE..
...EEEHEEHEEE...
....EEEEEEEE....
......EEEE......
""")

COAT = g("""
...LLLLLLLLLLLL...
..LLLLLLLLLLLLLL..
.LLLLLLLLLLLLLLLL.
.LLLLSSSSSSSSLLLL.
.LLLLSSSSSSSSLLLL.
.LLLLSSSSSSSSLLLL.
.LLLLSSSSSSSSLLLL.
.kkkkkkkkEEkkkkkk.
.LLLLSHSSSSHSLLLL.
.LLLLSSSSSSSSLLLL.
..LLLLLLLLLLLLLL..
""")

COAT_BACK = g("""
...LLLLLLLLLLLL...
..LLLLLLLLLLLLLL..
.LLLLLLLLLLLLLLLL.
.LLLLLLLLLLLLLLLL.
.LLLLLLLLLLLLLLLL.
.LLLLLLLLLLLLLLLL.
.LLLLLLLLLLLLLLLL.
.kkkkkkkkkkkkkkkk.
.LLLLSSLLLLSSLLLL.
.LLLLSSLLLLSSLLLL.
..LLLLLLLLLLLLLL..
""")

HEAD_BACK = g("""
.MMMMMMMMMMMMM.
MMMMMMMMMMMMMMM
SSSSSSSSSSSSSSS
LHHHHHHHHHHHHHL
EEEEEEEEEEEEEEE
EEEEEEEEEEEEEEE
.EEEEEEEEEEEEE.
..EEEEEEEEEEE..
""")

ARM = g("""
.LLL.
LLLLL
LLLLS
.LLS.
.LLS.
.LLS.
MMMMM
MHMMM
MMMMS
.SSS.
""")

ARM_UP = g("""
MMMMM
MHMMM
MMMMS
.SSS.
.LLS.
.LLS.
.LLS.
LLLLS
LLLLL
.LLL.
""")

ARM_CHEST = g("""
.LLL.....
LLLLL....
LLLLS....
.LLS.....
.LLSLLMMM.
..LLLLMHMM
...SSSMMMS
......SSS.
""")

ARM_OUT = g("""
....LLLLLLMMMM
...LLLLLLLMHMMM
...LLLLLLLMMMMS
......SSSSSSSS.
""")

BOOT = g("""
.SS.
.SS.
kkkkk
kSSSk
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
            put(c, ARM if l else flip(ARM), 5 if l else 22, 16 + y)
        elif pose == "up" and not front:
            put(c, ARM_UP if l else flip(ARM_UP), 4 if l else 23, 5 + y)
        elif pose == "chest" and front:
            put(c, ARM_CHEST if l else flip(ARM_CHEST), 5 if l else 18, 16 + y)
        elif pose == "out" and front:
            part = flip(ARM_OUT) if l else ARM_OUT
            put(c, part, -1 if l else 18, 16 + y)

    for s, p in zip("lr", arms):
        arm(s, p, False)
    if gear is not None and not gear_front:
        c.alpha_composite(gear_img(gear[2]), (gear[0], gear[1] + y))
    put(c, COAT_BACK if back else COAT, 7, 16 + y)
    if back:
        put(c, HEAD_BACK, 8, 8 + y)
        put(c, HAT, 9, 0 + y)
    else:
        put(c, face, 9, 10 + y)
        put(c, beard, 8, 15 + y)
        put(c, HAT, 9, 0 + y)
        put(c, GOGGLES, 8, 6 + y)
    for s, p in zip("lr", arms):
        arm(s, p, True)
    if gear is not None and gear_front:
        c.alpha_composite(gear_img(gear[2]), (gear[0], gear[1] + y))
    spark = g("""
.E.
EHE
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
