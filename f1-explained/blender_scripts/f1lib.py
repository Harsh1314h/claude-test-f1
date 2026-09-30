"""
f1lib.py - procedural geometry + material helpers for building F1 cars in Blender (bpy).

Coordinate convention (Blender): +X = forward (nose), +Y = left, +Z = up, metres.
The glTF exporter converts Z-up to Y-up, so in three.js the nose points to +X.

All builders return bpy objects. Every object gets a clear name so the website
can find, highlight and animate individual parts.
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix

# ---------------------------------------------------------------------------
# Scene helpers
# ---------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in (bpy.data.meshes, bpy.data.materials, bpy.data.objects, bpy.data.images, bpy.data.curves):
        for item in list(c):
            c.remove(item)


def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def mesh_object(name, verts, faces, mat=None, smooth_angle=40, mats=None, face_mats=None, origin=None):
    """Create a mesh object from raw verts/faces. Recalculates normals outward."""
    me = bpy.data.meshes.new(name)
    if origin is not None:
        o = Vector(origin)
        verts = [(v[0] - o.x, v[1] - o.y, v[2] - o.z) for v in verts]
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me)
    if origin is not None:
        ob.location = Vector(origin)
    link(ob)
    if mats:
        for m in mats:
            me.materials.append(m)
        if face_mats:
            for p, mi in zip(me.polygons, face_mats):
                p.material_index = mi
    elif mat is not None:
        me.materials.append(mat)
    fix_normals(ob)
    set_smooth(ob, smooth_angle)
    return ob


def fix_normals(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def set_smooth(ob, angle=40):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = angle is not None and angle > 0
    if hasattr(me, "use_auto_smooth"):
        me.use_auto_smooth = True
        me.auto_smooth_angle = math.radians(angle if angle else 1)


def join(objs, name):
    """Join objects into one (keeps materials)."""
    objs = [o for o in objs if o is not None]
    if not objs:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def set_origin(ob, point):
    """Move object origin to world-space point without moving geometry."""
    p = Vector(point)
    mw = ob.matrix_world.copy()
    local = mw.inverted() @ p
    ob.data.transform(Matrix.Translation(-local))
    ob.location = p if ob.parent is None else ob.location + local


def mirror_y(ob, name):
    """Duplicate an object mirrored across the XZ plane (Y -> -Y)."""
    me = ob.data.copy()
    me.name = name
    ob2 = bpy.data.objects.new(name, me)
    link(ob2)
    me.transform(Matrix.Scale(-1, 4, (0, 1, 0)))
    me.flip_normals()
    ob2.location = (ob.location.x, -ob.location.y, ob.location.z)
    return ob2


def boolean_diff(target, cutter):
    mod = target.modifiers.new("cut", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def _principled(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    return m, bsdf


def _set(bsdf, key, val):
    if key in bsdf.inputs:
        bsdf.inputs[key].default_value = val


def paint(name, rgb, metallic=0.35, rough=0.32, coat=1.0):
    m, b = _principled(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Metallic", metallic)
    _set(b, "Roughness", rough)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", 0.04)
    m.diffuse_color = (*rgb, 1)
    return m


def plain(name, rgb, metallic=0.0, rough=0.5, coat=0.0):
    return paint(name, rgb, metallic, rough, coat)


def emissive(name, rgb, strength=4.0):
    m, b = _principled(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Emission Color", (*rgb, 1))
    _set(b, "Emission Strength", strength)
    _set(b, "Roughness", 0.3)
    return m


def glass(name, rgb=(0.02, 0.02, 0.03), rough=0.05):
    m, b = _principled(name)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Metallic", 0.6)
    _set(b, "Roughness", rough)
    _set(b, "Coat Weight", 1.0)
    return m


_carbon_img = None


def carbon_texture(out_dir, size=512, tows=16):
    """Generate a 2x2 twill carbon-fibre weave (colour + normal map) as PNGs."""
    global _carbon_img
    if _carbon_img:
        return _carbon_img
    cell = size // tows
    col = [0.0] * (size * size * 4)
    nor = [0.0] * (size * size * 4)
    import random
    rnd = random.Random(7)
    noise = [rnd.random() for _ in range(size)]
    for j in range(size):
        cj = j // cell
        fj = (j % cell) / cell
        for i in range(size):
            ci = i // cell
            fi = (i % cell) / cell
            horiz = ((ci + cj) % 4) < 2
            # position across the tow (0..1) and along it
            across = fj if horiz else fi
            along = fi if horiz else fj
            bulge = math.sin(math.pi * across)             # tow cross-section
            fibre = 0.5 + 0.5 * math.sin((along * 60 + noise[(i if horiz else j) % size] * 3) )
            v = 0.018 + 0.045 * bulge ** 2 + 0.012 * fibre * bulge
            if horiz:
                v *= 1.25
            k = (j * size + i) * 4
            col[k:k + 4] = (v, v, v * 1.08, 1.0)
            # normal: slope of the bulge across the tow
            slope = math.cos(math.pi * across) * 0.55
            nx, ny = (0.0, slope) if horiz else (slope, 0.0)
            nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
            nor[k:k + 4] = (nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5, 1.0)
    imgs = []
    for nm, data, cs in (("carbon_col", col, 'sRGB'), ("carbon_nrm", nor, 'Non-Color')):
        img = bpy.data.images.new(nm, size, size, alpha=False)
        img.pixels.foreach_set(data)
        img.filepath_raw = os.path.join(out_dir, nm + ".png")
        img.file_format = 'PNG'
        img.save()
        img.colorspace_settings.name = cs
        imgs.append(img)
    _carbon_img = imgs
    return imgs


def carbon(name, tex_dir, tint=(1, 1, 1)):
    col_img, nrm_img = carbon_texture(tex_dir)
    m, b = _principled(name)
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexImage")
    tc.image = col_img
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = nrm_img
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 0.6
    nt.links.new(tc.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    _set(b, "Metallic", 0.15)
    _set(b, "Roughness", 0.38)
    _set(b, "Coat Weight", 0.8)
    _set(b, "Coat Roughness", 0.06)
    m.diffuse_color = (0.03, 0.03, 0.035, 1)
    return m


# ---------------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------------

def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def interp_stations(stations, samples=6):
    """Catmull-Rom interpolate a list of equal-length numeric tuples."""
    st = [tuple(float(v) for v in s) for s in stations]
    if len(st) < 3:
        return st
    out = []
    n = len(st)
    for i in range(n - 1):
        p0 = st[max(i - 1, 0)]
        p1, p2 = st[i], st[i + 1]
        p3 = st[min(i + 2, n - 1)]
        for k in range(samples):
            t = k / samples
            out.append(tuple(catmull(a, b, c, d, t) for a, b, c, d in zip(p0, p1, p2, p3)))
    out.append(st[-1])
    return out


def smooth_path(points, samples=6):
    return [Vector(p) for p in interp_stations(points, samples)]


# ---------------------------------------------------------------------------
# Geometry builders
# ---------------------------------------------------------------------------

def section_point(t, hw, ht, hb, n, taper):
    c, s = math.cos(t), math.sin(t)
    y = math.copysign(abs(c) ** (2.0 / n), c) * hw * (1 + (taper - 1) * max(0.0, s))
    z = math.copysign(abs(s) ** (2.0 / n), s) * (ht if s > 0 else hb)
    return y, z


def loft(name, stations, mat, ring=40, samples=6, smooth_angle=50, cap=True):
    """Loft superellipse cross-sections along X.
    station = (x, yc, zc, half_width, half_height_top, half_height_bottom, exponent, top_taper)
    """
    st = interp_stations(stations, samples)
    verts, faces = [], []
    for (x, yc, zc, hw, ht, hb, n, taper) in st:
        for k in range(ring):
            t = 2 * math.pi * k / ring
            y, z = section_point(t, hw, ht, hb, max(n, 1.2), taper)
            verts.append((x, yc + y, zc + z))
    rows = len(st)
    for r in range(rows - 1):
        for k in range(ring):
            a = r * ring + k
            b = r * ring + (k + 1) % ring
            faces.append((a, b, b + ring, a + ring))
    if cap:
        for r, cx in ((0, st[0]), (rows - 1, st[-1])):
            ci = len(verts)
            verts.append((cx[0], cx[1], cx[2]))
            for k in range(ring):
                a = r * ring + k
                b = r * ring + (k + 1) % ring
                faces.append((a, b, ci))
    return mesh_object(name, verts, faces, mat, smooth_angle)


def airfoil(n=10, m=0.07, p=0.42, t=0.11):
    """Closed airfoil loop (u along chord 0..1, v thickness). Camber is inverted (downforce)."""
    us = [0.5 * (1 - math.cos(math.pi * i / n)) for i in range(n + 1)]
    up, lo = [], []
    for u in us:
        yt = 5 * t * (0.2969 * math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4)
        if u < p:
            yc = m / p ** 2 * (2 * p * u - u * u)
        else:
            yc = m / (1 - p) ** 2 * ((1 - 2 * p) + 2 * p * u - u * u)
        yc = -yc
        up.append((u, yc + yt))
        lo.append((u, yc - yt))
    loop = list(reversed(up)) + lo[1:-1]
    return loop


def wing(name, stations, mat, samples=4, foil=None, smooth_angle=35):
    """Sweep an airfoil along Y.
    station = (y, x_le, z_le, chord, aoa_deg, thickness_scale)
    Positive aoa lifts the trailing edge (typical F1 wing element).
    """
    foil = foil or airfoil()
    st = interp_stations(stations, samples)
    verts, faces = [], []
    npts = len(foil)
    for (y, xle, zle, ch, aoa, ts) in st:
        a = math.radians(aoa)
        dx, dz = -math.cos(a), math.sin(a)
        nx, nz = math.sin(a), math.cos(a)
        for (u, v) in foil:
            vv = v * ts
            verts.append((xle + (u * dx + vv * nx) * ch, y, zle + (u * dz + vv * nz) * ch))
    rows = len(st)
    for r in range(rows - 1):
        for k in range(npts):
            a = r * npts + k
            b = r * npts + (k + 1) % npts
            faces.append((a, b, b + npts, a + npts))
    for r in (0, rows - 1):
        faces.append(tuple(r * npts + k for k in range(npts)))
    return mesh_object(name, verts, faces, mat, smooth_angle)


def lathe(name, profile, mats, face_mat_fn=None, segs=64, smooth_angle=45):
    """Revolve a closed 2D profile [(r, w), ...] around the local Y axis.
    Returned object is centred at origin; w maps to +Y."""
    verts, faces, fm = [], [], []
    npf = len(profile)
    for s in range(segs):
        th = 2 * math.pi * s / segs
        c, sn = math.cos(th), math.sin(th)
        for (r, w) in profile:
            verts.append((r * c, w, r * sn))
    for s in range(segs):
        s2 = (s + 1) % segs
        for k in range(npf):
            k2 = (k + 1) % npf
            faces.append((s * npf + k, s * npf + k2, s2 * npf + k2, s2 * npf + k))
            if face_mat_fn:
                r0, w0 = profile[k]
                r1, w1 = profile[k2]
                fm.append(face_mat_fn((r0 + r1) / 2, (w0 + w1) / 2))
    if not isinstance(mats, (list, tuple)):
        mats = [mats]
    return mesh_object(name, verts, faces, mats=mats, face_mats=fm if face_mat_fn else None,
                       smooth_angle=smooth_angle)


def tube(name, p1, p2, mat, rb=0.02, rc=0.012, k=8, smooth_angle=60):
    """Tube with elliptical section between two points. rb = radius along the horizontal
    perpendicular (usually fore-aft for aero-profiled suspension arms), rc = the other."""
    p1, p2 = Vector(p1), Vector(p2)
    a = (p2 - p1).normalized()
    up = Vector((0, 0, 1))
    b = a.cross(up)
    if b.length < 1e-4:
        b = a.cross(Vector((1, 0, 0)))
    b.normalize()
    c = b.cross(a).normalized()
    verts, faces = [], []
    for p in (p1, p2):
        for i in range(k):
            t = 2 * math.pi * i / k
            verts.append(tuple(p + b * math.cos(t) * rb + c * math.sin(t) * rc))
    for i in range(k):
        j = (i + 1) % k
        faces.append((i, j, j + k, i + k))
    faces.append(tuple(range(k)))
    faces.append(tuple(range(2 * k - 1, k - 1, -1)))
    return mesh_object(name, verts, faces, mat, smooth_angle)


def sweep(name, points, mat, radius=0.02, k=12, samples=6, radius_fn=None, cap=True, ry=None, smooth_angle=60):
    """Sweep a circle/ellipse along a smoothed path (parallel-transport frames)."""
    pts = smooth_path(points, samples) if samples > 1 else [Vector(p) for p in points]
    n = len(pts)
    tangents = []
    for i in range(n):
        if i == 0:
            t = pts[1] - pts[0]
        elif i == n - 1:
            t = pts[-1] - pts[-2]
        else:
            t = pts[i + 1] - pts[i - 1]
        tangents.append(t.normalized())
    ref = Vector((0, 0, 1))
    if abs(tangents[0].dot(ref)) > 0.9:
        ref = Vector((1, 0, 0))
    nrm = tangents[0].cross(ref).normalized()
    verts, faces = [], []
    for i in range(n):
        t = tangents[i]
        if i > 0:
            nrm = (nrm - t * nrm.dot(t)).normalized()
        bin_ = t.cross(nrm).normalized()
        r = radius_fn(i / (n - 1)) if radius_fn else radius
        r2 = r * (ry / radius) if ry else r
        for j in range(k):
            a = 2 * math.pi * j / k
            verts.append(tuple(pts[i] + nrm * math.cos(a) * r + bin_ * math.sin(a) * r2))
    for i in range(n - 1):
        for j in range(k):
            j2 = (j + 1) % k
            faces.append((i * k + j, i * k + j2, (i + 1) * k + j2, (i + 1) * k + j))
    if cap:
        ci = len(verts)
        verts.append(tuple(pts[0]))
        verts.append(tuple(pts[-1]))
        for j in range(k):
            j2 = (j + 1) % k
            faces.append((j2, j, ci))
            faces.append(((n - 1) * k + j, (n - 1) * k + j2, ci + 1))
    return mesh_object(name, verts, faces, mat, smooth_angle)


def extrude_outline(name, outline, mat, axis='Y', offset=0.0, thickness=0.01, smooth=True, round_samples=0,
                    smooth_angle=30):
    """Extrude a 2D polygon.
    axis='Y': outline is [(x, z)], extruded along Y from offset-t/2..offset+t/2 (endplates, fins)
    axis='Z': outline is [(x, y)], extruded along Z (floors, plates)"""
    if round_samples:
        closed = outline + outline[:3]
        pts = interp_stations(closed, round_samples)
        n0 = len(outline)
        pts = pts[round_samples: round_samples * (n0 + 1)]
        outline = pts
    n = len(outline)
    verts = []
    for side in (-0.5, 0.5):
        d = offset + side * thickness
        for (a, b) in outline:
            verts.append((a, d, b) if axis == 'Y' else (a, b, d))
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    return mesh_object(name, verts, faces, mat, smooth_angle if smooth else 0)


def box(name, center, size, mat, bevel=0.0):
    cx, cy, cz = center
    sx, sy, sz = (s / 2 for s in size)
    v = [(cx + x * sx, cy + y * sy, cz + z * sz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    ob = mesh_object(name, v, f, mat, 30, origin=center)
    if bevel > 0:
        mod = ob.modifiers.new("bev", 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        apply_mods(ob)
    return ob


def cylinder(name, center, radius, depth, mat, axis='Y', segs=32, r2=None):
    """Cylinder (or cone when r2 given) along an axis."""
    r2 = radius if r2 is None else r2
    verts, faces = [], []
    for side, r in ((-0.5, radius), (0.5, r2)):
        for i in range(segs):
            a = 2 * math.pi * i / segs
            p = [r * math.cos(a), r * math.sin(a), side * depth]
            if axis == 'Y':
                p = [p[0], p[2], p[1]]
            elif axis == 'X':
                p = [p[2], p[0], p[1]]
            verts.append((center[0] + p[0], center[1] + p[1], center[2] + p[2]))
    for i in range(segs):
        j = (i + 1) % segs
        faces.append((i, j, j + segs, i + segs))
    faces.append(tuple(range(segs)))
    faces.append(tuple(range(2 * segs - 1, segs - 1, -1)))
    return mesh_object(name, verts, faces, mat, 40)


def sphere(name, center, radius, mat, scale=(1, 1, 1), segs=32, rings=16):
    verts, faces = [], []
    for r in range(rings + 1):
        th = math.pi * r / rings
        for s in range(segs):
            ph = 2 * math.pi * s / segs
            verts.append((center[0] + radius * scale[0] * math.sin(th) * math.cos(ph),
                          center[1] + radius * scale[1] * math.sin(th) * math.sin(ph),
                          center[2] + radius * scale[2] * math.cos(th)))
    for r in range(rings):
        for s in range(segs):
            s2 = (s + 1) % segs
            faces.append((r * segs + s, r * segs + s2, (r + 1) * segs + s2, (r + 1) * segs + s))
    ob = mesh_object(name, verts, faces, mat, 60)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
    bm.to_mesh(ob.data)
    bm.free()
    fix_normals(ob)
    set_smooth(ob, 60)
    return ob


def apply_mods(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def apply_transform(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def subdivide(ob, levels=1):
    mod = ob.modifiers.new("sub", 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    apply_mods(ob)
    set_smooth(ob, 50)


# ---------------------------------------------------------------------------
# Wheels
# ---------------------------------------------------------------------------

def tyre_profile(R, r0, W, grooves=0, groove_depth=0.006, stripe=(0.35, 0.55), sidewall_bulge=1.03,
                 shoulder=0.035, tread_rounding=0.0):
    """Closed tyre cross-section (r, w) with outer sidewall on +w.
    Returns (profile, material_fn). Materials: 0 rubber, 1 stripe."""
    hw = W / 2
    bead_w = hw * 0.86
    h = R - shoulder - r0
    side = []
    steps = 14
    for i in range(steps + 1):
        f = i / steps
        r = r0 + f * h
        w = bead_w + (hw * sidewall_bulge - bead_w) * math.sin(math.pi / 2 * min(1, f * 1.6)) ** 0.7
        if f > 0.7:
            w = w + (hw - w) * ((f - 0.7) / 0.3)
        side.append((r, w))
    # shoulder arc
    sh = []
    for i in range(1, 7):
        a = math.pi / 2 * i / 6
        sh.append((R - shoulder + shoulder * math.sin(a), hw - shoulder + shoulder * math.cos(a)))
    # tread from +w to -w (optional grooves)
    tread = []
    tw = hw - shoulder
    n = 24
    gpos = [(-tw + (2 * tw) * (g + 1) / (grooves + 1)) for g in range(grooves)]
    for i in range(1, n):
        w = tw - 2 * tw * i / n
        r = R - tread_rounding * (w / tw) ** 2
        for g in gpos:
            if abs(w - g) < 0.006:
                r -= groove_depth
        tread.append((r, w))
    right = side + sh
    prof = right + tread + [(r, -w) for (r, w) in reversed(right)]
    # rim seat (closing) goes back from -bead_w to +bead_w at r0 implicitly
    s0 = r0 + stripe[0] * (R - r0)
    s1 = r0 + stripe[1] * (R - r0)

    def fm(r, w):
        return 1 if (s0 <= r <= s1 and abs(w) > hw * 0.6) else 0
    return prof, fm


def build_tyre(name, R, r0, W, mats, **kw):
    prof, fm = tyre_profile(R, r0, W, **kw)
    return lathe(name, prof, mats, fm, segs=72, smooth_angle=50)


def rim_profile(r_rim, W, depth=0.03, lip=0.012):
    """Wheel barrel with lips (closed)."""
    hw = W / 2 - 0.005
    return [(r_rim - depth, -hw + 0.01), (r_rim + lip, -hw), (r_rim + lip, -hw + 0.012), (r_rim, -hw + 0.02),
            (r_rim, hw - 0.02), (r_rim + lip, hw - 0.012), (r_rim + lip, hw), (r_rim - depth, hw - 0.01)]


def spokes(name, n, r_in, r_out, w_out, mat, width=0.035, thick=0.02, twist=0.0):
    obs = []
    for i in range(n):
        a = 2 * math.pi * i / n
        a2 = a + twist
        p1 = (r_in * math.cos(a), w_out - 0.01, r_in * math.sin(a))
        p2 = (r_out * math.cos(a2), w_out - 0.035, r_out * math.sin(a2))
        obs.append(tube(f"{name}_{i}", p1, p2, mat, rb=width / 2, rc=thick / 2, k=6))
    return join(obs, name)


def wire_spokes(name, r_hub, r_rim, w_hub, w_rim, mat, n=48, radius=0.0022):
    """Laced wire-wheel spokes (1950s)."""
    obs = []
    for i in range(n):
        a = 2 * math.pi * i / n
        side = 1 if i % 2 == 0 else -1
        ah = a + side * 0.35
        p1 = (r_hub * math.cos(ah), w_hub * side, r_hub * math.sin(ah))
        p2 = (r_rim * math.cos(a), w_rim * (0.3 * side), r_rim * math.sin(a))
        obs.append(tube(f"{name}_{i}", p1, p2, mat, rb=radius, rc=radius, k=4, smooth_angle=0))
    return join(obs, name)


def finalize_wheel(parts, name, hub_world, side):
    """Join wheel parts (built around origin, outer face +Y), mirror for right side,
    and place at hub location with origin at the hub (so it can spin)."""
    ob = join(parts, name)
    if side < 0:
        ob.data.transform(Matrix.Scale(-1, 4, (0, 1, 0)))
        ob.data.flip_normals()
    ob.location = Vector(hub_world)
    return ob


# ---------------------------------------------------------------------------
# UVs + export
# ---------------------------------------------------------------------------

def box_uv(ob, scale=6.0):
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.active
    mw = ob.matrix_world
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = mw @ l.vert.co
            if ax == 0:
                u, v = co.y, co.z
            elif ax == 1:
                u, v = co.x, co.z
            else:
                u, v = co.x, co.y
            l[uv].uv = (u * scale, v * scale)
    bm.to_mesh(me)
    bm.free()


def tri_count(objs):
    total = 0
    for o in objs:
        if o.type == 'MESH':
            o.data.calc_loop_triangles()
            total += len(o.data.loop_triangles)
    return total


def export_glb(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True,
        export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='JPEG', export_extras=True, export_cameras=False, export_lights=False,
    )


# ---------------------------------------------------------------------------
# Preview rendering
# ---------------------------------------------------------------------------

def setup_preview_scene(length=5.6):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.samples = 48
    scn.cycles.use_denoising = False
    scn.cycles.max_bounces = 6
    scn.render.resolution_x = 1200
    scn.render.resolution_y = 640
    scn.view_settings.view_transform = 'Filmic' if 'Filmic' in [v for v in ['Filmic']] else 'Standard'
    try:
        scn.view_settings.view_transform = 'AgX'
    except Exception:
        pass
    world = bpy.data.worlds.new("World")
    scn.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.055, 0.065, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    # ground
    g = bpy.data.meshes.new("ground")
    s = 40
    g.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    gob = bpy.data.objects.new("_ground", g)
    link(gob)
    gm = plain("_groundmat", (0.06, 0.06, 0.07), rough=0.4)
    g.materials.append(gm)
    # lights
    for nm, loc, energy, size in (("_key", (3, -4, 5), 1500, 4), ("_fill", (-4, 3, 3), 500, 5), ("_rim", (-2, -5, 2), 700, 3),
                                  ("_top", (0, 0, 7), 900, 6)):
        ld = bpy.data.lights.new(nm, 'AREA')
        ld.energy = energy
        ld.size = size
        lo = bpy.data.objects.new(nm, ld)
        lo.location = loc
        link(lo)
        d = Vector((0, 0, 0.4)) - Vector(loc)
        lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new("_cam")
    cam.lens = 50
    co = bpy.data.objects.new("_cam", cam)
    link(co)
    scn.camera = co
    return co


def render_view(cam, path, loc, target=(0, 0, 0.35), lens=50, res=(1200, 640), samples=48):
    scn = bpy.context.scene
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.cycles.samples = samples
    cam.data.lens = lens
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = path
    jpg = path.lower().endswith('.jpg')
    scn.render.image_settings.file_format = 'JPEG' if jpg else 'PNG'
    if jpg:
        scn.render.image_settings.quality = 85
    bpy.ops.render.render(write_still=True)


def cleanup_preview_scene():
    for o in list(bpy.data.objects):
        if o.name.startswith("_"):
            bpy.data.objects.remove(o, do_unlink=True)
