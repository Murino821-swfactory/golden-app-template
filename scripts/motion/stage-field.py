"""T-368 scene A "stage" — the backlight (after apple.com's ProLED XDR local dimming): a board of mini-LEDs seen
at a slight tilt, whole dimming zones lighting up where soft pools of light travel across it, each LED a square
of light with a dark gap. Grey light on black; the page screens it behind the hero's headline and tints it with
the palette. Seamless loop: every pool moves on a closed path with whole turns per loop.
Run: blender -b --factory-startup -P scripts/motion/stage-field.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 32]
Encode: scripts/motion/encode.sh stage-field DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, Shader, args, reset, camera, key, setup, render

a = args(default_seconds=10.0, w=1280, h=640)
scene = reset()

BW, BH = 9.0, 4.5          # board in units (2:1)
CS = 0.1125                # one LED cell (80 x 40 cells)
ZONE = 4                   # a dimming zone is 4 x 4 LEDs

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0), rotation=(math.radians(90 - 22), 0, 0))
board = bpy.context.object; board.scale = (BW, BH, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mat = bpy.data.materials.new("leds"); mat.use_nodes = True; board.data.materials.append(mat)
S = Shader(mat)
x, y, _ = S.coords("Object")

# the LED square: soft-edged, with a 22 % dark gap around it
fx = S.m("FRACT", S.m("DIVIDE", x, CS)); fy = S.m("FRACT", S.m("DIVIDE", y, CS))
ax = S.m("ABSOLUTE", S.m("SUBTRACT", fx, 0.5)); ay = S.m("ABSOLUTE", S.m("SUBTRACT", fy, 0.5))
sq = S.m("MULTIPLY", S.smooth(ax, 0.44, 0.34), S.smooth(ay, 0.44, 0.34))

# the zone centre: where this LED's zone is evaluated — a whole zone shares one level
ZS = CS * ZONE
zx = S.m("MULTIPLY", S.m("ADD", S.m("FLOOR", S.m("DIVIDE", x, ZS)), 0.5), ZS)
zy = S.m("MULTIPLY", S.m("ADD", S.m("FLOOR", S.m("DIVIDE", y, ZS)), 0.5), ZS)

# pools of light: Gaussian blobs on paths keyframed below; the zone sums them
POOLS = [  # (amplitude, sigma): three pools, narrow, so most of the board stays dark
    (1.00, 0.72), (0.62, 0.56), (0.45, 0.46),
]
pool_nodes = []
total = None
for i, (amp, sig) in enumerate(POOLS):
    px = S.value(f"px{i}"); py = S.value(f"py{i}"); pa = S.value(f"pa{i}", amp)
    dx = S.m("SUBTRACT", zx, px.outputs[0]); dy = S.m("SUBTRACT", zy, py.outputs[0])
    d2 = S.m("ADD", S.m("MULTIPLY", dx, dx), S.m("MULTIPLY", dy, dy))
    g = S.m("EXPONENT", S.m("MULTIPLY", d2, -1.0 / (sig * sig)))
    g = S.m("MULTIPLY", g, pa.outputs[0])
    total = g if total is None else S.m("ADD", total, g)
    pool_nodes.append((px, py, pa))

# local dimming has steps: quantise the zone level into 6 steps, keep a little of the smooth value
steps = S.m("DIVIDE", S.m("FLOOR", S.m("MULTIPLY", total, 5.0)), 5.0)
level = S.m("ADD", S.m("MULTIPLY", steps, 0.8), S.m("MULTIPLY", total, 0.2))
# the idle board: every LED barely on, so the grid reads in the dark
level = S.m("ADD", level, 0.009)
# a vignette so the video's edge is never seen
vx = S.smooth(S.m("ABSOLUTE", x), BW * 0.5, BW * 0.24); vy = S.smooth(S.m("ABSOLUTE", y), BH * 0.5, BH * 0.22)
lit = S.m("MULTIPLY", S.m("MULTIPLY", S.m("MULTIPLY", level, sq), vx), vy)
S.emit(S.m("MULTIPLY", lit, 1.7))
board.visible_shadow = False

# a sheet of glass over the board, so the pools reflect a little and the tilt reads as depth
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.08, 0.03), rotation=(math.radians(90 - 22), 0, 0))
glass = bpy.context.object; glass.scale = (BW, BH, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
gm = bpy.data.materials.new("glass"); gm.use_nodes = True
b = gm.node_tree.nodes["Principled BSDF"]
# base colour tints the transmission: black base = black glass (first render was black)
b.inputs["Base Color"].default_value = (1, 1, 1, 1); b.inputs["Roughness"].default_value = 0.08
b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = 1.5
glass.data.materials.append(gm); glass.visible_shadow = False

cam = camera((0, -7.2, 2.4), (0, 0, 0.1), lens=40)

# ---------------------------------------------------------------- motion (closed paths, whole turns per loop)
PATHS = [  # (ax, ay, kx, ky, phase) — Lissajous: whole numbers of turns keep frame n+1 == frame 1
    (3.0, 1.2, 1, 2, 0.0), (2.4, 1.4, 2, 1, 1.7), (3.4, 1.0, 1, 3, 3.1),
]
for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    for (px, py, pa), (amp, sig), (ax_, ay_, kx, ky, ph) in zip(pool_nodes, POOLS, PATHS):
        key(px, ax_ * math.cos(kx * w + ph), f)
        key(py, ay_ * math.sin(ky * w + ph * 0.7), f)
        key(pa, amp * (0.75 + 0.25 * math.sin(w * 2 + ph)), f)

setup(scene, a, bloom=(0.8, 0.4, 0.55))
render(scene, a)
