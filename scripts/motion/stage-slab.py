"""T-368 scene A "stage" — the device: a dark glass slab standing on the right of the frame, turning slowly as a
light sweeps across its face, a faint grid of LEDs breathing under its glass. The first feature card shows it
(`stage.css` keeps the words on the left). Grey light on black; the page tints it with the palette. Seamless loop.
Run: blender -b --factory-startup -P scripts/motion/stage-slab.py -- --out DIR [--anim] [--w 1280 --h 720] [--spp 64]
Encode: scripts/motion/encode.sh stage-slab DIR 1280 720"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, Shader, args, reset, principled, area, look_at, camera, key, setup, render

a = args(default_seconds=8.0, w=1280, h=720)
scene = reset()

W, H, D, R = 5.6, 3.6, 0.22, 0.32
# the body: a rounded dark metal slab
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); body = bpy.context.object
body.scale = (W, D, H); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
me = body.data; bw = me.attributes.new("bevel_weight_edge", "FLOAT", "EDGE")
for e in me.edges:
    v0, v1 = me.vertices[e.vertices[0]].co, me.vertices[e.vertices[1]].co
    bw.data[e.index].value = 1.0 if (abs(v0.x - v1.x) < 1e-6 and abs(v0.z - v1.z) < 1e-6) else 0.0
m1 = body.modifiers.new("corners", "BEVEL"); m1.limit_method = "WEIGHT"; m1.width = R; m1.segments = 20
m2 = body.modifiers.new("rims", "BEVEL"); m2.limit_method = "ANGLE"; m2.angle_limit = math.radians(50); m2.width = 0.05; m2.segments = 6
bpy.ops.object.shade_smooth()
body.data.materials.append(principled("metal", Base_Color=(0.06, 0.06, 0.06, 1), Metallic=1.0, Roughness=0.3))

# the screen: black glass with a faint LED grid breathing under it
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -D / 2 - 0.003, 0), rotation=(math.pi / 2, 0, 0)); scr = bpy.context.object
scr.scale = (W - 0.3, H - 0.3, 1); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mb = scr.modifiers.new("round", "BEVEL"); mb.affect = "VERTICES"; mb.width = R * 0.7; mb.segments = 12
sm = bpy.data.materials.new("screen"); sm.use_nodes = True; S = Shader(sm)
x, y, _ = S.coords("Object")
CS = 0.11
fx = S.m("FRACT", S.m("DIVIDE", x, CS)); fy = S.m("FRACT", S.m("DIVIDE", y, CS))
sq = S.m("MULTIPLY", S.smooth(S.m("ABSOLUTE", S.m("SUBTRACT", fx, 0.5)), 0.42, 0.34), S.smooth(S.m("ABSOLUTE", S.m("SUBTRACT", fy, 0.5)), 0.42, 0.34))
breath = S.value("breath", 0.02)
px = S.value("px", 0.0); py = S.value("py", 0.0)
dx = S.m("SUBTRACT", x, px.outputs[0]); dy = S.m("SUBTRACT", y, py.outputs[0])
pool = S.m("EXPONENT", S.m("MULTIPLY", S.m("ADD", S.m("MULTIPLY", dx, dx), S.m("MULTIPLY", dy, dy)), -1.6))
lit = S.m("MULTIPLY", sq, S.m("ADD", breath.outputs[0], S.m("MULTIPLY", pool, 0.5)))
# glass over the LEDs: a glossy coat mixed over the emission
gl = S.N.new("ShaderNodeBsdfPrincipled"); gl.inputs["Base Color"].default_value = (0, 0, 0, 1); gl.inputs["Roughness"].default_value = 0.05
gl.inputs["Coat Weight"].default_value = 1.0; gl.inputs["Coat Roughness"].default_value = 0.03
em = S.N.new("ShaderNodeEmission"); S.L.new(lit, em.inputs["Strength"])
add = S.N.new("ShaderNodeAddShader"); S.L.new(gl.outputs[0], add.inputs[0]); S.L.new(em.outputs[0], add.inputs[1])
S.L.new(add.outputs[0], S.out.inputs["Surface"])
scr.data.materials.append(sm); scr.parent = body

# a floor for the reflection
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -H / 2 - 0.02)); floor = bpy.context.object
floor.data.materials.append(principled("floor", Base_Color=(0.012, 0.012, 0.012, 1), Roughness=0.2, Coat_Weight=0.6, Coat_Roughness=0.1))

area("key", (-9, -10, 7), (0, 0, 0), 5, 2200)
area("rim", (7, 7, 3), (0, 0, 0), 1.5, 2600, size_y=9)
sweep = area("sweep", (-8, -9, 1), (0, 0, 0), 0.9, 2400, size_y=9)
camera((2.2, -12.0, 1.1), (1.4, 0, 0.0), lens=55)
body.location = (1.6, 0, 0)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    body.rotation_euler = (math.radians(4) * math.sin(w + 0.7), 0, math.radians(-22) + math.radians(14) * math.sin(w))
    body.location = (1.6, 0, 0.08 * math.sin(w + 1.3))
    body.keyframe_insert("rotation_euler", frame=f); body.keyframe_insert("location", frame=f)
    sweep.location = (-10 + 20 * (0.5 - 0.5 * math.cos(w)), -9, 1 + 2 * math.sin(w)); look_at(sweep, (1.6, 0, 0))
    sweep.keyframe_insert("location", frame=f); sweep.keyframe_insert("rotation_euler", frame=f)
    key(breath, 0.015 + 0.012 * math.sin(2 * w), f)
    key(px, 1.8 * math.cos(w), f); key(py, 0.9 * math.sin(2 * w), f)

setup(scene, a, bloom=(0.9, 0.3, 0.5), clamp=6.0)
render(scene, a)
