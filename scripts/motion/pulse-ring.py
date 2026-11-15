"""T-350 loop library — "pulse-ring" (pulzujúci prstenec): concentric rings breathing out of a
bright core across a disc tilted away from the camera, like a radar sweep caught as light. Grey
light on black; the page screens it behind the hero's headline and tints it with the palette.
Seamless loop: the rings travel outward by whole cycles per loop and the core pulses whole turns.
Run: blender -b --factory-startup -P scripts/motion/pulse-ring.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 32]
Encode: scripts/motion/encode.sh pulse-ring DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, Shader, args, reset, camera, key, setup, render

a = args(default_seconds=8.0, w=1280, h=640)
scene = reset()

# a horizontal disc, seen low from the front, so the rings read as an orbit foreshortened to ellipses
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
disc = bpy.context.object; disc.scale = (16.0, 16.0, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mat = bpy.data.materials.new("rings"); mat.use_nodes = True; disc.data.materials.append(mat)
S = Shader(mat)
x, y, _ = S.coords("Object")
r = S.m("SQRT", S.m("ADD", S.m("MULTIPLY", x, x), S.m("MULTIPLY", y, y)))

clock = S.value("clock")        # 0..TAU over the loop
core = S.value("core", 1.0)     # the breathing core brightness

# RINGS travelling outward: 9 whole crests pushed out by the clock; a sharp power makes them thin
RINGS = 9.0
wave = S.m("SINE", S.m("SUBTRACT", S.m("MULTIPLY", r, TAU * RINGS / 15.0), clock.outputs[0]))
ring = S.m("POWER", S.m("MAXIMUM", wave, 0.0), 8.0)   # a sharp power keeps the rings thin, so text over them stays crisp
# rings fade in from the core and out at the rim, so the video's edge is never seen
rise = S.smooth(r, 0.4, 1.6)
fade = S.smooth(r, 14.5, 7.0)
rings = S.m("MULTIPLY", S.m("MULTIPLY", ring, rise), fade)

# the CORE: a small hot point at the centre that breathes
glow = S.m("MULTIPLY", S.smooth(r, 1.4, 0.0), core.outputs[0])
hot = S.m("MULTIPLY", S.smooth(r, 0.5, 0.0), S.m("ADD", core.outputs[0], 0.8))

level = S.m("ADD", S.m("MULTIPLY", rings, 1.9), S.m("ADD", S.m("MULTIPLY", glow, 0.7), S.m("MULTIPLY", hot, 2.1)))
S.emit(level)
disc.visible_shadow = False

cam = camera((0, -11.5, 2.4), (0, 1.2, 0.0), lens=50)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    key(clock, w, f)                                  # one whole push of the rings per loop
    key(core, 0.85 + 0.35 * math.sin(2 * w), f)       # two breaths of the core per loop

setup(scene, a, bloom=(0.75, 0.5, 0.6))
render(scene, a)
