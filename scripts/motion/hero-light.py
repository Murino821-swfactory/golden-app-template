"""T-340 hero light loop — an eclipse: a black orb, a corona whose bright arc walks the rim,
two small black pearls, a light streak crossing. Neutral (grey) light on black: the page tints
it to the palette with mix-blend-mode (color inside, screen onto the page).
Run: blender -b --factory-startup -P scripts/motion/hero-light.py -- --out DIR [--frames 1,49] [--anim] [--res 1080] [--spp 64]
Shipped (T-340): --anim --res 1080 --spp 96 (192 frames, ~0.8 s each on an RTX 2070), then
scripts/motion/encode.sh hero-light DIR 960 960"""
import argparse, math, os, sys
import bpy

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--frames", default="1")
ap.add_argument("--anim", action="store_true"); ap.add_argument("--res", type=int, default=720)
ap.add_argument("--spp", type=int, default=48); ap.add_argument("--fps", type=int, default=24)
ap.add_argument("--seconds", type=float, default=8.0)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

FPS = args.fps; FRAMES = round(FPS * args.seconds); TAU = math.tau
scene = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"

R = 1.55  # orb radius

def mat_black(name, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.004, 0.004, 0.004, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = 0.6; b.inputs["Coat Roughness"].default_value = 0.08
    return m

# orb
bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=128, ring_count=64, location=(0, 0, 0))
orb = bpy.context.object; bpy.ops.object.shade_smooth(); orb.data.materials.append(mat_black("orb", 0.32))

# pearls (they orbit a little in depth, so they pass in front of the corona)
pearls = []
for i, (r, base) in enumerate(((0.21, (1.85, -2.3, -0.95)), (0.12, (-1.95, -3.2, 1.05)))):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=64, ring_count=32, location=base)
    p = bpy.context.object; bpy.ops.object.shade_smooth(); p.data.materials.append(mat_black(f"pearl{i}", 0.18))
    pearls.append((p, base))

# corona: an emissive plane behind the orb; strength = ring(r) * arc(phi - phi0) + faint full ring
bpy.ops.mesh.primitive_plane_add(size=9.0, location=(0, 1.4, 0), rotation=(math.pi / 2, 0, 0))
corona = bpy.context.object
cm = bpy.data.materials.new("corona"); cm.use_nodes = True; nt = cm.node_tree; N = nt.nodes; L = nt.links
for n in list(N): N.remove(n)
out = N.new("ShaderNodeOutputMaterial"); em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord")
sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
def math_node(op, a=None, b=None, va=None, vb=None):
    n = N.new("ShaderNodeMath"); n.operation = op
    if a is not None: L.new(a, n.inputs[0])
    elif va is not None: n.inputs[0].default_value = va
    if b is not None: L.new(b, n.inputs[1])
    elif vb is not None: n.inputs[1].default_value = vb
    return n.outputs[0]
x, y = sep.outputs["X"], sep.outputs["Y"]   # plane local XY = world XZ
r = math_node("SQRT", math_node("ADD", math_node("MULTIPLY", x, x), math_node("MULTIPLY", y, y)))
phi = math_node("ARCTAN2", y, x)
# the orb's silhouette on the plane (perspective): slightly larger than R
RS = R * (13.0 + 1.4) / 13.0
d = math_node("SUBTRACT", r, None, vb=RS)                      # distance outside the rim
outside = math_node("MAXIMUM", d, None, vb=0.0)
ring = math_node("EXPONENT", math_node("MULTIPLY", outside, None, vb=-16.0))       # tight corona
halo = math_node("EXPONENT", math_node("MULTIPLY", outside, None, vb=-3.4))       # wide halo
phi0 = N.new("ShaderNodeValue"); phi0.name = "phi0"
dphi = math_node("SUBTRACT", phi, phi0.outputs[0])
arc = math_node("POWER", math_node("MULTIPLY", math_node("ADD", math_node("COSINE", dphi), None, vb=1.0), None, vb=0.5), None, vb=6.0)
arc_wide = math_node("POWER", math_node("MULTIPLY", math_node("ADD", math_node("COSINE", dphi), None, vb=1.0), None, vb=0.5), None, vb=2.0)
lit = math_node("ADD", math_node("MULTIPLY", ring, math_node("ADD", math_node("MULTIPLY", arc, None, vb=5.0), None, vb=0.10)),
                math_node("MULTIPLY", halo, math_node("ADD", math_node("MULTIPLY", arc_wide, None, vb=0.22), None, vb=0.006)))
# fade to true black well inside the square, so the page never sees the video's edge
vig = math_node("MAXIMUM", math_node("SUBTRACT", None, math_node("MULTIPLY", math_node("SUBTRACT", r, None, vb=2.2), None, vb=0.62), va=1.0), None, vb=0.0)
vig = math_node("MINIMUM", vig, None, vb=1.0)
lit = math_node("MULTIPLY", lit, math_node("MULTIPLY", vig, vig))
gain = N.new("ShaderNodeValue"); gain.name = "gain"; gain.outputs[0].default_value = 1.0
L.new(math_node("MULTIPLY", lit, gain.outputs[0]), em.inputs["Strength"])
em.inputs["Color"].default_value = (1, 1, 1, 1)
L.new(em.outputs[0], out.inputs["Surface"]); corona.data.materials.append(cm)
corona.visible_shadow = False

# a rim light behind the orb that follows the arc, so the orb's own edge catches it
bpy.ops.object.light_add(type="AREA", location=(0, 3.2, 0)); rim = bpy.context.object
rim.data.shape = "DISK"; rim.data.size = 1.6; rim.data.energy = 900; rim.visible_camera = False
rim.data.color = (1, 1, 1)
# faint key from the camera side, top, to give the orb a sheen
bpy.ops.object.light_add(type="AREA", location=(-2.5, -9, 6)); key = bpy.context.object
key.data.size = 14; key.data.energy = 8; key.visible_camera = False
key.rotation_euler = (math.radians(57), 0, math.radians(-15))

# streak: a long thin emissive bar, a bright segment travels along it once per loop
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -2.6, 0.1), rotation=(math.pi / 2, math.radians(-14), 0))
streak = bpy.context.object; streak.scale = (4.7, 0.012, 1)
sm = bpy.data.materials.new("streak"); sm.use_nodes = True; st = sm.node_tree; SN = st.nodes; SL = st.links
for n in list(SN): SN.remove(n)
so = SN.new("ShaderNodeOutputMaterial"); se = SN.new("ShaderNodeEmission"); stc = SN.new("ShaderNodeTexCoord"); ssep = SN.new("ShaderNodeSeparateXYZ")
SL.new(stc.outputs["Object"], ssep.inputs[0])
def smath(op, a=None, b=None, va=None, vb=None):
    n = SN.new("ShaderNodeMath"); n.operation = op
    if a is not None: SL.new(a, n.inputs[0])
    elif va is not None: n.inputs[0].default_value = va
    if b is not None: SL.new(b, n.inputs[1])
    elif vb is not None: n.inputs[1].default_value = vb
    return n.outputs[0]
sx = ssep.outputs["X"]; sy = ssep.outputs["Y"]
pos = SN.new("ShaderNodeValue"); pos.name = "pos"
dx = smath("SUBTRACT", sx, pos.outputs[0])
peak = smath("EXPONENT", smath("MULTIPLY", smath("MULTIPLY", dx, dx), None, vb=-60.0))
ends = smath("SUBTRACT", None, smath("POWER", smath("MULTIPLY", sx, None, vb=2.0), None, vb=2.0), va=1.0)   # 1 at centre, 0 at ends
ends = smath("MAXIMUM", ends, None, vb=0.0)
across = smath("EXPONENT", smath("MULTIPLY", smath("MULTIPLY", sy, sy), None, vb=-10.0))
sgain = SN.new("ShaderNodeValue"); sgain.name = "sgain"
sval = smath("MULTIPLY", smath("MULTIPLY", smath("ADD", smath("MULTIPLY", peak, None, vb=30.0), None, vb=0.22), ends), smath("MULTIPLY", across, sgain.outputs[0]))
SL.new(sval, se.inputs["Strength"]); SL.new(se.outputs[0], so.inputs["Surface"])
streak.data.materials.append(sm); streak.visible_shadow = False
for o in (streak,):
    o.visible_diffuse = False; o.visible_glossy = True

# camera
bpy.ops.object.camera_add(location=(0, -13, 0), rotation=(math.pi / 2, 0, 0)); cam = bpy.context.object
cam.data.lens = 85; scene.camera = cam

# ---------------------------------------------------------------- motion (all periodic in the loop)
def apply(frame):
    t = (frame - 1) / FRAMES                     # 0..1, frame FRAMES+1 == frame 1
    a = TAU * t
    p0 = math.radians(62) + math.radians(38) * math.sin(a)          # the arc sways around the upper right
    phi0.outputs[0].default_value = p0; phi0.outputs[0].keyframe_insert("default_value", frame=frame)
    gain.outputs[0].default_value = 1.0 + 0.18 * math.sin(2 * a + 0.6); gain.outputs[0].keyframe_insert("default_value", frame=frame)
    rim.location = (2.6 * math.cos(p0), 3.2, 2.6 * math.sin(p0))
    rim.rotation_euler = (math.radians(90) + math.atan2(rim.location.z, 3.2 + 13) * 0.0, 0, 0)
    rim.keyframe_insert("location", frame=frame)
    # the streak's bright segment crosses from right to left in the first 45 % of the loop, then rests dim
    u = min(t / 0.45, 1.0)
    pos.outputs[0].default_value = 0.6 - 1.2 * (0.5 - 0.5 * math.cos(math.pi * u)); pos.outputs[0].keyframe_insert("default_value", frame=frame)
    sgain.outputs[0].default_value = 0.35 + 0.65 * math.sin(math.pi * u); sgain.outputs[0].keyframe_insert("default_value", frame=frame)
    for i, (p, base) in enumerate(pearls):
        ph = a + i * 2.1
        p.location = (base[0] + 0.08 * math.cos(ph), base[1] + 0.25 * math.sin(ph), base[2] + 0.12 * math.sin(ph + 0.8))
        p.keyframe_insert("location", frame=frame)

for f in range(1, FRAMES + 2): apply(f)
# area light faces -Y (towards the camera): rotate so its normal points to the orb
rim.rotation_euler = (math.radians(-90), 0, 0)

# ---------------------------------------------------------------- render
scene.render.fps = FPS; scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.resolution_x = scene.render.resolution_y = args.res; scene.render.resolution_percentage = 100
world = bpy.data.worlds.new("w"); world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1); scene.world = world
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"; prefs.get_devices()
for dv in prefs.devices: dv.use = dv.type == "OPTIX"
scene.cycles.device = "GPU"; scene.cycles.samples = args.spp; scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPTIX"                 # on the GPU: the CPU denoiser made a frame 12x slower
scene.render.compositor_device = "GPU"
scene.cycles.sample_clamp_indirect = 8.0
scene.render.use_persistent_data = True
scene.view_settings.view_transform = "AgX"
ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
rl = ng.nodes.new("CompositorNodeRLayers"); g = ng.nodes.new("CompositorNodeGlare"); go = ng.nodes.new("NodeGroupOutput")
g.inputs["Type"].default_value = "Bloom"; g.inputs["Quality"].default_value = "High"
g.inputs["Threshold"].default_value = 0.8; g.inputs["Strength"].default_value = 0.45; g.inputs["Size"].default_value = 0.55
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
