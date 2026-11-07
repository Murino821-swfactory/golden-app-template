"""T-368 scene B "beam" — a stage light: one spotlight from above through haze, its cone landing on a dark
glossy floor, dust drifting inside the beam, the whole cone swaying a little. Grey light on black: the page
screens it behind the hero's headline and tints it with the palette. Seamless loop: the sway and every mote
move on closed paths with whole turns per loop.
Run: blender -b --factory-startup -P scripts/motion/beam-cone.py -- --out DIR [--anim] [--w 960 --h 960] [--spp 64]
Encode: scripts/motion/encode.sh beam-cone DIR 960 960"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, args, reset, principled, camera, setup, render

a = args(default_seconds=8.0, w=960, h=960)
scene = reset()
rng = random.Random(368)

TOP, FLOOR, HALF = 6.4, -2.4, math.radians(17)   # the lamp's height, the floor, the cone's half angle

# haze: a box of thin volume the beam scatters in
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, (TOP + FLOOR) / 2)); haze = bpy.context.object
haze.scale = (14, 14, TOP - FLOOR + 1); haze.display_type = "WIRE"
hm = bpy.data.materials.new("haze"); hm.use_nodes = True; N = hm.node_tree.nodes
for n in list(N): N.remove(n)
vol = N.new("ShaderNodeVolumePrincipled"); out = N.new("ShaderNodeOutputMaterial")
vol.inputs["Density"].default_value = 0.07; vol.inputs["Anisotropy"].default_value = 0.55
vol.inputs["Color"].default_value = (1, 1, 1, 1)
hm.node_tree.links.new(vol.outputs["Volume"], out.inputs["Volume"]); haze.data.materials.append(hm)
haze.visible_shadow = False

# the floor: dark, a little glossy, so the pool of light has a faint reflection
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, FLOOR)); floor = bpy.context.object
floor.data.materials.append(principled("floor", Base_Color=(0.03, 0.03, 0.03, 1), Roughness=0.32, Coat_Weight=0.5, Coat_Roughness=0.15))

# the lamp
bpy.ops.object.light_add(type="SPOT", location=(0, 0, TOP)); lamp = bpy.context.object
lamp.data.energy = 3200; lamp.data.spot_size = HALF * 2; lamp.data.spot_blend = 0.45
lamp.data.shadow_soft_size = 0.35; lamp.data.color = (1, 1, 1); lamp.visible_camera = False
lamp.rotation_euler = (0, 0, 0)   # a spot points down its -Z

# dust: tiny lit specks inside the cone, each on its own small loop
motes = []
for i in range(115):
    z = FLOOR + 0.3 + rng.random() ** 0.8 * (TOP - FLOOR - 1.4)
    rmax = (TOP - z) * math.tan(HALF) * 0.9
    r = rmax * math.sqrt(rng.random()); th = rng.random() * TAU
    base = (r * math.cos(th), r * math.sin(th), z)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.009 + 0.016 * rng.random(), location=base)
    m = bpy.context.object
    mat = bpy.data.materials.new(f"mote{i}"); mat.use_nodes = True; MN = mat.node_tree.nodes
    for n in list(MN): MN.remove(n)
    e = MN.new("ShaderNodeEmission"); o = MN.new("ShaderNodeOutputMaterial")
    e.inputs["Strength"].default_value = 0.9 + 2.6 * rng.random(); mat.node_tree.links.new(e.outputs[0], o.inputs["Surface"])
    m.data.materials.append(mat); m.visible_shadow = False
    motes.append((m, base, 0.08 + 0.3 * rng.random(), rng.choice((1, 1, 2)), rng.random() * TAU, 0.05 + 0.2 * rng.random()))

camera((0, -11.5, 0.9), (0, 0, 1.1), lens=50)

# ---------------------------------------------------------------- motion (whole turns per loop)
for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    lamp.rotation_euler = (math.radians(2.6) * math.sin(w), math.radians(2.0) * math.sin(2 * w + 1.3), 0)
    lamp.keyframe_insert("rotation_euler", frame=f)
    for m, base, amp, k, ph, bob in motes:
        m.location = (base[0] + amp * math.cos(k * w + ph), base[1] + amp * 0.6 * math.sin(k * w + ph), base[2] + bob * math.sin(w + ph))
        m.keyframe_insert("location", frame=f)

setup(scene, a, bloom=(0.9, 0.35, 0.6), clamp=6.0)
scene.cycles.volume_step_rate = 1.0; scene.cycles.volume_max_steps = 256
render(scene, a)
