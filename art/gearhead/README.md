# Gearhead art

The robot monkey (hero) is trying to escape the lab; the gnome engineer who built him throws gears to stop him.
Everything uses the existing workshop palette. Run `python3 src/make_gearhead.py` (needs Pillow) to rebuild.

## Sheets (`sheets/`)

| File | Frame size | Layout |
|---|---|---|
| `hero_monkey.png` | 16x16, faces right (flip for left) | 6 cols x 4 rows |
| `gnome_engineer.png` | 32x32 | 4 cols x 3 rows |
| `gear.png` | 16x16 | 4-frame roll loop |
| `props.png` | 16x16 | wrench_up, wrench_down, spark x2, generator x2, bolt, battery, oil can |
| `workshop.png` | 224x256 | drop-in for `internal/assets/images/workshop.png` (same girder/ladder geometry) |

Hero frame indices: 0 stand, 1-4 run, 5 jump, 6-7 climb, 8-9 climb over ledge, 10 land, 11 victory,
12-13 wrench up (walking), 14-15 wrench down (walking), 16 blink, 17 hurt, 18-19 short-circuit,
20-22 death spin, 23 dead.

The wrench is a separate sprite drawn over frames 12-15, offset from the hero frame's top-left:
`wrench_up` at (+8, -6), `wrench_down` at (+11, +6). Mirror the x offset when facing left.

Engineer frame indices: 0-1 idle, 2-3 stomp, 4 grab gear, 5 hold, 6 throw, 7 laugh, 8-9 climb, 10-11 dazed.

`gifs/` has each animation playing, plus `gameplay_mock.gif` (a scripted mockup, not the real game).
