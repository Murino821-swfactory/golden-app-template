"""T-350 loop library — "horizon-sweep" (horizont so svetelným prejazdom): a grid floor running to
a bright horizon, the cross-lines flowing toward the camera while a pool of light sweeps along the
horizon. Grey light on black; the page screens it behind the hero's headline and tints it with the
palette. Seamless loop: the floor scrolls by whole cells and the light sweeps a whole cycle per loop.
Run: blender -b --factory-startup -P scripts/motion/horizon-sweep.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 32]
Encode: scripts/motion/encode.sh horizon-sweep DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, Shader, args, reset, camera, key, setup, render

a = args(default_seconds=8.0, w=1280, h=640)
scene = reset()

FAR = 46.0        # how far the floor runs toward the horizon (+y)
NEAR = -6.0       # just behind the camera
WIDE = 34.0       # half-width of the floor
CELL = 2.2        # one grid cell
SCROLL = 6        # whole cells the floor travels per loop (keeps the seam)

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, (FAR + NEAR) / 2, 0))
floor = bpy.context.object; floor.scale = (WIDE * 2, FAR - NEAR, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mat = bpy.data.materials.new("floor"); mat.use_nodes = True; floor.data.materials.append(mat)
S = Shader(mat)
x, y, _ = S.coords("Object")   # object space: x across, y in depth (negative near, positive far)

clock = S.value("clock")       # 0..TAU over the loop
sweep = S.value("sweep", 0.0)  # x of the light pool, keyframed to cross and wrap

# grid lines: a thin bright line at each cell edge, the depth lines flowing toward the camera
def lines(coord, scroll=None):
    c = coord if scroll is None else S.m("ADD", coord, scroll)
    f = S.m("FRACT", S.m("DIVIDE", c, CELL))
    d = S.m("ABSOLUTE", S.m("SUBTRACT", f, 0.5))
    return S.smooth(d, 0.44, 0.5)   # 0 in the cell, 1 on the edge — a thin bright line

flow = S.m("MULTIPLY", clock.outputs[0], SCROLL * CELL / TAU)   # whole cells per loop
grid = S.m("ADD", lines(x), lines(y, flow))

# the floor dims toward the camera and just short of the horizon, so no edge is ever seen
depth = S.smooth(y, NEAR + 2.0, 10.0)                 # fade up out of the near edge
horizon = S.smooth(y, FAR, FAR - 12.0)                # fade down into the horizon line
floor_lit = S.m("MULTIPLY", S.m("MULTIPLY", grid, depth), horizon)

# the horizon line itself: a bright band at the far edge
band = S.m("MULTIPLY", S.smooth(y, FAR - 9.0, FAR - 1.0), 1.0)
# the sweeping pool of light: a Gaussian in x that rides along the horizon, brightening the band and grid
dx = S.m("SUBTRACT", x, sweep.outputs[0])
pool = S.m("EXPONENT", S.m("MULTIPLY", S.m("MULTIPLY", dx, dx), -1.0 / (10.0 * 10.0)))
glow = S.m("MULTIPLY", band, S.m("ADD", 0.3, S.m("MULTIPLY", pool, 1.9)))
floor_lit = S.m("MULTIPLY", floor_lit, S.m("ADD", 0.7, S.m("MULTIPLY", pool, 1.8)))

level = S.m("ADD", S.m("MULTIPLY", floor_lit, 3.4), S.m("MULTIPLY", glow, 1.6))
S.emit(level)
floor.visible_shadow = False

cam = camera((0, NEAR, 4.6), (0, FAR * 0.42, 0.0), lens=34)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    key(clock, w, f)
    # the pool rides a full cosine across and back so frame n+1 returns to frame 1
    key(sweep, WIDE * 0.72 * math.sin(w), f)

setup(scene, a, bloom=(0.7, 0.5, 0.65))
render(scene, a)
