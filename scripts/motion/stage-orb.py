"""T-368 scene A "stage" — the orb (after apple.com's rising orb): a sphere of light in haze, a bright core and a
soft halo, breathing, over a dark floor that holds its reflection. The page sets it low in the closing band and
lets the scroll lift it. Grey light on black; the page tints it with the palette. Seamless loop.
Run: blender -b --factory-startup -P scripts/motion/stage-orb.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 64]
Encode: scripts/motion/encode.sh stage-orb DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, args, reset, principled, camera, setup, render

a = args(default_seconds=8.0, w=1280, h=640)
scene = reset()
R = 1.5

# haze for the halo
# haze only around the orb: a box the camera is outside of, so the dark stays dark and the halo stays local
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.2)); haze = bpy.context.object; haze.scale = (7, 7, 6)
hm = bpy.data.materials.new("haze"); hm.use_nodes = True; N = hm.node_tree.nodes
for n in list(N): N.remove(n)
vol = N.new("ShaderNodeVolumePrincipled"); out = N.new("ShaderNodeOutputMaterial")
vol.inputs["Density"].default_value = 0.09; vol.inputs["Anisotropy"].default_value = 0.4
hm.node_tree.links.new(vol.outputs["Volume"], out.inputs["Volume"]); haze.data.materials.append(hm); haze.visible_shadow = False

# the orb: emission strongest where the surface faces the camera, soft at the limb
bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=128, ring_count=64, location=(0, 0, 0)); orb = bpy.context.object
bpy.ops.object.shade_smooth()
om = bpy.data.materials.new("orb"); om.use_nodes = True; ON = om.node_tree.nodes; OL = om.node_tree.links
for n in list(ON): ON.remove(n)
lw = ON.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.62
p1 = ON.new("ShaderNodeMath"); p1.operation = "POWER"; p1.inputs[1].default_value = 1.5; OL.new(lw.outputs["Facing"], p1.inputs[0])
mul = ON.new("ShaderNodeMath"); mul.operation = "MULTIPLY_ADD"; OL.new(p1.outputs[0], mul.inputs[0])
gain = ON.new("ShaderNodeValue"); gain.name = "gain"; gain.outputs[0].default_value = 4.2; OL.new(gain.outputs[0], mul.inputs[1]); mul.inputs[2].default_value = 0.25
e = ON.new("ShaderNodeEmission"); OL.new(mul.outputs[0], e.inputs["Strength"]); o = ON.new("ShaderNodeOutputMaterial"); OL.new(e.outputs[0], o.inputs["Surface"])
orb.data.materials.append(om); orb.visible_shadow = False

# the light in it, for the haze and the floor
bpy.ops.object.light_add(type="POINT", location=(0, 0, 0)); core = bpy.context.object
core.data.energy = 520; core.data.shadow_soft_size = R * 0.8; core.visible_camera = False

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -R - 0.9)); floor = bpy.context.object
floor.data.materials.append(principled("floor", Base_Color=(0.02, 0.02, 0.02, 1), Roughness=0.25, Coat_Weight=0.6, Coat_Roughness=0.12))

camera((0, -13, 1.6), (0, 0, -0.35), lens=50)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    b = 1 + 0.14 * math.sin(w) + 0.05 * math.sin(3 * w + 1)
    gain.outputs[0].default_value = 4.2 * b; gain.outputs[0].keyframe_insert("default_value", frame=f)
    core.data.energy = 520 * b; core.data.keyframe_insert("energy", frame=f)
    orb.location = (0.12 * math.sin(w + 0.5), 0, 0.18 * math.sin(w)); orb.keyframe_insert("location", frame=f)
    core.location = orb.location; core.keyframe_insert("location", frame=f)

setup(scene, a, bloom=(0.7, 0.45, 0.7), clamp=10.0)
scene.cycles.volume_step_rate = 1.0; scene.cycles.volume_max_steps = 256
render(scene, a)
