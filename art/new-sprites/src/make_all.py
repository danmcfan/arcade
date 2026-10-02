"""Build game-ready sprite sheets + labelled preview PNGs."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import ImageDraw
from pix import *
import birds
import monkey

REPO = "/home/user/arcade"
IMG = f"{REPO}/internal/assets/images"
OUT = f"{REPO}/art/new-sprites"
os.makedirs(f"{OUT}/sheets", exist_ok=True)

GALAXY = (13, 43, 69)
WORKSHOP = (4, 12, 6)
TEXT = (255, 241, 232)
DIM = (150, 160, 175)

bf = birds.frames()
mf = monkey.frames()
gears = monkey.gear_frames()

BIRD_INFO = [
    ("duck", "Duck", "grunt - fills the bottom rows (Galaga 'bee')"),
    ("swallow", "Swallow", "fast escort - swoops in pairs (Galaga 'butterfly')"),
    ("parrot", "Parrot", "diver - breaks formation to dive-bomb"),
    ("owl", "Owl", "boss - two hits (Boss Galaga)"),
    ("owl_hurt", "Owl (hurt)", "boss after first hit - palette swap"),
]

# ------------------------------------------------------------------ game-ready sheets
# Birds: bug.png layout (6 cols x 4 rows of 16x16, 15 deg steps clockwise from up),
# flap frame A in rows 0-3 and flap frame B in rows 4-7 -> 96x128.
for key, _, _ in BIRD_INFO:
    a, b = bf[key]
    sheet = Image.new("RGBA", (96, 128), CLEAR)
    sheet.alpha_composite(rotation_sheet_outlined(a), (0, 0))
    sheet.alpha_composite(rotation_sheet_outlined(b), (0, 64))
    sheet.save(f"{OUT}/sheets/{key}.png")

MONKEY_ORDER = ["idle_1", "idle_2", "pound_1", "pound_2",
                "grab", "hold", "throw", "laugh",
                "climb_1", "climb_2", "dazed_1", "dazed_2"]
strip([mf[k] for k in MONKEY_ORDER], 4).save(f"{OUT}/sheets/robot_monkey.png")
strip(gears).save(f"{OUT}/sheets/gear.png")


# ------------------------------------------------------------------ helpers
def text(d, xy, s, size=18, color=TEXT, bold=False):
    d.text(xy, s, font=font(size, bold), fill=color)


def frames_of(sheet, fw, fh, n, cols):
    return [sheet.crop(((i % cols) * fw, (i // cols) * fh, (i % cols + 1) * fw, (i // cols + 1) * fh)) for i in range(n)]


def tile(im, scale, bg, pad=0):
    big = upscale(im, scale)
    base = Image.new("RGBA", (big.width + pad * 2, big.height + pad * 2), bg + (255,))
    base.alpha_composite(big, (pad, pad))
    return base


# ------------------------------------------------------------------ birds preview
def birds_preview():
    S = 10  # frame scale
    R = 4  # rotation sheet scale
    W = 1420
    rows_h = 64 * R + 70
    ref_h = 210
    H = 110 + ref_h + rows_h * len(BIRD_INFO) + 20
    img = Image.new("RGBA", (W, H), (24, 26, 34, 255))
    d = ImageDraw.Draw(img)
    text(d, (30, 24), "Firefly (Galaga clone) - bird enemies", 30, bold=True)
    text(d, (30, 66), "16x16 frames, 2-frame wing flap, black outline + Sweet Sam palette. "
                      "Rotation sheets use the same 6x4 / 15-degree layout as bug.png.", 16, DIM)

    # style reference: the bear and bees from Sweet Sam
    y = 110
    text(d, (30, y), "Style reference - Sweet Sam (hive): bear.png & bee.png", 18, DIM)
    bear = Image.open(f"{IMG}/bear.png").convert("RGBA")
    bee = Image.open(f"{IMG}/bee.png").convert("RGBA")
    refs = frames_of(bear, 16, 16, 4, 4)[:1] + frames_of(bear, 16, 16, 16, 4)[8:9]
    refs += [frames_of(bee, 16, 16, 24, 4)[i] for i in (0, 8, 16)]
    x = 30
    for r in refs:
        t = tile(r, 8, (171, 82, 54))
        img.alpha_composite(t, (x, y + 34))
        x += t.width + 14
    x += 30
    for key, _, _ in BIRD_INFO[:4]:
        t = tile(bf[key][0], 8, GALAXY)
        img.alpha_composite(t, (x, y + 34))
        x += t.width + 14
    text(d, (x - 4 * (128 + 14), y + 34 + 132), "new birds at the same scale ->", 14, DIM)

    y += ref_h
    for key, name, role in BIRD_INFO:
        text(d, (30, y), name, 22, bold=True)
        text(d, (30 + 16 * len(name) + 30, y + 5), role, 16, DIM)
        fy = y + 40
        a, b = bf[key]
        ta, tb = tile(a, S, GALAXY), tile(b, S, GALAXY)
        img.alpha_composite(ta, (30, fy))
        img.alpha_composite(tb, (30 + 160 + 16, fy))
        text(d, (30, fy + 166), "flap A", 14, DIM)
        text(d, (30 + 176, fy + 166), "flap B", 14, DIM)
        rot = grid_lines(tile(rotation_sheet_outlined(a), R, GALAXY), 16 * R, 16 * R, (255, 255, 255, 30))
        img.alpha_composite(rot, (420, fy))
        text(d, (420 + rot.width + 16, fy), "rotations (flap A)", 14, DIM)
        text(d, (420 + rot.width + 16, fy + 22), "0 - 345 deg, clockwise", 14, DIM)
        text(d, (420 + rot.width + 16, fy + 44), "from facing up", 14, DIM)
        y += rows_h
    img.save(f"{OUT}/preview_birds.png")


# ------------------------------------------------------------------ birds in a Galaga formation
def birds_scene():
    bg = Image.open(f"{IMG}/galaxy.png").convert("RGBA")
    scene = bg.copy()
    ship = Image.open(f"{IMG}/ship.png").convert("RGBA")
    rows = [("owl", 4, 0), ("parrot", 8, 1), ("swallow", 8, 0), ("duck", 10, 1), ("duck", 10, 0)]
    y = 40
    for key, n, flap in rows:
        x0 = (224 - n * 18) // 2
        for i in range(n):
            k = key
            if key == "owl" and i == 1:
                k = "owl_hurt"
            fr = bf[k][(flap + i) % 2]
            # facing the player = rotated 180
            scene.alpha_composite(fr.rotate(180), (x0 + i * 18, y))
        y += 20
    # a few divers mid-attack at odd angles
    divers = [("parrot", 150, 30), ("swallow", 210, 140), ("swallow", 195, 170)]
    for (key, ang, x), yy in zip(divers, (150, 175, 168)):
        fr = outline(rotsprite(strip_outline(bf[key][0]), ang), (0, 0, 0))
        scene.alpha_composite(fr, (x, yy))
    scene.alpha_composite(ship, (104, 288 - 32))
    out = upscale(scene, 3)
    out.save(f"{OUT}/scene_firefly.png")


# ------------------------------------------------------------------ monkey preview
def monkey_preview():
    S = 7
    cell = 32 * S
    W = 30 + 4 * (cell + 24) + 60
    H = 120 + 3 * (cell + 44) + 230
    img = Image.new("RGBA", (W, H), (24, 26, 34, 255))
    d = ImageDraw.Draw(img)
    text(d, (30, 24), "Gearhead (Donkey Kong clone) - robot monkey", 30, bold=True)
    text(d, (30, 66), "32x32 frames (2x the gnome, like DK vs Jumpman), workshop palette, "
                      "sheet = 4 cols x 3 rows (128x96).", 16, DIM)
    y = 110
    for i, k in enumerate(MONKEY_ORDER):
        c, r = i % 4, i // 4
        x = 30 + c * (cell + 24)
        yy = y + r * (cell + 44)
        img.alpha_composite(tile(mf[k], S, WORKSHOP), (x, yy))
        text(d, (x, yy + cell + 6), f"{i}: {k}", 16, DIM)
    y += 3 * (cell + 44)
    text(d, (30, y), "Gear projectile (the barrel stand-in) - 16x16, 4-frame roll loop", 18, DIM)
    x = 30
    for gimg in gears:
        t = tile(gimg, 10, WORKSHOP)
        img.alpha_composite(t, (x, y + 34))
        x += t.width + 16
    gnome = Image.open(f"{IMG}/gnome.png").convert("RGBA").crop((0, 0, 16, 16))
    x += 40
    text(d, (x, y), "scale check vs gnome", 16, DIM)
    t = tile(Image.new("RGBA", (52, 32), CLEAR), 5, WORKSHOP)
    t.alpha_composite(upscale(mf["idle_1"], 5), (0, 0))
    t.alpha_composite(upscale(gnome, 5), (36 * 5, 16 * 5))
    img.alpha_composite(t, (x, y + 34))
    img.save(f"{OUT}/preview_robot_monkey.png")


def surface_y(bg, x, start):
    px = bg.load()
    for y in range(start, bg.height):
        if px[x, y][:3] == (77, 128, 97):
            return y
    return start


def monkey_scene():
    bg = Image.open(f"{IMG}/workshop.png").convert("RGBA")
    scene = bg.copy()
    top = surface_y(bg, 20, 70)
    scene.alpha_composite(mf["pound_1"], (6, top - 32))
    gy = surface_y(bg, 110, 70)
    scene.alpha_composite(gears[1], (104, gy - 16))
    gy2 = surface_y(bg, 150, 100)
    scene.alpha_composite(gears[3], (144, gy2 - 16))
    gnome = Image.open(f"{IMG}/gnome.png").convert("RGBA").crop((0, 0, 16, 16))
    gb = surface_y(bg, 40, 220)
    scene.alpha_composite(gnome, (32, gb - 16))
    upscale(scene, 3).save(f"{OUT}/scene_gearhead.png")


birds_preview()
birds_scene()
monkey_preview()
monkey_scene()
print("ok")
