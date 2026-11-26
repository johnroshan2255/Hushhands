# Shared tools for the creature scripts: build in Blender, export each named part as a compact mesh
# the game reads straight into its own MeshBuilder (public/models/<name>.json).
#
# Blender is Z up with the creature facing +X; the game is Y up, X right, Z toward the camera:
#   game (x, y, z) = blender (x, z, -y)
# Colours are not painted in Blender: each part gets an ink tone (and an optional glow) at export,
# the game's look being black silhouettes on fog.
import bpy, bmesh, json, base64, array, math, os, sys
from mathutils import Vector, Matrix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'models')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def smooth(obj, level=2):
    m = obj.modifiers.new('sub', 'SUBSURF')
    m.levels = level
    m.render_levels = level
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def sphere(name, loc=(0, 0, 0), scale=(1, 1, 1), seg=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return o


def chain(name, pts, seg_res=8):
    """a skinned tube through [(x, y, z, r)] points (the skin modifier, then subdivided)"""
    me = bpy.data.meshes.new(name)
    verts = [(p[0], p[1], p[2]) for p in pts]
    edges = [(i, i + 1) for i in range(len(pts) - 1)]
    me.from_pydata(verts, edges, [])
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.modifiers.new('skin', 'SKIN')
    for i, p in enumerate(pts):
        o.data.skin_vertices[0].data[i].radius = (p[3], p[3])
    o.data.skin_vertices[0].data[0].use_root = True
    s = o.modifiers.new('sub', 'SUBSURF')
    s.levels = 1
    return o


def budget(obj, tris):
    """decimate to about this many triangles (shape kept, silhouettes are what matter)"""
    obj.data.calc_loop_triangles()
    have = len(obj.data.loop_triangles)
    if have > tris:
        m = obj.modifiers.new('dec', 'DECIMATE')
        m.ratio = tris / have
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=m.name)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def join(name, objs, tris=None):
    """apply every modifier and join into one mesh object"""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    if tris:
        budget(o, tris)
    return o


def tris_of(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    mw = obj.matrix_world
    nm = mw.to_3x3().inverted().transposed()
    P, N, I = [], [], []
    for v in me.vertices:
        w = mw @ v.co
        n = (nm @ v.normal).normalized()
        P += [w.x, w.z, -w.y]
        N += [n.x, n.z, -n.y]
    for t in me.loop_triangles:
        a, b, c = t.vertices
        # (Blender winds counter-clockwise seen from outside; so does the game: keep the order)
        I += [a, b, c]
    ev.to_mesh_clear()
    return P, N, I


def b64(typecode, values):
    return base64.b64encode(array.array(typecode, values).tobytes()).decode('ascii')


def export(name, parts, meta=None):
    """parts: { partName: (obj, colour (r, g, b, glow) or fn(x, y, z) -> colour) }"""
    out = {'v': 1, 'name': name, 'parts': {}, 'meta': meta or {}}
    total = 0
    for pname, (obj, col) in parts.items():
        P, N, I = tris_of(obj)
        C = []
        for i in range(0, len(P), 3):
            c = col(P[i], P[i + 1], P[i + 2]) if callable(col) else col
            C += [max(0, min(255, round(v * 255))) for v in c]
        n8 = [max(-127, min(127, round(v * 127))) for v in N]
        out['parts'][pname] = {'n': len(P) // 3, 'p': b64('f', P), 'nn': b64('b', n8), 'c': b64('B', C), 'i': b64('H', I)}
        total += len(I) // 3
        print(f'  {name}.{pname}: {len(P) // 3} verts, {len(I) // 3} tris')
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.json')
    with open(path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'{name}: {total} triangles -> {os.path.normpath(path)} ({os.path.getsize(path) // 1024} KB)')
    try:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), f'{name}.blend'))
    except Exception as e:  # the .blend is only for looking at
        print('  (no .blend saved:', e, ')')
