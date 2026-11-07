"""T-368 scene C "glass" — a material study (after framer.com's glass and chrome, apple.com's product renders):
a frosted slab, a chrome ring and a clear sphere drifting either side of the headline, a light orbiting them so
reflections and refractions travel across their surfaces. Grey light on black: the page screens it behind the
hero and tints it with the palette. Seamless loop: every turn is a whole turn per loop.
Run: blender -b --factory-startup -P scripts/motion/glass-objects.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 64]
Encode: scripts/motion/encode.sh glass-objects DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, args, reset, principled, area, camera, setup, render

a = args(default_seconds=10.0, w=1280, h=640)
scene = reset()

# the frosted slab (left): a rounded block of satin glass
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.6, 0.4, 0.2)); slab = bpy.context.object
slab.scale = (1.9, 0.28, 2.7); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bv = slab.modifiers.new("round", "BEVEL"); bv.width = 0.14; bv.segments = 10
bpy.ops.object.shade_smooth()
slab.data.materials.append(principled("frost", Base_Color=(1, 1, 1, 1), Roughness=0.26, Transmission_Weight=1.0, IOR=1.45, Coat_Weight=0.4, Coat_Roughness=0.08))

# the chrome ring (right)
bpy.ops.mesh.primitive_torus_add(major_radius=1.15, minor_radius=0.2, major_segments=96, minor_segments=32, location=(3.9, 0.8, -0.5)); ring = bpy.context.object
bpy.ops.object.shade_smooth()
ring.data.materials.append(principled("chrome", Base_Color=(0.9, 0.9, 0.9, 1), Metallic=1.0, Roughness=0.07))

# the clear sphere (upper right, in front of the ring's orbit)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.78, segments=96, ring_count=48, location=(1.9, -0.9, 1.9)); ball = bpy.context.object
bpy.ops.object.shade_smooth()
ball.data.materials.append(principled("clear", Base_Color=(1, 1, 1, 1), Roughness=0.02, Transmission_Weight=1.0, IOR=1.5))

# a small chrome bead (lower left), a counterweight to the sphere
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, segments=64, ring_count=32, location=(-1.9, -0.6, -1.6)); bead = bpy.context.object
bpy.ops.object.shade_smooth(); bead.data.materials.append(bpy.data.materials["chrome"])

# light: a soft key, a hard rim, and a sweep that orbits the scene once per loop — plus two softboxes the
# glass can refract and the chrome can mirror (invisible to the camera)
area("key", (-7, -9, 8), (0, 0, 0), 6, 1400)
area("rim", (6, 9, 4), (0, 0, 0), 2, 1800, size_y=10)
sweep = area("sweep", (0, -8, 2), (0, 0, 0), 1.2, 1900, size_y=7)
for name, loc, size, strength in (("box1", (-8.5, 7, 3.5), 5, 1.3), ("box2", (10, 4, -5), 8, 0.8), ("box3", (4, 8, 6), 6, 1.6)):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc); box = bpy.context.object
    from common import look_at; look_at(box, (0, 0, 0))
    bm = bpy.data.materials.new(name); bm.use_nodes = True; BN = bm.node_tree.nodes
    for n in list(BN): BN.remove(n)
    e = BN.new("ShaderNodeEmission"); o = BN.new("ShaderNodeOutputMaterial"); e.inputs["Strength"].default_value = strength
    bm.node_tree.links.new(e.outputs[0], o.inputs["Surface"]); box.data.materials.append(bm)
    box.visible_camera = False; box.visible_shadow = False

camera((0, -13.5, 0.4), (0, 0, 0.2), lens=50)

# ---------------------------------------------------------------- motion (whole turns per loop)
SL, RL, BL, BD = slab.location.copy(), ring.location.copy(), ball.location.copy(), bead.location.copy()
for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    slab.rotation_euler = (math.radians(8) * math.sin(w), w, math.radians(-10) + math.radians(6) * math.sin(w + 1))
    slab.location = (SL.x, SL.y, SL.z + 0.25 * math.sin(w + 0.4))
    ring.rotation_euler = (math.radians(62) + math.radians(10) * math.sin(w), math.radians(14) * math.sin(w + 2), w)
    ring.location = (RL.x, RL.y, RL.z + 0.2 * math.sin(w + 2.2))
    ball.location = (BL.x + 0.35 * math.cos(w), BL.y, BL.z + 0.3 * math.sin(w))
    bead.location = (BD.x + 0.2 * math.sin(w + 1), BD.y, BD.z + 0.25 * math.cos(w + 1))
    sweep.location = (8.5 * math.cos(w - TAU / 4), 8.5 * math.sin(w - TAU / 4) - 1, 2 + 1.5 * math.sin(w))
    look_at(sweep, (0, 0, 0))
    for o in (slab, ring, ball, bead, sweep):
        o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)

setup(scene, a, bloom=(1.0, 0.3, 0.5), clamp=6.0)
render(scene, a)
