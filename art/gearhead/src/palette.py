"""Gearhead palette: the original workshop greens plus hue-shifted ramps for characters and accents.

Ramps run dark -> light; shadows lean cool/purple, highlights lean warm/yellow.
"""

INK = (26, 18, 30)  # character outline / pupils

WORLD = {  # the original 7 workshop colours, kept for the level
    "bg": (4, 12, 6), "g1": (30, 58, 41), "g2": (48, 93, 66), "g3": (77, 128, 97),
    "g4": (137, 162, 87), "g5": (190, 220, 127), "g6": (238, 255, 204),
}
COPPER = [(74, 36, 40), (128, 62, 46), (188, 104, 60), (228, 150, 84), (250, 204, 132)]
CREAM = [(214, 170, 128), (250, 228, 190)]
STEEL = [(40, 48, 64), (72, 88, 104), (118, 138, 150), (172, 190, 192), (226, 234, 226)]
RED = [(90, 24, 44), (152, 38, 52), (214, 64, 60), (244, 120, 92)]
SKIN = [(140, 82, 70), (206, 132, 102), (242, 186, 148)]
TEAL = [(28, 48, 76), (40, 82, 112), (64, 128, 152), (120, 186, 196)]
AMBER = [(196, 120, 24), (244, 180, 48), (255, 232, 128)]
CYAN = [(40, 150, 200), (110, 220, 255), (220, 250, 255)]
WHITE = (250, 250, 244)

RAMPS = [("world", list(WORLD.values())), ("ink", [INK]), ("copper", COPPER), ("cream", CREAM),
         ("steel", STEEL), ("red", RED), ("skin", SKIN), ("teal", TEAL), ("amber", AMBER),
         ("cyan", CYAN), ("white", [WHITE])]

ALL = [c for _, r in RAMPS for c in r]
