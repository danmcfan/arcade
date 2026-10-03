"""Build Gearhead sheets, previews and animated GIFs into art/gearhead/."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import ImageDraw
from pix import *
import hero
import engineer
import props
import gear
import level

REPO = "/home/user/arcade"
IMG = f"{REPO}/internal/assets/images"
OUT = f"{REPO}/art/gearhead"
os.makedirs(f"{OUT}/sheets", exist_ok=True)
os.makedirs(f"{OUT}/gifs", exist_ok=True)

BG = (4, 12, 6)
from palette import RAMPS
PANEL = (24, 26, 34)
TEXT = (255, 241, 232)
DIM = (150, 160, 175)

hf = hero.frames()
ef = engineer.frames()
pf = props.frames()
gf = gear.gear_frames()
lvl, SEGS, LADDERS = level.render()
lvl = lvl.convert("RGBA")

# ------------------------------------------------------------------ sheets
strip([hf[k] for k in hero.ORDER], 6).save(f"{OUT}/sheets/hero_monkey.png")
strip([ef[k] for k in engineer.ORDER], 4).save(f"{OUT}/sheets/gnome_engineer.png")
strip(gf).save(f"{OUT}/sheets/gear.png")
PROP_ORDER = ["wrench_up", "wrench_down", "spark_1", "spark_2", "spark_3", "spark_4", "generator_1", "generator_2",
              "bolt", "battery", "oilcan"]
strip([pf[k] for k in PROP_ORDER]).save(f"{OUT}/sheets/props.png")
lvl.convert("RGB").save(f"{OUT}/sheets/workshop.png")


# ------------------------------------------------------------------ helpers
def text(d, xy, s, size=16, color=TEXT, bold=False):
    d.text(xy, s, font=font(size, bold), fill=color)


def tile(im, scale, bg=BG):
    return on_bg(upscale(im, scale), bg)


def labelled_grid(title, sub, frames, names, cols, scale, path, extra=None):
    fw, fh = frames[0].width * scale, frames[0].height * scale
    gap, lab = 18, 26
    rows = (len(frames) + cols - 1) // cols
    W = max(30 + cols * (fw + gap) + 12, 960)
    H = 100 + rows * (fh + lab + gap) + (extra[1] if extra else 0) + 10
    img = Image.new("RGBA", (W, H), PANEL + (255,))
    d = ImageDraw.Draw(img)
    text(d, (30, 22), title, 28, bold=True)
    text(d, (30, 62), sub, 15, DIM)
    for i, (fr, nm) in enumerate(zip(frames, names)):
        x = 30 + (i % cols) * (fw + gap)
        y = 100 + (i // cols) * (fh + lab + gap)
        img.alpha_composite(tile(fr, scale), (x, y))
        text(d, (x, y + fh + 4), f"{i}: {nm}", 14, DIM)
    if extra:
        extra[0](img, d, 100 + rows * (fh + lab + gap))
    img.save(path)


def save_gif(frames, path, ms, scale):
    out = [on_bg(upscale(f, scale), BG).convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=32) for f in frames]
    out[0].save(path, save_all=True, append_images=out[1:], duration=ms, loop=0, disposal=2)


# ------------------------------------------------------------------ hero preview
def hero_extra(img, d, y):
    text(d, (30, y), "Wrench (the hammer): drawn on top of the wrench_* frames at the offsets below", 15, DIM)
    x = 30
    for fr, w in (("wrench_up_1", "wrench_up"), ("wrench_down_1", "wrench_down")):
        c = Image.new("RGBA", (36, 30), CLEAR)
        ox, oy = props.WRENCH_OFFSET[w]
        c.alpha_composite(hf[fr], (4, 12))
        c.alpha_composite(pf[w], (4 + ox, 12 + oy))
        img.alpha_composite(tile(c, 7), (x, y + 28))
        text(d, (x, y + 28 + 30 * 7 + 4), f"{w} at {props.WRENCH_OFFSET[w]}", 14, DIM)
        x += 36 * 7 + 30


labelled_grid("Gearhead hero - robot monkey (Jumpman's role)",
              "16x16, faces right (flip for left). Sheet 6x4 = 96x64. Copper body, cream face plate, cyan eye.",
              [hf[k] for k in hero.ORDER], hero.ORDER, 6, 9, f"{OUT}/preview_hero.png",
              extra=(hero_extra, 30 * 7 + 70))

labelled_grid("Gearhead villain - gnome engineer (Donkey Kong's role)",
              "32x32, built Gearhead and won't let him escape. Sheet 4x3 = 128x96. Throws gears from the rack.",
              [ef[k] for k in engineer.ORDER], engineer.ORDER, 4, 6, f"{OUT}/preview_engineer.png")

def palette_sheet():
    sw, gap = 48, 6
    rows = len(RAMPS)
    img = Image.new("RGBA", (860, 100 + rows * (sw + gap) + 20), PANEL + (255,))
    d = ImageDraw.Draw(img)
    text(d, (30, 22), "Gearhead palette", 28, bold=True)
    text(d, (30, 62), "Original workshop greens + hue-shifted ramps (shadows cool, highlights warm).", 15, DIM)
    for r, (name, ramp) in enumerate(RAMPS):
        y = 100 + r * (sw + gap)
        text(d, (30, y + 14), name, 16, DIM)
        for i, c in enumerate(ramp):
            d.rectangle((130 + i * (sw + gap), y, 130 + i * (sw + gap) + sw - 1, y + sw - 1), fill=c + (255,))
    img.save(f"{OUT}/preview_palette.png")


palette_sheet()

labelled_grid("Gearhead props",
              "16x16. Gear = barrel, spark + generator = fireball + oil drum, bolt/battery/oil can = Pauline's bonus items.",
              gf + [pf[k] for k in PROP_ORDER], [f"gear_{i}" for i in range(4)] + PROP_ORDER, 7, 8,
              f"{OUT}/preview_props.png")


# ------------------------------------------------------------------ level before / after
def level_compare():
    old = Image.open(f"{IMG}/workshop.png").convert("RGBA")
    s = 3
    W = 30 + 2 * (224 * s + 30)
    img = Image.new("RGBA", (W, 256 * s + 110), PANEL + (255,))
    d = ImageDraw.Draw(img)
    text(d, (30, 22), "Gearhead level - before / after", 28, bold=True)
    text(d, (30, 62), "Same 25m girder + ladder geometry (extracted from workshop.png), same 6-colour palette, "
                      "redrawn as an engineering lab.", 15, DIM)
    img.alpha_composite(upscale(old, s), (30, 100))
    img.alpha_composite(upscale(lvl, s), (30 + 224 * s + 30, 100))
    img.save(f"{OUT}/preview_level.png")


level_compare()


# ------------------------------------------------------------------ in-game mockup + scripted gameplay gif
def surface(x, below):
    """Top of the girder under column x that is at or below y=below."""
    best = None
    for sx, top, w in SEGS:
        if sx <= x < sx + w and top >= below and (best is None or top < best):
            best = top
    return best


GEN_X = 12


def scene_frame(t, gears, monkey, engineer_frame, spark_x):
    sc = lvl.copy()
    # engineer on the top deck, beside the gear rack
    sc.alpha_composite(ef[engineer_frame], (22, 84 - 32))
    # generator + spark on the bottom girder
    sc.alpha_composite(pf["generator_1" if (t // 6) % 2 == 0 else "generator_2"], (GEN_X, 248 - 16))
    sy = surface(spark_x + 8, 240) - 15
    sc.alpha_composite(pf["spark_1" if (t // 4) % 2 == 0 else "spark_2"], (int(spark_x), sy))
    # bonus items + wrench pickup
    sc.alpha_composite(pf["battery"], (150, surface(158, 100) - 16))
    sc.alpha_composite(pf["wrench_up"], (36, surface(44, 170) - 18))
    sc.alpha_composite(pf["oilcan"], (176, surface(184, 150) - 16))
    for gx, gy, gi in gears:
        sc.alpha_composite(gf[gi], (int(gx), int(gy)))
    mx, my, mframe, mflip = monkey
    m = hf[mframe]
    if mflip:
        m = flip(m)
    sc.alpha_composite(m, (int(mx), int(my)))
    return sc


def gameplay_gif():
    frames = []
    # gear A rolls along the top deck after the throw; gear B rolls left on the bottom level at the monkey
    eng_cycle = (["idle_1"] * 8 + ["idle_2"] * 8) * 3 + ["stomp_1"] * 6 + ["stomp_2"] * 6 + ["stomp_1"] * 6 + \
                ["stomp_2"] * 6 + ["grab"] * 12 + ["hold"] * 12 + ["throw"] * 14 + ["laugh"] * 40
    n = len(eng_cycle)
    throw_t = eng_cycle.index("throw")
    ax, ay, adir, a_on = 40.0, 0, 1, False
    bx, bdir = 150.0, -1
    mx = 64.0
    jump_t = None
    run = ["run_1", "run_2", "run_3", "run_4"]
    for t in range(n):
        gears = []
        # gear A: appears at the throw, rolls right along the top girder
        if t >= throw_t:
            if not a_on:
                ax, a_on = 50.0, True
            ax += 1.5
            top = surface(int(ax) + 8, 80)
            if top is not None:
                gears.append((ax, top - 15, (t // 3) % 4))
        # gear B: rolling left along the bottom girder
        bx -= 1.4
        if bx < -16:
            bx = 230
        gears.append((bx, surface(int(bx) + 8, 240) - 15 if 0 <= bx + 8 < 224 else 232, (3 - (t // 3) % 4)))
        # monkey runs right and hops gear B
        mx += 0.9
        if mx > 200:
            mx = 64
        dist = bx - mx
        if jump_t is None and 4 < dist < 16:
            jump_t = t
        ground = surface(int(mx) + 8, 240) - 15
        if jump_t is not None:
            k = t - jump_t
            if k < 20:
                h = 19 * math.sin(math.pi * k / 20)
                mframe = "jump"
                my = ground - h
            else:
                jump_t = None
                mframe = "land"
                my = ground
        else:
            mframe = run[(t // 4) % 4]
            my = ground
        spark_x = 34 + 6 * math.sin(t / 9)
        frames.append(scene_frame(t, gears, (mx, my, mframe, False), eng_cycle[t], spark_x))
    save_gif(frames, f"{OUT}/gifs/gameplay_mock.gif", 33, 2)
    # still mockup for quick viewing
    upscale(frames[throw_t + 30], 3).save(f"{OUT}/scene_gearhead.png")




# ------------------------------------------------------------------ per-animation gifs
ANIMS = {
    "hero_run": (["run_1", "run_2", "run_3", "run_4"], 110),
    "hero_idle": (["stand"] * 8 + ["blink"], 150),
    "hero_jump": (["stand", "jump", "jump", "jump", "land", "stand"], 140),
    "hero_climb": (["climb_1", "climb_2"], 180),
    "hero_climb_top": (["climb_1", "climb_2", "climb_top_2", "climb_top_1", "stand"], 200),
    "hero_victory": (["victory", "stand"], 300),
    "hero_death": (["hurt", "dead_zap_1", "hurt", "dead_zap_1", "dead_spin_1", "dead_spin_2", "dead_spin_3",
                    "stand", "dead_spin_1", "dead_spin_2", "dead_spin_3", "dead", "dead", "dead"], 120),
}
for name, (seq, ms) in ANIMS.items():
    if name == "hero_jump":
        fr = []
        for i, k in enumerate(seq):
            c = Image.new("RGBA", (16, 28), CLEAR)
            lift = [0, 6, 10, 6, 0, 0][i]
            c.alpha_composite(hf[k], (0, 12 - lift))
            fr.append(c)
        save_gif(fr, f"{OUT}/gifs/{name}.gif", ms, 8)
    else:
        save_gif([hf[k] for k in seq], f"{OUT}/gifs/{name}.gif", ms, 8)


def wrench_anim():
    fr = []
    for k, w in [("wrench_up_1", "wrench_up"), ("wrench_down_2", "wrench_down"),
                 ("wrench_up_2", "wrench_up"), ("wrench_down_1", "wrench_down")]:
        c = Image.new("RGBA", (34, 28), CLEAR)
        ox, oy = props.WRENCH_OFFSET[w]
        c.alpha_composite(hf[k], (2, 10))
        c.alpha_composite(pf[w], (2 + ox, 10 + oy))
        fr.append(c)
    save_gif(fr, f"{OUT}/gifs/hero_wrench.gif", 140, 8)


wrench_anim()
save_gif([ef[k] for k in ["idle_1", "idle_2"] * 2 + ["stomp_1", "stomp_2"] * 3 + ["grab", "hold", "throw", "laugh", "laugh"]],
         f"{OUT}/gifs/engineer_routine.gif", 220, 6)
save_gif([ef[k] for k in ["dazed_1", "dazed_2"]], f"{OUT}/gifs/engineer_dazed.gif", 200, 6)
save_gif(gf, f"{OUT}/gifs/gear_roll.gif", 90, 8)
save_gif([pf[f"spark_{i}"] for i in range(1, 5)], f"{OUT}/gifs/spark.gif", 90, 8)
print("ok")
