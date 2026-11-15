"""Shared helpers for the template's Blender scenes (T-368; after T-349's tw_common.py).
Every scene: `blender -b --factory-startup -P scripts/motion/<name>.py -- --out DIR [--frames 1,49] [--anim]
[--w 1280 --h 640] [--spp 64] [--seconds 8]`. Grey light on black: the page tints the render with the
palette (`editorial.css`, `.editorial-light`), so no colour is encoded here.
GPU setup as measured in T-340: OptiX device + OptiX denoiser + GPU compositor (the CPU defaults were 12x slower)."""
import argparse, math, os, sys
import bpy

TAU = math.tau


def args(default_seconds=8.0, w=1280, h=640):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True); ap.add_argument("--frames", default="1")
    ap.add_argument("--anim", action="store_true"); ap.add_argument("--spp", type=int, default=48)
    ap.add_argument("--w", type=int, default=w); ap.add_argument("--h", type=int, default=h)
    ap.add_argument("--fps", type=int, default=24); ap.add_argument("--seconds", type=float, default=default_seconds)
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    a.n = round(a.fps * a.seconds)
    return a


def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    return bpy.context.scene


def principled(name, **inputs):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in inputs.items(): b.inputs[k.replace("_", " ")].default_value = v
    return m


class Shader:
    """A small builder for node maths: sockets or floats in, a socket out."""

    def __init__(self, material):
        self.nt = material.node_tree; self.N = self.nt.nodes; self.L = self.nt.links
        for n in list(self.N): self.N.remove(n)
        self.out = self.N.new("ShaderNodeOutputMaterial")

    def _in(self, node, i, v):
        if isinstance(v, (int, float)): node.inputs[i].default_value = v
        elif v is not None: self.L.new(v, node.inputs[i])

    def m(self, op, a=None, b=None, c=None):
        n = self.N.new("ShaderNodeMath"); n.operation = op; n.use_clamp = False
        self._in(n, 0, a); self._in(n, 1, b); self._in(n, 2, c)
        return n.outputs[0]

    def smooth(self, v, lo, hi, to_lo=0.0, to_hi=1.0):
        n = self.N.new("ShaderNodeMapRange"); n.interpolation_type = "SMOOTHSTEP"; n.clamp = True
        self._in(n, 0, v); self._in(n, 1, lo); self._in(n, 2, hi); self._in(n, 3, to_lo); self._in(n, 4, to_hi)
        return n.outputs[0]

    def value(self, name, v=0.0):
        n = self.N.new("ShaderNodeValue"); n.name = n.label = name; n.outputs[0].default_value = v
        return n

    def coords(self, kind="Object"):
        tc = self.N.new("ShaderNodeTexCoord"); sep = self.N.new("ShaderNodeSeparateXYZ")
        self.L.new(tc.outputs[kind], sep.inputs[0])
        return sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]

    def emit(self, strength, color=(1, 1, 1, 1)):
        e = self.N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = color
        self._in(e, 1, strength); self.L.new(e.outputs[0], self.out.inputs["Surface"])
        return e


def key(node, v, frame):
    node.outputs[0].default_value = v; node.outputs[0].keyframe_insert("default_value", frame=frame)


def area(name, loc, target, size, energy, color=(1, 1, 1), shape="RECTANGLE", size_y=None):
    bpy.ops.object.light_add(type="AREA", location=loc); L = bpy.context.object; L.name = name
    L.data.shape = shape; L.data.size = size
    if size_y is not None: L.data.size_y = size_y
    L.data.energy = energy; L.data.color = color; L.visible_camera = False
    look_at(L, target)
    return L


def look_at(obj, target):
    from mathutils import Vector
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camera(loc, target, lens=50):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object
    c.data.lens = lens; look_at(c, target); bpy.context.scene.camera = c
    c.data.sensor_fit = "HORIZONTAL"
    return c


def setup(scene, a, view="AgX", bloom=(0.8, 0.45, 0.55), bw=True, clamp=8.0):
    scene.render.fps = a.fps; scene.frame_start, scene.frame_end = 1, a.n
    scene.render.resolution_x, scene.render.resolution_y = a.w, a.h; scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new("w"); world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1); scene.world = world
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"; prefs.get_devices()
    for dv in prefs.devices: dv.use = dv.type == "OPTIX"
    scene.cycles.device = "GPU"; scene.cycles.samples = a.spp; scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPTIX"; scene.render.compositor_device = "GPU"
    scene.cycles.sample_clamp_indirect = clamp; scene.render.use_persistent_data = True
    scene.view_settings.view_transform = view; scene.view_settings.look = "None"
    if bloom:
        ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = ng.nodes.new("CompositorNodeRLayers"); g = ng.nodes.new("CompositorNodeGlare"); go = ng.nodes.new("NodeGroupOutput")
        g.inputs["Type"].default_value = "Bloom"; g.inputs["Quality"].default_value = "High"
        thr, strength, size = bloom
        g.inputs["Threshold"].default_value = thr; g.inputs["Strength"].default_value = strength; g.inputs["Size"].default_value = size
        ng.links.new(rl.outputs["Image"], g.inputs["Image"]); ng.links.new(g.outputs["Image"], go.inputs[0])
        scene.compositing_node_group = ng; scene.render.use_compositing = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "BW" if bw else "RGB"


def render(scene, a):
    os.makedirs(a.out, exist_ok=True)
    if a.anim:
        scene.render.filepath = os.path.join(a.out, "f_####"); bpy.ops.render.render(animation=True)
    else:
        for f in [int(v) for v in a.frames.split(",") if v]:
            scene.frame_set(f); scene.render.filepath = os.path.join(a.out, f"f_{f:04d}.png")
            bpy.ops.render.render(write_still=True)
    print("DONE")
