"""Tiny pixel-art toolkit: ASCII grids -> RGBA images, auto outlines, RotSprite rotation, previews."""
import math
from PIL import Image, ImageDraw, ImageFont

CLEAR = (0, 0, 0, 0)


def grid(text, palette, w=None, h=None):
    rows = [r for r in text.strip("\n").split("\n")]
    rows = [r.strip() for r in rows if r.strip()]
    w = w or max(len(r) for r in rows)
    h = h or len(rows)
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in ".":
                continue
            col = palette[c]
            px[x, y] = col if len(col) == 4 else col + (255,)
    return im


def outline(im, color=(0, 0, 0), diagonal=False):
    """Add a 1px outline outside the opaque silhouette (in place on a copy)."""
    color = color + (255,) if len(color) == 3 else color
    out = im.copy()
    src = im.load()
    dst = out.load()
    w, h = im.size
    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diagonal:
        nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in nb:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = color
                    break
    return out


def layer(canvas, part, x, y, outline_color=None, diagonal=False):
    """Composite a part onto canvas, optionally with its own outline (gives internal lines)."""
    if outline_color is not None:
        pad = Image.new("RGBA", (part.width + 2, part.height + 2), CLEAR)
        pad.paste(part, (1, 1))
        part = outline(pad, outline_color, diagonal)
        x, y = x - 1, y - 1
    canvas.alpha_composite(part, (x, y)) if x >= 0 and y >= 0 else _paste_clip(canvas, part, x, y)
    return canvas


def _paste_clip(canvas, part, x, y):
    cx, cy = max(0, -x), max(0, -y)
    part = part.crop((cx, cy, part.width, part.height))
    canvas.alpha_composite(part, (x + cx, y + cy))


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def recolor(im, mapping):
    out = im.copy()
    px = out.load()
    m = {(k if len(k) == 4 else k + (255,)): (v if len(v) == 4 else v + (255,)) for k, v in mapping.items()}
    for y in range(out.height):
        for x in range(out.width):
            if px[x, y] in m:
                px[x, y] = m[px[x, y]]
    return out


# ---------- RotSprite ----------
def _scale2x(im):
    w, h = im.size
    src = im.load()
    out = Image.new("RGBA", (w * 2, h * 2))
    dst = out.load()

    def p(x, y):
        x = min(max(x, 0), w - 1)
        y = min(max(y, 0), h - 1)
        return src[x, y]

    for y in range(h):
        for x in range(w):
            E = src[x, y]
            B, D, F, H = p(x, y - 1), p(x - 1, y), p(x + 1, y), p(x, y + 1)
            if B != H and D != F:
                e0 = D if D == B else E
                e1 = F if B == F else E
                e2 = D if D == H else E
                e3 = F if H == F else E
            else:
                e0 = e1 = e2 = e3 = E
            dst[2 * x, 2 * y] = e0
            dst[2 * x + 1, 2 * y] = e1
            dst[2 * x, 2 * y + 1] = e2
            dst[2 * x + 1, 2 * y + 1] = e3
    return out


def rotsprite(im, degrees_cw):
    """Rotate pixel art clockwise without the mush of nearest-neighbour rotation."""
    if degrees_cw % 90 == 0:
        return im.rotate(-degrees_cw)
    big = _scale2x(_scale2x(_scale2x(im)))  # 8x
    w, h = im.size
    bw, bh = big.size
    src = big.load()
    out = Image.new("RGBA", (w, h), CLEAR)
    dst = out.load()
    a = math.radians(degrees_cw)
    ca, sa = math.cos(a), math.sin(a)
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            # sample the centre of the destination pixel, inverse-rotate into source space
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            sx = ca * dx + sa * dy + cx
            sy = -sa * dx + ca * dy + cy
            bx, by = int(sx * 8), int(sy * 8)
            if 0 <= bx < bw and 0 <= by < bh:
                dst[x, y] = src[bx, by]
    return out


def rotation_sheet(im):
    """Same layout as firefly's bug.png: 6 cols x 4 rows, 15 degree steps clockwise from 'up'."""
    w, h = im.size
    sheet = Image.new("RGBA", (w * 6, h * 4), CLEAR)
    for i in range(24):
        sheet.alpha_composite(rotsprite(im, i * 15), ((i % 6) * w, (i // 6) * h))
    return sheet


def strip(frames, cols=None):
    cols = cols or len(frames)
    w, h = frames[0].size
    rows = math.ceil(len(frames) / cols)
    sheet = Image.new("RGBA", (w * cols, h * rows), CLEAR)
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, ((i % cols) * w, (i // cols) * h))
    return sheet


# ---------- previews ----------
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


def upscale(im, s):
    return im.resize((im.width * s, im.height * s), Image.NEAREST)


def on_bg(im, bg):
    base = Image.new("RGBA", im.size, bg + (255,))
    base.alpha_composite(im)
    return base


def grid_lines(im, cell_w, cell_h, color=(255, 255, 255, 40)):
    over = Image.new("RGBA", im.size, CLEAR)
    d = ImageDraw.Draw(over)
    for x in range(0, im.width + 1, cell_w):
        d.line([(x, 0), (x, im.height)], fill=color)
    for y in range(0, im.height + 1, cell_h):
        d.line([(0, y), (im.width, y)], fill=color)
    out = im.copy()
    out.alpha_composite(over)
    return out


def strip_outline(im, color=(0, 0, 0)):
    """Remove the exterior outline (outline pixels touching the outside), keeping interior lines."""
    color = color + (255,) if len(color) == 3 else color
    w, h = im.size
    px = im.load()
    outside = set()
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    stack = [p for p in stack if px[p][3] == 0]
    while stack:
        p = stack.pop()
        if p in outside:
            continue
        outside.add(p)
        x, y = p
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0 and (nx, ny) not in outside:
                stack.append((nx, ny))
    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] != color:
                continue
            nbs = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if any(not (0 <= a < w and 0 <= b < h) or (a, b) in outside for a, b in nbs):
                opx[x, y] = CLEAR
    return out


def rotation_sheet_outlined(im, color=(0, 0, 0)):
    """rotation_sheet, but the outer outline is rebuilt after each rotation so it never breaks up."""
    fill = strip_outline(im, color)
    w, h = im.size
    sheet = Image.new("RGBA", (w * 6, h * 4), CLEAR)
    for i in range(24):
        r = outline(rotsprite(fill, i * 15), color)
        sheet.alpha_composite(r, ((i % 6) * w, (i // 6) * h))
    return sheet
