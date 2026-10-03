"""Gearhead level: same 25m layout as workshop.png, redrawn as a tech/engineering lab.

The girder and ladder geometry is extracted from the original workshop.png so any
collision data built against it stays valid; only the art changes.
"""
import math
import random
from pix import *

ORIG = "/home/user/arcade/internal/assets/images/workshop.png"

BG = (4, 12, 6)
P = {
    "k": (30, 58, 41),
    "S": (48, 93, 66),
    "M": (77, 128, 97),
    "L": (137, 162, 87),
    "H": (190, 220, 127),
    "E": (238, 255, 204),
}
from palette import AMBER, INK, RED, CYAN
P.update({"y": AMBER[0], "a": AMBER[1], "A": AMBER[2], "o": INK, "r": RED[2], "c": CYAN[1]})
C = {k: v + (255,) for k, v in P.items()}

GIRDER = grid("""
HHHHHHHHHHHHHHHH
LLLLLLLLLLLLLLLL
SSSSSSSSSSSSSSSS
SMMMSkSakSMMMMMS
SkkSMMMMMMMSkkSS
SSSSSSSSSSSSSSSS
MMMMMMMMMMMMMMMM
kkkkkkkkkkkkkkkk
""", P)

GIRDER_HAZARD = grid("""
HHHHHHHHHHHHHHHH
LLLLLLLLLLLLLLLL
MHMMMMMMMMMMMHMM
aaooaaooaaooaaoo
aooaaooaaooaaooa
ooaaooaaooaaooaa
MMMMMMMMMMMMMMMM
kkkkkkkkkkkkkkkk
""", P)

LADDER_RUNG = grid("""
LkkkkkkM
LHHHHHHM
LSSSSSSM
LkkkkkkM
""", P)

# pipe flange where the escape ladders run off the top of the screen
LADDER_CAP = grid("""
kSSSSSSk
SLLLLLLS
SHLLLLMS
SLLLLLLS
kSSSSSSk
.kLLLLk.
.kLHLMk.
.kLLLLk.
""", P)

FONT3x5 = {
    "E": ["###", "#..", "##.", "#..", "###"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
}


def text3x5(im, s, x, y, col):
    px = im.load()
    for i, ch in enumerate(s):
        for r, row in enumerate(FONT3x5[ch]):
            for c, v in enumerate(row):
                if v == "#":
                    px[x + i * 4 + c, y + r] = col


def extract():
    im = Image.open(ORIG).convert("RGB")
    px = im.load()
    W, H = im.size
    M, S, E = (77, 128, 97), (48, 93, 66), (238, 255, 204)

    def g(x, y):
        return px[x, y] if 0 <= x < W and 0 <= y < H else None

    segs = []
    for x in range(W):
        for t in [y for y in range(H - 7) if g(x, y) == M and g(x, y + 1) == S and g(x, y + 6) == M and g(x, y + 7) == S]:
            for s in segs:
                if s[1] == t and s[0] + s[2] == x:
                    s[2] += 1
                    break
            else:
                segs.append([x, t, 1])
    ladders = []
    for x in range(W - 7):
        y = 0
        while y < H:
            if g(x, y) == E and g(x + 7, y) == E and all(g(x + i, y) != E for i in range(1, 7)):
                y0 = y
                while y < H and g(x, y) == E and g(x + 7, y) == E:
                    y += 1
                if y - y0 >= 3:
                    ladders.append((x, y0, y - 1))
            y += 1
    return im, [tuple(s) for s in segs], ladders


# ------------------------------------------------------------------ background decoration
def cog(im, cx, cy, r, teeth, col, hole_col, theta=0, tooth_len=3, hi=None):
    px = im.load()
    for y in range(int(cy - r - 3), int(cy + r + 4)):
        for x in range(int(cx - r - 3), int(cx + r + 4)):
            if not (0 <= x < im.width and 0 <= y < im.height):
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            a = (math.degrees(math.atan2(dy, dx)) - theta) % (360 / teeth)
            tooth = a < 180 / teeth
            if d < r * 0.35:
                continue
            if d < r * 0.5:
                px[x, y] = hole_col
            elif d < r or (d < r + tooth_len and tooth):
                px[x, y] = hi if (hi and dx + dy < -r * 0.6) else col


def traces(im, rnd, n, avoid):
    """Circuit traces: orthogonal runs with 45-degree bends, ending in pads."""
    d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y = rnd.randrange(8, 216), rnd.randrange(16, 240)
        if any(a[0] <= x <= a[2] and a[1] <= y <= a[3] for a in avoid):
            continue
        pts = [(x, y)]
        horiz = rnd.random() < 0.6
        for _ in range(rnd.randint(2, 3)):
            L = rnd.randint(6, 22)
            if horiz:
                x += L * rnd.choice((-1, 1))
            else:
                y += L * rnd.choice((-1, 1))
            pts.append((x, y))
            s = rnd.randint(2, 5)
            x += s * rnd.choice((-1, 1))
            y += s * rnd.choice((-1, 1))
            pts.append((x, y))
            horiz = not horiz
        d.line(pts, fill=C["k"])
        for (px_, py_) in (pts[0], pts[-1]):
            d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=C["k"])
            d.point((px_, py_), fill=C["S"])


def pipe_v(im, x, y0, y1):
    d = ImageDraw.Draw(im)
    d.rectangle([x, y0, x + 3, y1], fill=C["k"])
    d.line([(x + 1, y0), (x + 1, y1)], fill=C["S"])
    for y in range(y0 + 6, y1, 28):
        d.rectangle([x - 1, y, x + 4, y + 2], fill=C["S"])
        d.line([(x - 1, y), (x + 4, y)], fill=C["M"])


def gear_rack(im, x, y):
    """Stack of spare gears beside the engineer (the barrel pile). 22x32."""
    from gear import gear_at
    d = ImageDraw.Draw(im)
    d.rectangle([x, y, x + 21, y + 31], fill=C["k"])
    d.line([(x, y), (x, y + 31)], fill=C["S"])
    d.line([(x + 21, y), (x + 21, y + 31)], fill=C["S"])
    d.line([(x, y + 16), (x + 21, y + 16)], fill=C["S"])
    im.alpha_composite(gear_at(0), (x + 3, y))
    im.alpha_composite(gear_at(30), (x + 3, y + 16))


def gauge(im, cx, cy):
    d = ImageDraw.Draw(im)
    d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=C["k"], outline=C["S"])
    d.line([(cx, cy), (cx + 3, cy - 3)], fill=C["a"])
    d.point((cx, cy), fill=C["r"])


def exit_door(im, x, y):
    """Escape hatch on the top platform (the Pauline spot). 20x24, bottom at y+23."""
    d = ImageDraw.Draw(im)
    # sign
    d.rectangle([x + 1, y, x + 18, y + 6], fill=C["S"], outline=C["k"])
    text3x5(im, "EXIT", x + 3, y + 1, C["E"])
    # frame + door
    d.rectangle([x, y + 8, x + 19, y + 23], fill=C["k"])
    d.rectangle([x + 1, y + 9, x + 18, y + 23], fill=C["M"])
    d.rectangle([x + 3, y + 11, x + 16, y + 23], fill=C["S"])
    d.line([(x + 9, y + 11), (x + 9, y + 23)], fill=C["k"])
    d.line([(x + 10, y + 11), (x + 10, y + 23)], fill=C["k"])
    # hazard band across the middle
    for i in range(14):
        if (i // 2) % 2 == 0:
            d.point((x + 3 + i, y + 16), fill=C["L"])
            d.point((x + 3 + i, y + 17), fill=C["L"])
    # handles + status light
    d.point((x + 8, y + 19), fill=C["H"])
    d.point((x + 11, y + 19), fill=C["H"])
    d.rectangle([x + 8, y + 12, x + 11, y + 13], fill=C["c"])


def render():
    orig, segs, ladders = extract()
    W, H = orig.size
    im = Image.new("RGBA", (W, H), BG + (255,))
    rnd = random.Random(7)

    # --- deep background (darkest tones only so the play field stays readable)
    for (cx, cy, r, t, th) in [(196, 128, 13, 10, 5), (30, 166, 11, 9, 12), (176, 196, 9, 8, 0),
                               (120, 92, 7, 7, 10), (52, 230, 8, 8, 20), (150, 34, 9, 8, 3)]:
        cog(im, cx, cy, r, t, C["k"], BG + (255,), th)
    traces(im, rnd, 26, avoid=[(170, 36, 216, 60), (0, 0, 224, 10)])
    pipe_v(im, 218, 12, 255)
    pipe_v(im, 2, 92, 255)
    gauge(im, 148, 66)
    gauge(im, 160, 72)

    # --- ladders (behind girders, like the original)
    for x, y0, y1 in ladders:
        for y in range(y0, y1 + 1, 4):
            im.alpha_composite(LADDER_RUNG.crop((0, 0, 8, min(4, y1 + 1 - y))), (x, y))
    for x in (64, 80):
        im.alpha_composite(LADDER_CAP, (x, 24))

    # --- girders
    for x, top, w in segs:
        hazard = (top == 56) or (top == 84 and x < 48)
        tile = GIRDER_HAZARD if hazard else GIRDER
        for tx in range(x, x + w, 16):
            im.alpha_composite(tile.crop((0, 0, min(16, x + w - tx), 8)), (tx, top))

    # --- set dressing on the platforms
    gear_rack(im, 1, 52)
    exit_door(im, 102, 32)

    # --- keep the original HUD (score labels + bonus box)
    for box in [(0, 0, W, 8), (170, 38, 216, 60)]:
        im.paste(orig.crop(box).convert("RGBA"), box[:2])
    return im.convert("RGB"), segs, ladders


if __name__ == "__main__":
    lvl, segs, ladders = render()
    lvl.save("level.png")
    upscale(lvl.convert("RGBA"), 3).save("q_level.png")
