"""Render a seamless 10-second, 1920x1080 @ 60fps showcase loop of the Gearhead sprites.

Left: a scripted gameplay mockup on the level (4x). Right: big animation cards for the hero
and the engineer, plus a strip of enemies/props. Every cycle length divides 600 frames, and
every moving thing is a pure function of the frame number, so frame 600 == frame 0.
"""
import math
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import ImageDraw
from pix import *
from palette import *
import hero
import engineer
import props
import gear
import level
import pixfont

OUT = sys.argv[1] if len(sys.argv) > 1 else "gearhead_showcase.mp4"
W, H, FPS, N = 1920, 1080, 60, 600

HF = hero.frames()
EF = engineer.frames()
PF = props.frames()
GF = gear.gear_frames()
LVL, SEGS, _ = level.render()
LVL = LVL.convert("RGBA")
GIRDER = level.GIRDER
LADDER = level.LADDER_RUNG

BG = (8, 14, 12)
CARD = (14, 24, 20)
EDGE = (38, 66, 52)
TITLE = AMBER[2]
LABEL = WORLD["g5"]
DIM = (96, 130, 110)


# ------------------------------------------------------------------ level helpers
def support(cx, bottom, tol=4):
    best = None
    for sx, top, w in SEGS:
        if sx <= cx < sx + w and bottom - tol <= top <= bottom + tol:
            if best is None or abs(top - bottom) < abs(best - bottom):
                best = top
    return best


def surface(cx, below):
    best = None
    for sx, top, w in SEGS:
        if sx <= cx < sx + w and top >= below and (best is None or top < best):
            best = top
    return best


GEN_X = 8
FLOOR1 = 228  # anything whose feet are below this is on the bottom floor


def simulate_gear():
    """Path of one thrown gear, frame by frame: (x, y, rot_index, on_floor1)."""
    x, y, d, v = 50.0, 84 - 15.0, 1, 1.0
    falling, vy, dist = False, 0.0, 0.0
    path = []
    while len(path) < 3000:
        cx = int(x) + 8
        if not falling:
            x += d * v
            dist += v
            cx = int(x) + 8
            top = support(cx, y + 15)
            if top is None:
                falling, vy = True, 0.4
            else:
                y = top - 15
        else:
            vy = min(vy + 0.18, 3.5)
            x += d * 0.35
            top = surface(cx, int(y + 15) + 1)
            if top is not None and y + vy + 15 >= top:
                y, falling, d = top - 15, False, -d
            else:
                y += vy
        rot = int(dist / 1.8) % 4
        if d < 0:
            rot = (4 - rot) % 4
        on1 = y + 15 > FLOOR1 and not falling
        path.append((x, y, rot, on1))
        if on1 and d < 0 and x < GEN_X + 10:
            break
        if y > 260:
            break
    return path


PATH = simulate_gear()
LIFE = len(PATH)
CYCLE = 300  # engineer throws every 5 seconds -> twice per loop


def gears_at(t, t0):
    out = []
    for k in range((t - t0 - LIFE) // CYCLE - 1, (t - t0) // CYCLE + 2):
        age = t - (t0 + k * CYCLE)
        if 0 <= age < LIFE:
            out.append(PATH[age])
    return out


def consumed_recently(t, t0, window=14):
    for k in range((t - t0 - LIFE - window) // CYCLE - 1, (t - t0) // CYCLE + 2):
        age = t - (t0 + k * CYCLE) - LIFE
        if 0 <= age < window:
            return True
    return False


# ------------------------------------------------------------------ monkey on the bottom floor
XL, XR = 56, 196
HALF = CYCLE // 2  # 150 frames right, 150 frames left, at 1px/frame (~XR-XL)
JUMP_R, JUMP_H = 15, 17


def monkey_at(t, t0):
    u = t % CYCLE
    if u < HALF:
        x, d = XL + (XR - XL) * u / HALF, 1
    else:
        x, d = XR - (XR - XL) * (u - HALF) / HALF, -1
    ground = surface(int(x) + 8, 236) - 15
    h = 0.0
    for gx, gy, _, on1 in gears_at(t, t0):
        if on1:
            dx = gx - x
            if abs(dx) < JUMP_R:
                h = max(h, JUMP_H * (1 - (dx / JUMP_R) ** 2))
    if h > 0.8:
        frame = "jump"
    else:
        frame = ["run_1", "run_2", "run_3", "run_4"][(t // 5) % 4]
    return x, ground - h, frame, d < 0


def badness(t0):
    """Frames where the scripted monkey would look wrong for this throw offset."""
    bad = 0
    for t in range(N):
        mx, my, _, left = monkey_at(t, t0)
        for gx, gy, _, on1 in gears_at(t, t0):
            if on1 and left and abs(gx - mx) < JUMP_R + 6:
                bad += 1  # running the same way as a gear -> would hover
            if not on1 and abs(gx - mx) < 16 and abs(gy - my) < 16:
                bad += 1  # a falling gear landing on him
    return bad


def pick_t0():
    best = min(range(0, CYCLE, 3), key=lambda t0: (badness(t0), t0))
    return best, badness(best)


# ------------------------------------------------------------------ engineer routine (per 5s)
def engineer_frame(t, t0):
    u = (t - t0) % CYCLE
    if u < 20:
        return "throw"
    if u < 80:
        return "laugh"
    if u < 160:
        return "idle_1" if ((u - 80) // 20) % 2 == 0 else "idle_2"
    if u < 220:
        return "stomp_1" if ((u - 160) // 10) % 2 == 0 else "stomp_2"
    if u < 250:
        return "grab"
    return "hold"


# ------------------------------------------------------------------ scene
def scene(t, t0):
    sc = LVL.copy()
    sc.alpha_composite(EF[engineer_frame(t, t0)], (22, 84 - 32))
    gen = "generator_2" if consumed_recently(t, t0) or (t // 10) % 6 == 0 else "generator_1"
    sc.alpha_composite(PF[gen], (GEN_X, 248 - 15))
    # sparks: one guarding the generator, one patrolling the third floor
    sx = 30 + 6 * math.sin(2 * math.pi * (t % 150) / 150)
    sc.alpha_composite(PF[f"spark_{(t // 5) % 4 + 1}"], (int(sx), surface(int(sx) + 8, 236) - 15))
    sx2 = 112 + 34 * math.sin(2 * math.pi * (t % 300) / 300)
    sc.alpha_composite(PF[f"spark_{(t // 5 + 2) % 4 + 1}"], (int(sx2), surface(int(sx2) + 8, 160) - 15))
    bob = int(round(math.sin(2 * math.pi * (t % 60) / 60)))
    sc.alpha_composite(PF["wrench_up"], (36, surface(44, 170) - 16 + bob))
    sc.alpha_composite(PF["battery"], (150, surface(158, 100) - 16 + bob))
    sc.alpha_composite(PF["oilcan"], (176, surface(184, 150) - 15))
    sc.alpha_composite(PF["bolt"], (96, surface(104, 120) - 16 - bob))
    for gx, gy, rot, _ in gears_at(t, t0):
        sc.alpha_composite(GF[rot], (int(round(gx)), int(round(gy))))
    mx, my, mf, left = monkey_at(t, t0)
    m = flip(HF[mf]) if left else HF[mf]
    sc.alpha_composite(m, (int(round(mx)), int(round(my))))
    return sc


# ------------------------------------------------------------------ hero card timeline
def build_hero_timeline():
    tl = []  # (frame, label, dy, ladder)

    def add(fr, n, label, dy=0, ladder=False):
        tl.extend([(fr, label, dy, ladder)] * n)

    add("stand", 30, "IDLE")
    add("blink", 6, "IDLE")
    add("stand", 20, "IDLE")
    for _ in range(4):
        for f in ("run_1", "run_2", "run_3", "run_4"):
            add(f, 6, "RUN")
    add("stand", 6, "JUMP")
    for i in range(30):
        add("jump", 1, "JUMP", dy=-int(round(14 * math.sin(math.pi * i / 30))))
    add("land", 8, "JUMP")
    add("stand", 6, "JUMP")
    for _ in range(4):
        add("climb_1", 10, "CLIMB", ladder=True)
        add("climb_2", 10, "CLIMB", ladder=True)
    for _ in range(3):
        for f in ("wrench_up_1", "wrench_down_1", "wrench_up_2", "wrench_down_2"):
            add(f, 8, "WRENCH")
    for _ in range(3):
        add("victory", 14, "VICTORY")
        add("stand", 10, "VICTORY")
    for _ in range(3):
        add("dead_zap_1", 6, "SHORT CIRCUIT")
        add("hurt", 6, "SHORT CIRCUIT")
    for _ in range(2):
        for f in ("dead_spin_1", "dead_spin_2", "dead_spin_3", "dead_zap_2"):
            add(f, 6, "SHORT CIRCUIT")
    add("dead", 60, "SHORT CIRCUIT")
    add("stand", N - len(tl), "IDLE")
    assert len(tl) == N, len(tl)
    return tl


def build_engineer_timeline():
    tl = []

    def add(fr, n, label, gear_x=None):
        tl.extend([(fr, label)] * n)

    for _ in range(3):
        add("idle_1", 20, "IDLE")
        add("idle_2", 20, "IDLE")
    for _ in range(5):
        add("stomp_1", 10, "STOMP")
        add("stomp_2", 10, "STOMP")
    add("grab", 45, "GRAB GEAR")
    add("hold", 45, "HOLD")
    add("throw", 40, "THROW")
    for _ in range(3):
        add("laugh", 14, "LAUGH")
        add("idle_2", 6, "LAUGH")
    for _ in range(4):
        add("climb_1", 12, "CLIMB")
        add("climb_2", 12, "CLIMB")
    for _ in range(4):
        add("dazed_1", 10, "DAZED")
        add("dazed_2", 10, "DAZED")
    add("idle_1", N - len(tl), "IDLE")
    assert len(tl) == N, len(tl)
    return tl


HTL = build_hero_timeline()
ETL = build_engineer_timeline()


def floor_strip(w):
    im = Image.new("RGBA", (w, 8), CLEAR)
    for x in range(0, w, 16):
        im.alpha_composite(GIRDER, (x, 0))
    return im


HERO_STAGE = (32, 30)
ENG_STAGE = (48, 42)
PROP_STAGE = (210, 44)
HERO_FLOOR = floor_strip(HERO_STAGE[0])
ENG_FLOOR = floor_strip(ENG_STAGE[0])
PROP_FLOOR = floor_strip(PROP_STAGE[0])


def hero_stage(t):
    fr, label, dy, ladder = HTL[t]
    st = Image.new("RGBA", HERO_STAGE, CARD + (255,))
    if ladder:
        for y in range(0, HERO_STAGE[1] - 8, 4):
            st.alpha_composite(LADDER, (12, y))
    st.alpha_composite(HERO_FLOOR, (0, HERO_STAGE[1] - 8))
    st.alpha_composite(HF[fr], (8, HERO_STAGE[1] - 8 - 15 + dy))
    if fr.startswith("wrench"):
        w = "wrench_up" if "up" in fr else "wrench_down"
        ox, oy = props.WRENCH_OFFSET[w]
        st.alpha_composite(PF[w], (8 + ox, HERO_STAGE[1] - 8 - 15 + dy + oy))
    return st, label


def eng_stage(t):
    fr, label = ETL[t]
    st = Image.new("RGBA", ENG_STAGE, CARD + (255,))
    st.alpha_composite(ENG_FLOOR, (0, ENG_STAGE[1] - 8))
    if fr == "throw":
        k = ETL.index(("throw", "THROW"))
        age = t - k
        st.alpha_composite(GF[(age // 3) % 4], (28 + age // 2, ENG_STAGE[1] - 8 - 15))
    st.alpha_composite(EF[fr], (8, ENG_STAGE[1] - 8 - 31))
    return st, label


SLOTS = [("GEAR", 18), ("SPARK", 48), ("GENERATOR", 80), ("WRENCH", 110), ("BOLT", 138), ("BATTERY", 164),
         ("OIL CAN", 192)]


def prop_stage(t):
    st = Image.new("RGBA", PROP_STAGE, CARD + (255,))
    st.alpha_composite(PROP_FLOOR, (0, PROP_STAGE[1] - 8))
    floor = PROP_STAGE[1] - 8 - 15
    bob = int(round(math.sin(2 * math.pi * (t % 60) / 60)))
    pos = dict(SLOTS)
    st.alpha_composite(GF[(t // 5) % 4], (pos["GEAR"] - 8, floor))
    st.alpha_composite(PF[f"spark_{(t // 5) % 4 + 1}"], (pos["SPARK"] - 8, floor - 3 + bob))
    st.alpha_composite(PF["generator_2" if (t // 10) % 4 == 0 else "generator_1"], (pos["GENERATOR"] - 8, floor))
    st.alpha_composite(PF["wrench_up"], (pos["WRENCH"] - 8, floor - 3 - bob))
    st.alpha_composite(PF["bolt"], (pos["BOLT"] - 8, floor - 3 + bob))
    st.alpha_composite(PF["battery"], (pos["BATTERY"] - 8, floor - 3 - bob))
    st.alpha_composite(PF["oilcan"], (pos["OIL CAN"] - 8, floor))
    return st


# ------------------------------------------------------------------ static chrome
def card(draw, box):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=CARD + (255,))
    draw.rectangle(box, outline=EDGE + (255,), width=4)


def put_text(img, s, xy, color, scale, shadow=None):
    t = pixfont.shadowed(s, color, shadow, scale) if shadow else pixfont.text(s, color, scale)
    img.alpha_composite(t, xy)
    return t.size


SCENE_XY, SCENE_S = (40, 28), 4
HERO_CARD = (980, 176, 1408, 648)
ENG_CARD = (1444, 176, 1880, 648)
PROP_CARD = (980, 680, 1880, 1052)
HERO_S, ENG_S, PROP_S = 12, 8, 4
PROP_Y = 44


def chrome():
    base = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(base)
    d.rectangle((SCENE_XY[0] - 6, SCENE_XY[1] - 6, SCENE_XY[0] + 224 * SCENE_S + 5, SCENE_XY[1] + 256 * SCENE_S + 5),
                outline=EDGE + (255,), width=4)
    put_text(base, "GEARHEAD", (980, 36), TITLE, 10, shadow=COPPER[1])
    put_text(base, "SPRITE SHOWCASE  -  10 SECOND LOOP", (984, 128), DIM, 3)
    for box, role, title in ((HERO_CARD, "HERO", "ROBOT MONKEY"), (ENG_CARD, "VILLAIN", "GNOME ENGINEER"),
                             (PROP_CARD, "", "ENEMIES & PICKUPS")):
        card(d, box)
        put_text(base, title, (box[0] + 22, box[1] + 22), LABEL, 3)
        if role:
            t = pixfont.text(role, DIM, 2)
            base.alpha_composite(t, (box[2] - 22 - t.width, box[1] + 26))
    labels = SLOTS
    sx, sy = PROP_CARD[0] + 30, PROP_CARD[1] + PROP_Y
    for name, cx in labels:
        t = pixfont.text(name, DIM, 2)
        base.alpha_composite(t, (sx + cx * PROP_S - t.width // 2, sy + PROP_STAGE[1] * PROP_S + 20))
    # palette swatches
    px, py = PROP_CARD[0] + 30, PROP_CARD[3] - 66
    put_text(base, "PALETTE", (px, py - 26), DIM, 2)
    sw = (PROP_CARD[2] - 30 - px) // len(ALL)
    for i, c in enumerate(ALL):
        d.rectangle((px + i * sw, py, px + (i + 1) * sw - 3, py + 36), fill=c + (255,))
    return base


def frame(t, t0, base):
    img = base.copy()
    img.alpha_composite(upscale(scene(t, t0), SCENE_S), SCENE_XY)

    hs, hl = hero_stage(t)
    hx = HERO_CARD[0] + (HERO_CARD[2] - HERO_CARD[0] - HERO_STAGE[0] * HERO_S) // 2
    img.alpha_composite(upscale(hs, HERO_S), (hx - hx % 2, HERO_CARD[1] + 64))
    put_text(img, hl, (HERO_CARD[0] + 22, HERO_CARD[3] - 46), TITLE, 3)

    es, el = eng_stage(t)
    ex = ENG_CARD[0] + (ENG_CARD[2] - ENG_CARD[0] - ENG_STAGE[0] * ENG_S) // 2
    img.alpha_composite(upscale(es, ENG_S), (ex - ex % 2, ENG_CARD[1] + 64))
    put_text(img, el, (ENG_CARD[0] + 22, ENG_CARD[3] - 46), TITLE, 3)

    img.alpha_composite(upscale(prop_stage(t), PROP_S), (PROP_CARD[0] + 30, PROP_CARD[1] + PROP_Y))
    return img


if __name__ == "__main__":
    t0, bad = pick_t0()
    print("throw offset", t0, "bad frames", bad, "gear life", LIFE)
    base = chrome()
    if "--stills" in sys.argv:
        for t in (0, 150, 300, 450):
            frame(t, t0, base).convert("RGB").save(f"still_{t:03d}.png")
        sys.exit(0)
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-tune", "animation",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for t in range(N):
        ff.stdin.write(frame(t, t0, base).convert("RGB").tobytes())
    ff.stdin.close()
    ff.wait()
    print("wrote", OUT)
