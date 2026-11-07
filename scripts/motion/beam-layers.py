"""T-368 scene B "beam" — the steps: four panes of frosted glass rise one after another out of the dark into
a stack under the stage light, each glowing as it arrives and settling as the next one comes. Not a loop: the
page scrubs it with the scroll (`ScrubClip`), one quarter per step, so the stack is as tall as the step the
reader is on. Grey light on black; the page tints it with the palette.
Run: blender -b --factory-startup -P scripts/motion/beam-layers.py -- --out DIR [--anim] [--w 1280 --h 720] [--spp 64]
Encode: GOP=12 scripts/motion/encode.sh beam-layers DIR 1280 720 0144"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, args, reset, principled, camera, setup, render

a = args(default_seconds=6.0, w=1280, h=720)
scene = reset()
rng = random.Random(3682)
TOP, FLOOR, HALF = 7.0, -2.6, math.radians(19)

# haze and the lamp, as in beam-cone, thinner
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, (TOP + FLOOR) / 2)); haze = bpy.context.object
haze.scale = (16, 16, TOP - FLOOR + 1)
hm = bpy.data.materials.new("haze"); hm.use_nodes = True; N = hm.node_tree.nodes
for n in list(N): N.remove(n)
vol = N.new("ShaderNodeVolumePrincipled"); out = N.new("ShaderNodeOutputMaterial")
vol.inputs["Density"].default_value = 0.045; vol.inputs["Anisotropy"].default_value = 0.5
hm.node_tree.links.new(vol.outputs["Volume"], out.inputs["Volume"]); haze.data.materials.append(hm); haze.visible_shadow = False
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, FLOOR)); floor = bpy.context.object
floor.data.materials.append(principled("floor", Base_Color=(0.03, 0.03, 0.03, 1), Roughness=0.3, Coat_Weight=0.5, Coat_Roughness=0.15))
bpy.ops.object.light_add(type="SPOT", location=(0, 0, TOP)); lamp = bpy.context.object
lamp.data.energy = 3400; lamp.data.spot_size = HALF * 2; lamp.data.spot_blend = 0.5; lamp.data.shadow_soft_size = 0.4; lamp.visible_camera = False

# the panes: frosted glass with a little light of their own, so an edge reads even in the dark
LAYERS = 4
panes = []
for i in range(LAYERS):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); p = bpy.context.object
    p.scale = (5.0, 3.2, 0.14); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bv = p.modifiers.new("round", "BEVEL"); bv.width = 0.07; bv.segments = 6
    bpy.ops.object.shade_smooth()
    m = principled(f"pane{i}", Base_Color=(1, 1, 1, 1), Roughness=0.16, Transmission_Weight=1.0, IOR=1.45, Coat_Weight=0.3)
    glow = m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]; glow.default_value = 0.0
    m.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 1, 1, 1)
    p.data.materials.append(m); panes.append((p, glow))

# a few motes in the beam
motes = []
for i in range(60):
    z = FLOOR + 0.5 + rng.random() * (TOP - FLOOR - 2.0)
    rmax = (TOP - z) * math.tan(HALF) * 0.85; r = rmax * math.sqrt(rng.random()); th = rng.random() * TAU
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.009 + 0.014 * rng.random(), location=(r * math.cos(th), r * math.sin(th), z))
    m = bpy.context.object; mat = bpy.data.materials.new(f"mote{i}"); mat.use_nodes = True; MN = mat.node_tree.nodes
    for n in list(MN): MN.remove(n)
    e = MN.new("ShaderNodeEmission"); o = MN.new("ShaderNodeOutputMaterial"); e.inputs["Strength"].default_value = 0.8 + 2.0 * rng.random()
    mat.node_tree.links.new(e.outputs[0], o.inputs["Surface"]); m.data.materials.append(mat); m.visible_shadow = False
    motes.append((m, m.location.copy(), 0.1 + 0.2 * rng.random(), rng.random() * TAU))

camera((0, -12.5, 3.0), (0, 0, -0.3), lens=50)

REST = [FLOOR + 1.1 + i * 0.62 for i in range(LAYERS)]   # where each pane settles
def ease(u): return 1 - (1 - u) ** 3

for f in range(1, a.n + 1):
    t = (f - 1) / (a.n - 1)
    for i, (p, glow) in enumerate(panes):
        start = i / LAYERS; u = min(1.0, max(0.0, (t - start) / 0.22))
        e = ease(u)
        p.location = (0.0, 0.0, -7.0 + (REST[i] + 7.0) * e)
        p.rotation_euler = (math.radians(-28) * (1 - e), 0, math.radians(14) * (1 - e))
        p.keyframe_insert("location", frame=f); p.keyframe_insert("rotation_euler", frame=f)
        # bright while it travels, settling to a faint glow
        glow.default_value = 0.025 + 0.7 * math.sin(math.pi * u) ** 2 if u < 1 else 0.025
        glow.keyframe_insert("default_value", frame=f)
    for m, base, amp, ph in motes:
        m.location = (base.x + amp * math.cos(TAU * t + ph), base.y + amp * 0.6 * math.sin(TAU * t + ph), base.z + 0.15 * math.sin(TAU * t + ph))
        m.keyframe_insert("location", frame=f)

setup(scene, a, bloom=(0.9, 0.35, 0.6), clamp=6.0)
scene.cycles.volume_step_rate = 1.0; scene.cycles.volume_max_steps = 256
render(scene, a)
