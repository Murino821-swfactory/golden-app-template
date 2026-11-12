"""T-350 loop library — "data-lines" (dátové linky): thin bright rails stacked across the frame,
packets of light running along them left to right, each rail on its own phase and speed, like a
board of data links. Grey light on black; the page screens it behind the hero's headline and tints
it with the palette. Seamless loop: every packet train runs a whole number of cycles per loop.
Run: blender -b --factory-startup -P scripts/motion/data-lines.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 32]
Encode: scripts/motion/encode.sh data-lines DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, Shader, args, reset, camera, key, setup, render

a = args(default_seconds=8.0, w=1280, h=640)
scene = reset()

HALF = 11.0       # half-length of a rail in x
COUNT = 13        # rails stacked in y
GAP = 0.62        # spacing between rails

# one shared material: emission = a faint rail + bright packets travelling along x, phase per rail
m = bpy.data.materials.new("rail"); m.use_nodes = True
S = Shader(m)
oi = S.N.new("ShaderNodeObjectInfo")
tc = S.N.new("ShaderNodeTexCoord"); sep = S.N.new("ShaderNodeSeparateXYZ")
S.L.new(tc.outputs["Object"], sep.inputs[0]); x = sep.outputs["X"]

clock = S.value("clock")        # 0..TAU over the loop
phase = S.m("MULTIPLY", oi.outputs["Random"], TAU)
speed = S.m("ADD", 1.0, S.m("FLOOR", S.m("MULTIPLY", oi.outputs["Random"], 3.0)))   # 1, 2 or 3 whole cycles

# two packet trains per rail, different wavelengths, moving right
def train(wl, k):
    ph = S.m("MULTIPLY", clock.outputs[0], S.m("MULTIPLY", speed, k))
    s = S.m("SINE", S.m("ADD", S.m("SUBTRACT", S.m("MULTIPLY", x, TAU / wl), ph), phase))
    return S.m("POWER", S.m("MAXIMUM", s, 0.0), 9.0)

packets = S.m("ADD", train(7.0, 1.0), S.m("MULTIPLY", train(4.3, 2.0), 0.6))
base = 0.05                                                   # the rail is just visible when idle
# a few rails carry most of the light
weight = S.m("ADD", 0.4, S.m("MULTIPLY", S.m("POWER", oi.outputs["Random"], 2.0), 1.6))
# fade the packets out at both ends so the rail dissolves rather than stops
edge = S.smooth(S.m("ABSOLUTE", x), HALF, HALF - 3.5)
level = S.m("MULTIPLY", S.m("ADD", base, S.m("MULTIPLY", S.m("MULTIPLY", packets, weight), edge)), 2.4)
S.emit(level)

# the rails: thin round bars, stacked, a little jitter in depth so they are not a flat wall
import random
rnd = random.Random(350)
for i in range(COUNT):
    cu = bpy.data.curves.new(f"rail{i}", "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = 0.016; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); sp.points.add(1)
    yy = (i - (COUNT - 1) / 2) * GAP
    zz = -1.0 + 2.0 * rnd.random()
    sp.points[0].co = (-HALF, zz, yy, 1); sp.points[1].co = (HALF, zz, yy, 1)
    ob = bpy.data.objects.new(f"rail{i}", cu); scene.collection.objects.link(ob)
    cu.materials.append(m)

cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = 19.0
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
cam.location = (0, -12, 0.0); cam.rotation_euler = (math.radians(90), 0, 0)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n
    key(clock, TAU * t, f)

setup(scene, a, bloom=(0.72, 0.5, 0.55))
render(scene, a)
