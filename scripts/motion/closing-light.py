"""T-340 closing light loop — ribbons of light (after the founder's reference: long-exposure
light ribbons sweeping in a wave). Thin emissive curves fanned along one wave; bright pulses
travel along every ribbon, each on its own phase. Neutral light on black: the page tints it.
Run: blender -b --factory-startup -P scripts/motion/closing-light.py -- --out DIR [--frames 1,49] [--anim] [--w 1600 --h 640] [--spp 32]
Shipped (T-340): --anim --w 1600 --h 640 --spp 32, then scripts/motion/encode.sh closing-light DIR 1280 512"""
import argparse, math, os, random, sys
import bpy

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--frames", default="1")
ap.add_argument("--anim", action="store_true"); ap.add_argument("--w", type=int, default=800); ap.add_argument("--h", type=int, default=320)
ap.add_argument("--spp", type=int, default=24); ap.add_argument("--fps", type=int, default=24)
ap.add_argument("--seconds", type=float, default=8.0)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

FPS = args.fps; FRAMES = round(FPS * args.seconds); TAU = math.tau
scene = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
rnd = random.Random(340)

# one material: emission = base + pulses travelling along x, phase per ribbon (Object Info random)
m = bpy.data.materials.new("ribbon"); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
for n in list(N): N.remove(n)
out = N.new("ShaderNodeOutputMaterial"); em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord")
oi = N.new("ShaderNodeObjectInfo"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
def mn(op, a=None, b=None, va=None, vb=None):
    n = N.new("ShaderNodeMath"); n.operation = op
    if a is not None: L.new(a, n.inputs[0])
    elif va is not None: n.inputs[0].default_value = va
    if b is not None: L.new(b, n.inputs[1])
    elif vb is not None: n.inputs[1].default_value = vb
    return n.outputs[0]
x = sep.outputs["X"]
clock = N.new("ShaderNodeValue"); clock.name = "clock"          # 0..TAU over the loop
phase = mn("MULTIPLY", oi.outputs["Random"], None, vb=TAU)
# two pulse trains, wavelength ~ 9 and ~ 5.5 units, moving right; whole cycles per loop keep it seamless
p1 = mn("SINE", mn("ADD", mn("SUBTRACT", mn("MULTIPLY", x, None, vb=TAU / 9.0), clock.outputs[0]), phase))
p2 = mn("SINE", mn("ADD", mn("SUBTRACT", mn("MULTIPLY", x, None, vb=TAU / 5.5), mn("MULTIPLY", clock.outputs[0], None, vb=2.0)), mn("MULTIPLY", phase, None, vb=1.7)))
pulse = mn("ADD", mn("POWER", mn("MAXIMUM", p1, None, vb=0.0), None, vb=7.0), mn("MULTIPLY", mn("POWER", mn("MAXIMUM", p2, None, vb=0.0), None, vb=14.0), None, vb=0.5))
level = mn("ADD", mn("MULTIPLY", oi.outputs["Random"], None, vb=0.5), None, vb=0.5)   # 0.5..1 per ribbon
# fade the ribbons out at both ends of the band
edge = mn("MAXIMUM", mn("SUBTRACT", None, mn("POWER", mn("MULTIPLY", x, None, vb=1 / 8.6), None, vb=4.0), va=1.0), None, vb=0.0)
level2 = mn("POWER", oi.outputs["Random"], None, vb=2.5)   # a few ribbons carry most of the light
strength = mn("MULTIPLY", mn("MULTIPLY", mn("ADD", mn("MULTIPLY", pulse, mn("ADD", mn("MULTIPLY", level2, None, vb=16.0), None, vb=2.0)), None, vb=0.06), level), edge)
L.new(strength, em.inputs["Strength"]); em.inputs["Color"].default_value = (1, 1, 1, 1)
L.new(em.outputs[0], out.inputs["Surface"])

# the ribbons: one wave, fanned in height and depth like a long exposure
COUNT = 34
for i in range(COUNT):
    u = i / (COUNT - 1)
    cu = bpy.data.curves.new(f"rib{i}", "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = 0.004 + 0.012 * rnd.random() ** 2; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); pts = 160; sp.points.add(pts - 1)
    amp = 0.9 + 0.7 * u; off = -1.5 + 3.2 * u + 0.15 * rnd.uniform(-1, 1); dz = -1.2 + 2.4 * rnd.random(); k = 0.34 + 0.06 * u
    for j in range(pts):
        X = -9.5 + 19.0 * j / (pts - 1)
        fan = 0.12 + 0.88 * ((X + 9.5) / 19.0) ** 1.4        # the bundle is tight on the left, fans out to the right
        Y = -0.9 + 0.16 * X + fan * (off + amp * math.sin(k * X + 0.6 + 0.5 * u)) + 0.2 * math.sin(0.8 * X + 2.0 * u)
        sp.points[j].co = (X, dz, Y, 1)
    ob = bpy.data.objects.new(f"rib{i}", cu); scene.collection.objects.link(ob)
    cu.materials.append(m)

cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = 17.2
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam
cam.rotation_euler = (math.radians(90), 0, 0)

def apply(frame):
    t = (frame - 1) / FRAMES
    clock.outputs[0].default_value = TAU * t; clock.outputs[0].keyframe_insert("default_value", frame=frame)
    cam.location = (0.25 * math.sin(TAU * t), -12, 0.12 * math.sin(TAU * t + 1.0)); cam.keyframe_insert("location", frame=frame)
for f in range(1, FRAMES + 2): apply(f)

scene.render.fps = FPS; scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.resolution_x = args.w; scene.render.resolution_y = args.h; scene.render.resolution_percentage = 100
world = bpy.data.worlds.new("w"); world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1); scene.world = world
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"; prefs.get_devices()
for dv in prefs.devices: dv.use = dv.type == "OPTIX"
scene.cycles.device = "GPU"; scene.cycles.samples = args.spp; scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPTIX"                 # on the GPU: the CPU denoiser made a frame 12x slower
scene.render.compositor_device = "GPU"
scene.render.use_persistent_data = True
scene.view_settings.view_transform = "AgX"
ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
rl = ng.nodes.new("CompositorNodeRLayers"); g = ng.nodes.new("CompositorNodeGlare"); go = ng.nodes.new("NodeGroupOutput")
g.inputs["Type"].default_value = "Bloom"; g.inputs["Quality"].default_value = "High"
g.inputs["Threshold"].default_value = 0.7; g.inputs["Strength"].default_value = 0.6; g.inputs["Size"].default_value = 0.6
ng.links.new(rl.outputs["Image"], g.inputs["Image"]); ng.links.new(g.outputs["Image"], go.inputs[0])
scene.compositing_node_group = ng; scene.render.use_compositing = True
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "BW"
os.makedirs(args.out, exist_ok=True)
if args.anim:
    scene.render.filepath = os.path.join(args.out, "f_####"); bpy.ops.render.render(animation=True)
else:
    for f in [int(v) for v in args.frames.split(",") if v]:
        scene.frame_set(f); scene.render.filepath = os.path.join(args.out, f"f_{f:04d}.png"); bpy.ops.render.render(write_still=True)
print("DONE")
