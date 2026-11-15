"""T-350 loop library — "orbit-tiles" (sklenené dlaždice na orbite): a ring of glass panels turning
on a slow orbit, a wave of light passing around them so each lights as it swings through the front.
Grey light on black; the page screens it behind the hero's headline and tints it with the palette.
Seamless loop: the ring turns a whole revolution and the light wave runs a whole cycle per loop.
Run: blender -b --factory-startup -P scripts/motion/orbit-tiles.py -- --out DIR [--anim] [--w 1280 --h 640] [--spp 48]
Encode: scripts/motion/encode.sh orbit-tiles DIR 1280 640"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from common import TAU, reset, principled, camera, key, setup, render, args

a = args(default_seconds=8.0, w=1280, h=640)
scene = reset()

COUNT = 18
R = 4.6                       # orbit radius
TW, TD, TH = 1.15, 0.05, 1.7  # tile width, depth, height
WAVES = 2                     # bright crests travelling around the ring per loop

hub = bpy.data.objects.new("hub", None); scene.collection.objects.link(hub)

emits = []   # (tile emission value node, its angle on the ring)
for i in range(COUNT):
    ang = i / COUNT * TAU
    bpy.ops.mesh.primitive_cube_add(size=1, location=(R * math.cos(ang), R * math.sin(ang), 0))
    tile = bpy.context.object; tile.scale = (TW, TD, TH)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tile.rotation_euler = (0, 0, ang + math.pi / 2)   # face tangent to the orbit
    bev = tile.modifiers.new("round", "BEVEL"); bev.width = 0.12; bev.segments = 6; bev.limit_method = "ANGLE"
    bpy.ops.object.shade_smooth()
    mat = principled(f"glass{i}", Base_Color=(0, 0, 0, 1), Roughness=0.12, Coat_Weight=0.4, Coat_Roughness=0.06)
    nt = mat.node_tree; b = nt.nodes["Principled BSDF"]
    val = nt.nodes.new("ShaderNodeValue"); val.name = "emit"
    b.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    nt.links.new(val.outputs[0], b.inputs["Emission Strength"])
    tile.data.materials.append(mat)
    tile.parent = hub
    tile.visible_shadow = False
    emits.append((val, ang))

# the camera gives the orbit its tilt; the ring spins purely about the vertical, so the ellipse
# the camera sees never changes shape over the loop (a tip on the ring itself would precess).
cam = camera((0, -18.0, 9.2), (0, 0, 0.4), lens=48)

for f in range(1, a.n + 2):
    t = (f - 1) / a.n; w = TAU * t
    hub.rotation_euler = (0, 0, w)                      # one whole turn about the vertical axis
    hub.keyframe_insert("rotation_euler", frame=f)
    for val, ang in emits:
        world = ang + w                                 # the tile's angle in the world as the ring turns
        front = 0.5 + 0.5 * math.cos(world)             # the near half of the orbit, facing the camera
        crest = 0.5 + 0.5 * math.sin(WAVES * world - 2 * w)   # bright crests running around the ring
        key(val, 0.03 + 2.6 * crest ** 4 * (0.45 + 0.55 * front), f)

setup(scene, a, bloom=(0.78, 0.45, 0.5), clamp=6.0)
render(scene, a)
