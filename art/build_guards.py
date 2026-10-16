"""Nilo / Roda 861 — two clothed MakeHuman guards, Blender 5.2.2.

Run this text ONCE in an authorized Blender Python/MCP context in OBJECT mode.
Self-contained: bpy, bmesh, math, random, mathutils only. No file readers,
system imports, handlers, drivers, classes, downloads, or .blend saves.
The only disk output on execution is public/models/guardians.glb.
The OBJ's own header identifies the MakeHuman base as CC0 (September 2020).
Historical scope: docs/guardas-roda-861.md. Costume and ceremony are conjectural.

WEB CONTRACT (metres, Y-up, front +Z):
  GuardLeft  translation (-1.85, 0, 5.45), anatomical height 1.76 m.
  GuardRight translation (+1.85, 0, 5.45), anatomical height 1.81 m.
  SpearLeft / SpearRight are direct children of their respective guard roots.
  Each Spear node is a SHOULDER pivot carrying sleeve + forearm + gripping hand
  + complete spear. It is NOT the spear centre and NOT a wrist-only rotation.
  CLOSED absolute rotation.z: Left=-0.25, Right=+0.25 radians.
  OPEN   absolute rotation.z: Left=+0.70, Right=-0.70 radians.
  Interpolate those absolute values; DO NOT reset the imported pose to zero or
  add 0.70 to the initial angle. The actual sweep is 0.95 radians per side.
  Closed geometry is counter-rotated into the node's local coordinates so the
  initial world-space spear pose is an X. The offset allows the shoulder-led
  movement to clear the 2.6 m opening at the prescribed open endpoint.
  No skins or animation clips exported. Reset web nodes to their closed values
  to close the gate. No translation animation is needed.

REVIEW: camera only, no lights. The owned scene uses studio Workbench shading;
optional preview keys are installed AFTER export, never played automatically.
The original active scene is restored, including on exceptions. Switch to
'Nilo • guardas' for inspection. The script refuses to replace an unowned scene
or globally conflicting contract names. It never deletes another scene's IDs.

VALIDATION: run-time triangle / degenerate / transform / spear clearance checks
precede export. Open boundaries hidden under cuffs/collar/hat are intentional.
Visual QA, finger contact, face decimation and GLB round-trip remain mandatory
on the user's run; this source file has NOT been executed in Blender by its author.
Export operator success is reported, not falsely presented as a file read-back.
"""

import bpy
import bmesh
import math
import random
from mathutils import Vector


ROOT = 'C:/Users/alkim/site-Nilo'
SOURCE_OBJ = ROOT + '/art/sources/human-base.obj'
EXPORT_PATH = ROOT + '/public/models/guardians.glb'
SCENE_NAME = 'Nilo • guardas'
OWNER = 'nilo.guards.861.v1'
TAG = 'nilo_guard_builder'
DO_EXPORT = True
REVIEW_CAMERA = True
PREVIEW_ANIMATION = False
MAX_TRIS = 20000
SEED = 861
CLOSED = -0.25                     # left; right is its mirror
OPEN = 0.70                        # absolute web Z, left
SOURCE_FLOOR = -8.1676
SOURCE_HEIGHT = 16.6589
BASE_HEIGHT = 1.76
TAU = math.tau

# Raw OBJ Y-up coordinates, measured from the provided helper joint cubes.
# Helpers are never rendered/exported. Body is the only source surface used.
WRIST = Vector((4.31185, 2.45181, 1.75655))
FINGERS = (
    ((4.19508, 2.30585, 2.13439), (4.09483, 2.25569, 2.37332),
     (3.98384, 2.10965, 2.68221), (3.91677, 2.00011, 2.87606)),
    ((4.49554, 2.03029, 2.64416), (4.53153, 1.89514, 2.85379),
     (4.53383, 1.74540, 3.02354), (4.52965, 1.58909, 3.19431)),
    ((4.60830, 1.88615, 2.47898), (4.71245, 1.67240, 2.69079),
     (4.74674, 1.48818, 2.85589), (4.78414, 1.30278, 3.01469)),
    ((4.69636, 1.82499, 2.30946), (4.81135, 1.61740, 2.46117),
     (4.85910, 1.42569, 2.59190), (4.91536, 1.22280, 2.71670)),
    ((4.74540, 1.76372, 2.12385), (4.80704, 1.58199, 2.22121),
     (4.82991, 1.45535, 2.28132), (4.85682, 1.28930, 2.35275)),
)


def xyz(p):
    """Web Y-up -> Blender Z-up, determinant +1, no mirrored geometry."""
    return Vector((p[0], -p[2], p[1]))


def web(p):
    return Vector((p[0], p[2], -p[1]))


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def smooth(v):
    v = clamp(v)
    return v * v * (3.0 - 2.0 * v)


def linear_hex(value):
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
                 for c in channels) + (1.0,)


def tint(a, b, t):
    t = clamp(t)
    return tuple(a[k] * (1.0 - t) + b[k] * t for k in range(3)) + (1.0,)


def turn_web_z(p, angle):
    c, s = math.cos(angle), math.sin(angle)
    return Vector((c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]))


def mark(datablock):
    datablock[TAG] = OWNER
    return datablock


def own(datablock):
    return datablock.get(TAG) == OWNER


def preflight():
    if bpy.context.mode != 'OBJECT':
        raise RuntimeError('Exit Edit/Sculpt/Pose mode yourself before running this builder.')
    if bpy.context.window is None:
        raise RuntimeError('This script expects the authorized live Blender window.')
    props = bpy.ops.wm.obj_import.get_rna_type().properties
    for key in ('filepath', 'forward_axis', 'up_axis', 'use_split_groups', 'use_split_objects'):
        if key not in props:
            raise RuntimeError('OBJ importer lacks required property: ' + key)
    if DO_EXPORT:
        props = bpy.ops.export_scene.gltf.get_rna_type().properties
        for key in ('export_meshopt_compression_enable', 'export_image_format',
                    'export_image_quality', 'export_vertex_color', 'use_active_scene'):
            if key not in props:
                raise RuntimeError('glTF exporter lacks required property: ' + key)
        if 'WEBP' not in {item.identifier for item in props['export_image_format'].enum_items}:
            raise RuntimeError('This exporter does not support WebP; no silent fallback.')
    target = bpy.data.scenes.get(SCENE_NAME)
    if target is not None and not own(target):
        raise RuntimeError('Scene name already exists without this builder ownership tag.')
    for name in ('GuardLeft', 'GuardRight', 'SpearLeft', 'SpearRight'):
        obj = bpy.data.objects.get(name)
        if obj is not None and (not own(obj) or target is None or obj.name not in target.objects):
            raise RuntimeError('Reserved contract node belongs to other work: ' + name)
    if target:
        for collection in target.collection.children:
            if own(collection) and collection.users > 1:
                raise RuntimeError('Owned collection is shared; detach it yourself before rebuilding.')
        for obj in target.objects:
            if own(obj):
                if any(s != target for s in obj.users_scene):
                    raise RuntimeError('Owned object is shared into another scene: ' + obj.name)
                if any(not own(c) for c in obj.users_collection):
                    raise RuntimeError('Owned object is linked into a foreign collection: ' + obj.name)
    return target


def clean_owned(scene):
    # Ownership + scene membership, never select_all/delete or global orphan purge.
    for obj in list(scene.objects):
        if own(obj):
            bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(scene.collection.children):
        if own(collection) and not collection.objects and not collection.children:
            bpy.data.collections.remove(collection)
    for pool in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                 bpy.data.cameras, bpy.data.actions):
        for data in list(pool):
            if own(data) and data.users == 0:
                pool.remove(data)


def source_body(scene, collection):
    """Native safe OBJ importer; discard every helper and all imported objects.

    Request the native OBJ importer's identity basis (+Y forward, +Z up),
    preserving raw OBJ coordinates in memory. This is an intermediate basis:
    source geometry is explicitly converted exactly once by make_mesh().
    """
    before_objects = set(bpy.data.objects)
    before_meshes = set(bpy.data.meshes)
    before_materials = set(bpy.data.materials)
    try:
        result = bpy.ops.wm.obj_import(
            filepath=SOURCE_OBJ, forward_axis='Y', up_axis='Z',
            use_split_objects=False, use_split_groups=True)
        if 'FINISHED' not in result:
            raise RuntimeError('OBJ import did not finish: ' + str(result))
        created = [o for o in bpy.data.objects if o not in before_objects]
        bpy.context.view_layer.update()
        # Importer naming can include the OBJ filename; identify the unique
        # body topology as well as verifying all raw bounds below.
        candidates = [o for o in created if o.type == 'MESH'
                      and len(o.data.polygons) == 13378]
        if len(candidates) != 1:
            raise RuntimeError('Expected exactly one OBJ body group; got ' + str([o.name for o in created]))
        body = candidates[0]
        # Include importer transform rather than assuming it was baked.
        points = [body.matrix_world @ v.co for v in body.data.vertices]
        faces = [tuple(p.vertices) for p in body.data.polygons]
        bounds = [(min(p[k] for p in points), max(p[k] for p in points)) for k in range(3)]
        # Verified directly from the raw OBJ body group (not helper bounds).
        # Keep these checks on transformed coordinates: an axis reversal must fail.
        expected = ((-4.9627, 4.9627), (-8.1676, 8.4913), (-1.0154, 3.2147))
        if len(points) != 13380 or len(faces) != 13378 or any(abs(bounds[k][j] - expected[k][j]) > .015
                                     for k in range(3) for j in range(2)):
            raise RuntimeError('Unexpected body topology/orientation. Refuse wrong anatomy: ' + str(bounds))
        return points, faces
    finally:
        # Also cleans a partially failed importer, only IDs absent before import.
        for obj in list(bpy.data.objects):
            if obj not in before_objects:
                bpy.data.objects.remove(obj, do_unlink=True)
        for mesh in list(bpy.data.meshes):
            if mesh not in before_meshes and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        for mat in list(bpy.data.materials):
            if mat not in before_materials and mat.users == 0:
                bpy.data.materials.remove(mat)


def rough_image(label, mean, amplitude, cloth=False):
    """Small in-memory data texture, not an AI image, no separate disk output."""
    size = 64
    image = mark(bpy.data.images.new('NG861_' + label, width=size, height=size, alpha=False))
    image.colorspace_settings.name = 'Non-Color'
    rng = random.Random(SEED + len(label))
    pixels = []
    for y in range(size):
        for x in range(size):
            weave = .4 * math.sin(x * math.pi / 2) * math.sin(y * math.pi / 2) if cloth else 0
            value = clamp(mean + amplitude * (rng.uniform(-.6, .6) + weave))
            pixels.extend((value, value, value, 1.0))
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    return image


def material(label, roughness, metal=0.0, image=None, specular=.5):
    mat = mark(bpy.data.materials.new('NG861_' + label))
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bs = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Specular IOR Level'].default_value = specular
    bs.inputs['Coat Weight'].default_value = 0.0
    mat.roughness = roughness
    mat.metallic = metal
    mat.diffuse_color = (1, 1, 1, 1)
    col = nodes.new('ShaderNodeVertexColor')
    col.layer_name = 'Col'
    mat.node_tree.links.new(col.outputs['Color'], bs.inputs['Base Color'])
    if image:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        mat.node_tree.links.new(tex.outputs['Color'], bs.inputs['Roughness'])
    # Standard portable glTF metal/rough; no procedural nodes or SSS dependency.
    mat.use_backface_culling = True
    return mat


def empty(name, parent, location, collection):
    obj = mark(bpy.data.objects.new(name, None))
    collection.objects.link(obj)
    obj.empty_display_type = 'PLAIN_AXES'
    obj.empty_display_size = .055
    obj.parent = parent
    obj.location = xyz(location)
    return obj


def make_mesh(name, points, faces, mat, colors, parent, collection, pivot=None, angle=0.0,
              uv=None, smooth_faces=True, preserve_winding=False):
    if not points or not faces:
        raise RuntimeError('Empty mesh: ' + name)
    local = [turn_web_z(Vector(p) - pivot, -angle) if pivot is not None else Vector(p)
             for p in points]
    mesh = mark(bpy.data.meshes.new('NG861_' + name))
    mesh.from_pydata([xyz(p) for p in local], [], faces)
    mesh.materials.append(mat)
    mesh.update()
    obj = mark(bpy.data.objects.new('NG861_' + name, mesh))
    collection.objects.link(obj)
    obj.parent = parent
    layer = mesh.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    for i, item in enumerate(layer.data):
        item.color = colors[i] if isinstance(colors, list) else colors
    mesh.color_attributes.active_color_index = 0
    mesh.color_attributes.render_color_index = 0
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth = smooth_faces
        # Face-plane projection avoids collapsed UVs, adequate for tiled roughness.
        normal_magnitudes = [abs(poly.normal[k]) for k in range(3)]
        axis = normal_magnitudes.index(max(normal_magnitudes))
        axes = [k for k in range(3) if k != axis]
        for li in poly.loop_indices:
            vi = mesh.loops[li].vertex_index
            uv_layer.data[li].uv = uv[vi] if uv else (
                mesh.vertices[vi].co[axes[0]] * 16, mesh.vertices[vi].co[axes[1]] * 16)
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        if not preserve_winding:
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
    finally:
        bm.free()
    mesh.update()
    return obj


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def reduce_mesh(obj, target):
    count = triangles(obj)
    if count <= target:
        return
    mod = obj.modifiers.new('Budget collapse (baked)', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = max(.05, (target - 12) / count)
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    baked = mark(bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True,
                                                depsgraph=depsgraph))
    old = obj.data
    obj.modifiers.clear()
    obj.data = baked
    if old.users == 0 and own(old):
        bpy.data.meshes.remove(old)
    for p in baked.polygons:
        p.use_smooth = True


def subset(points, faces, region):
    # Explicit region branches: safe mode rejects calling function parameters.
    if region == 'head':
        chosen = [f for f in faces if all(5.60 < points[i].y < 7.95 for i in f)]
    elif region == 'foot':
        chosen = [f for f in faces if all(points[i].x > 0 and points[i].y < -6.40 for i in f)]
    elif region == 'hand':
        chosen = [f for f in faces if all(points[i].x > 3.80 and points[i].y < 2.70 for i in f)]
    else:
        raise RuntimeError('Unknown source region: ' + str(region))
    ids = sorted({i for face in chosen for i in face})
    mapping = {old: new for new, old in enumerate(ids)}
    return [points[i].copy() for i in ids], [tuple(mapping[i] for i in f) for f in chosen]


def loft(rings, segments=24, fold=0.0, phase=0.0, cap=False, waist_y=None):
    """Shaped textile cross-sections: (x,y,z,rx,rz), not stacked cylinders."""
    points, faces, uv = [], [], []
    for j, (x, y, z, rx, rz) in enumerate(rings):
        for i in range(segments):
            t = TAU * i / segments
            amplitude = fold * min(1.0, rx/.15)
            if waist_y is not None:
                amplitude *= 1 - .88*math.exp(-((y-waist_y)/(.052*waist_y))**2)
            wave = amplitude * (math.sin(5*t + phase + y*2.4)
                                + .38*math.sin(8*t - y*3.7 + .4))
            # Uneven gravity folds, with diagonal tension towards the belt.
            sag = amplitude * .65 * math.sin(3*t + y*5 + phase)
            # Fold amplitude remains in metres, independently of body width.
            points.append((x + (rx + wave)*math.cos(t), y + sag,
                           z + (rz + wave*.7)*math.sin(t)))
            uv.append((i / segments, j / max(1, len(rings)-1)))
    for j in range(len(rings)-1):
        for i in range(segments):
            n = (i+1) % segments
            faces.append((j*segments+i, j*segments+n, (j+1)*segments+n, (j+1)*segments+i))
    if cap:
        faces.extend((tuple(reversed(range(segments))),
                      tuple((len(rings)-1)*segments+i for i in range(segments))))
    # X/Z rings around +Y have the opposite handedness to tube's u/v frame.
    # Preserve this explicit outward winding on open hems and the neck return.
    faces = [tuple(reversed(face)) for face in faces]
    return points, faces, uv


def tube(centres, widths, segments=12, folds=0.0, caps=False):
    """Parallel-transport tube for articulated sleeve or a solid shaft."""
    centres = [Vector(p) for p in centres]
    points, faces = [], []
    previous_u = None
    for j, centre in enumerate(centres):
        tangent = (centres[min(j+1, len(centres)-1)] - centres[max(j-1, 0)]).normalized()
        if previous_u is None:
            reference = Vector((0, 0, 1))
            if abs(tangent.dot(reference)) > .94:
                reference = Vector((1, 0, 0))
            u = tangent.cross(reference).normalized()
        else:
            u = (previous_u - tangent * previous_u.dot(tangent)).normalized()
        v = tangent.cross(u).normalized()
        previous_u = u
        for i in range(segments):
            a = TAU*i/segments
            r = widths[j] * (1 + folds*(math.sin(a*3+j*.46)
                                       + .35*math.sin(a*2-j*.8)))
            points.append(centre + r*(math.cos(a)*u + math.sin(a)*v))
    for j in range(len(centres)-1):
        for i in range(segments):
            n = (i+1) % segments
            faces.append((j*segments+i, j*segments+n, (j+1)*segments+n, (j+1)*segments+i))
    if caps:
        faces.extend((tuple(reversed(range(segments))),
                      tuple((len(centres)-1)*segments+i for i in range(segments))))
    return points, faces


def ellipsoid(centre, radii, segments=16, rows=8):
    points = [Vector(centre) + Vector((0, radii[1], 0))]
    faces = []
    for j in range(1, rows):
        b = math.pi*j/rows
        for i in range(segments):
            a = TAU*i/segments
            points.append(Vector(centre) + Vector((radii[0]*math.sin(b)*math.cos(a),
                                                   radii[1]*math.cos(b),
                                                   radii[2]*math.sin(b)*math.sin(a))))
    bottom = len(points)
    points.append(Vector(centre) - Vector((0, radii[1], 0)))
    for i in range(segments):
        n = (i+1) % segments
        faces.append((0, 1+i, 1+n))
        for j in range(rows-2):
            a, b = 1+j*segments, 1+(j+1)*segments
            faces.append((a+i, b+i, b+n, a+n))
        faces.append((bottom, 1+(rows-2)*segments+n, 1+(rows-2)*segments+i))
    return points, faces


def hand_pose(source_points, gripping, side, grip, height):
    """Morph the actual MakeHuman hand, retaining nails/knuckles/five fingers.

    Offline piecewise bone-space deformation only; no armature is created.
    Source phalanges come from the OBJ helper joint centres, not guessed tubes.
    """
    scale = height / SOURCE_HEIGHT
    fingers = [[Vector(p) for p in chain] for chain in FINGERS]
    anchor = sum((chain[0] for chain in fingers[1:]), Vector()) / 4
    u0 = (fingers[1][0] - fingers[4][0]).normalized()
    d0 = (anchor - WRIST).normalized()
    d0 = (d0 - u0*d0.dot(u0)).normalized()
    n0 = u0.cross(d0).normalized()
    if gripping:
        u = Vector((side*.8, .6, 0))
        d = Vector((0, 0, 1))
    else:
        u = Vector((side, 0, 0))
        d = Vector((0, -.985, .173)).normalized()
    n = side * u.cross(d).normalized()
    radius = .0245 * height / BASE_HEIGHT
    origin = Vector(grip) + (n*radius if gripping else Vector())

    def basis(p):
        p = Vector(p) - anchor
        return origin + scale*(u*p.dot(u0) + d*p.dot(d0) + n*p.dot(n0))

    chains = []
    for finger_index, source_chain in enumerate(fingers):
        bind = [basis(p) for p in source_chain]
        posed = [bind[0]]
        arc_length = 0.0
        for j in range(1, 4):
            arc_length += (bind[j] - bind[j-1]).length
            if gripping and finger_index:
                theta = min(2.75, arc_length/radius)
                posed.append(bind[0] + d*(radius*math.sin(theta))
                             + n*(radius*(math.cos(theta)-1)))
            elif gripping:
                # Thumb opposes the other fingers along the far side of shaft.
                target = (Vector(grip) + u*(.030*height/BASE_HEIGHT)
                          - n*(radius+.004*height/BASE_HEIGHT))
                t = j/3
                posed.append(bind[0].lerp(target, t) + d*(.018*math.sin(math.pi*t)))
            else:
                theta = .35 * j/3
                posed.append(bind[0] + d*arc_length - n*(arc_length*math.sin(theta)*.4))
        chains.append((bind, posed))

    result = []
    for raw in source_points:
        p = basis(raw)
        candidates = []
        for bind, posed in chains:
            axis = (bind[1] - bind[0]).normalized()
            beyond = (p-bind[0]).dot(axis)
            for j in range(3):
                segment = bind[j+1] - bind[j]
                t = clamp((p-bind[j]).dot(segment)/max(segment.length_squared, 1e-10))
                distance = (p - (bind[j]+segment*t)).length
                rotation = segment.rotation_difference(posed[j+1]-posed[j])
                target = posed[j] + rotation @ (p-bind[j])
                candidates.append((distance, target, beyond))
        # Sort scalar distance/index pairs; never pass a callback or compare Vectors.
        order = sorted((item[0], index) for index, item in enumerate(candidates))
        near = [candidates[index] for distance, index in order[:2]]
        # Palm stays rigid; blend over the metacarpal/first-phalanx transition.
        amount = smooth((near[0][2] + .005)/.018)
        weights = [1/(item[0]**4 + 1e-12) for item in near]
        total = sum(weights)
        moved = sum((item[1]*weight for item, weight in zip(near, weights)), Vector())/total
        result.append(p.lerp(moved, amount))
    return result, basis(WRIST)


def build_guard(label, sign, height, raw, source_faces, materials, collection):
    ratio = height/BASE_HEIGHT
    size = height/SOURCE_HEIGHT
    root_x = -1.85 if sign == 1 else 1.85
    root = empty('Guard'+label, None, (root_x, 0, 5.45), collection)
    root['anatomical_height_m'] = height
    root['source'] = 'MakeHuman human-base.obj body, CC0; clothes are artistic reconstruction'
    root['historical_status'] = 'Plausible ninth-century clothing; Roda guards and ceremony unverified'
    shoulder = Vector((sign*.195, 1.43, .0))*ratio
    pivot = empty('Spear'+label, root, shoulder, collection)
    angle = sign*CLOSED
    pivot.rotation_euler = (0, -angle, 0)
    pivot['closed_z_web'] = angle
    pivot['open_z_web'] = sign*OPEN
    pivot['pivot_contract'] = 'Shoulder: whole sleeved arm + hand + spear; absolute web Z angles'
    static, moving = [], []
    skin = linear_hex('9C7054' if label == 'Left' else '895F45')
    beard = linear_hex('342C26')
    cloth = linear_hex('747C7D' if label == 'Left' else '687274')
    linen = linear_hex('C6B99C')
    leather = linear_hex('4E392A')
    wood = linear_hex('82603D')
    iron = linear_hex('ABB0AF')  # metallic F0; not dark albedo mistaken for iron

    def add(name, points, faces, mat, colors, moves=False, uv=None, smooth_faces=True,
            preserve_winding=False):
        obj = make_mesh(label+'_'+name, points, faces, mat, colors,
                        pivot if moves else root, collection,
                        pivot=shoulder if moves else None, angle=angle if moves else 0,
                        uv=uv, smooth_faces=smooth_faces, preserve_winding=preserve_winding)
        (moving if moves else static).append(obj)
        return obj

    def fabric(name, rings, colour, segments=28, folds=.005, mat=None, caps=False):
        p, f, uv = loft([(x*ratio, y*ratio, z*ratio, rx*ratio, rz*ratio)
                          for x,y,z,rx,rz in rings], segments, folds*ratio,
                         .7 if label == 'Right' else 0, cap=caps,
                         waist_y=1.07*ratio if name == 'Tunic' else None)
        return add(name, p, f, mat if mat is not None else materials['cloth'], colour,
                   uv=uv, preserve_winding=True)

    # Anatomical head/ears/neck. Crop away shoulders and every hidden body face.
    head_p, head_f = subset(raw, source_faces, 'head')
    head = [Vector((p.x*size, (p.y-SOURCE_FLOOR)*size, p.z*size)) for p in head_p]
    colours = []
    for p in head_p:
        # Sparse stubble follows the jaw; no helmet-like geometric beard shell.
        front = smooth((p.z-.40)/.65)
        lower = smooth((6.82-p.y)/.34)*smooth((p.y-5.98)/.28)
        sideburn = smooth((abs(p.x)-.48)/.18)*smooth((7.30-p.y)/.25)*smooth((p.y-6.55)/.25)
        mouth_clear = math.exp(-((p.x/.32)**2 + ((p.y-6.72)/.09)**2))
        coverage = clamp((lower+sideburn)*front*(1-mouth_clear))*.66
        c = tint(skin, beard, coverage)
        lip = math.exp(-((p.x/.29)**4 + ((p.y-6.73)/.07)**2))*smooth((p.z-1.30)/.15)
        c = tint(c, linear_hex('85564A'), lip*.40)
        eyebrow = math.exp(-((abs(p.x)-.34)/.27)**4 - ((p.y-7.49)/.045)**2)
        c = tint(c, beard, eyebrow*front*.70)
        colours.append(c)
    ob = add('Head', head, head_f, materials['skin'], colours)
    reduce_mesh(ob, 3600)

    # One continuous globe per eye. Iris/pupil are vertex colours, not thin
    # intersecting shells (the earlier shells produced coplanar QA pairs).
    for side in (-1, 1):
        # Body eyelid surface lies near raw Z=1.41; the small helper sphere is
        # an internal locator, not an eyeball radius. Place the visible globe
        # just behind the eyelids, with its anterior surface near Z=1.415.
        centre = Vector((side*.30775*size, (7.28415-SOURCE_FLOOR)*size, 1.270*size))
        p, f = ellipsoid((0,0,0), (1,1,1), 12, 8)
        eye_points, eye_colors = [], []
        for v in p:
            # Concentrate the first latitude at the pupil/iris boundary.
            theta = math.acos(clamp(v.y, -1, 1))
            theta = theta*.42 if theta <= math.pi/8 else (
                .165 + (theta-math.pi/8)*(math.pi-.165)/(math.pi-math.pi/8))
            a = math.atan2(v.z,v.x)
            eye_points.append(centre + Vector((math.sin(theta)*math.cos(a),
                math.sin(theta)*math.sin(a), math.cos(theta)))*(.145*size))
            c = linear_hex('191A18') if theta < .17 else (
                linear_hex('3B3026') if theta < .65 else linear_hex('B9AEA0'))
            eye_colors.append(c)
        add('Eye'+str(side), eye_points, f, materials['eye'], eye_colors)

    # Knee-length tunic: hem return, flared skirt, belt compression, chest, collar.
    fabric('Tunic', [(0,.548,0,.235,.156), (0,.540,0,.243,.164),
                    (0,.56,0,.244,.165), (0,.65,0,.231,.154),
                    (0,.78,0,.214,.143), (0,.91,0,.199,.130),
                    (0,1.02,0,.172,.110), (0,1.065,0,.156,.101),
                    (0,1.10,0,.166,.113), (0,1.19,0,.186,.124),
                    (0,1.255,0,.202,.133), (0,1.31,0,.213,.137),
                    (0,1.39,0,.229,.132), (0,1.435,0,.251,.128),
                    (0,1.461,0,.236,.118), (0,1.480,.003,.165,.087),
                    (0,1.495,.006,.068,.061),
                    (0,1.505,.006,.063,.057), (0,1.49,.006,.059,.053)],
           cloth, folds=.009)
    fabric('Belt', [(0,1.047,0,.167,.109), (0,1.053,0,.169,.111),
                   (0,1.084,0,.169,.111), (0,1.090,0,.167,.109)],
           leather, 32, .001, mat=materials['leather'])
    # Small rectangular buckle, a curved four-sided wire rather than a badge.
    buckle = [Vector(p)*ratio for p in [(-.022,1.052,.119),(.022,1.052,.119),
              (.022,1.085,.119),(-.022,1.085,.119),(-.022,1.052,.119)]]
    p, f = tube(buckle, [.003*ratio]*5, 6)
    add('Buckle', p, f, materials['metal'], iron)
    p, f = tube([Vector((0,1.058,.125))*ratio, Vector((0,1.079,.125))*ratio],
                [.002*ratio]*2, 6, caps=True)
    add('BucklePin', p, f, materials['metal'], iron)

    for side in (-1, 1):
        fabric('Trouser'+str(side), [(side*.135,.14,.012,.044,.051),
               (side*.135,.18,.010,.052,.059), (side*.135,.25,.009,.063,.068),
               (side*.132,.35,.020,.068,.073), (side*.127,.47,.034,.069,.079),
               (side*.120,.53,.025,.073,.083), (side*.110,.63,.010,.085,.092),
               (side*.104,.79,0,.092,.096), (side*.100,.87,0,.090,.091)],
               linen, 16, .0035)
        # Measure the anatomical foot, then wrap a smooth leather last around
        # it. Do not recolour bare toes brown and call them a closed boot.
        bp, bf = subset(raw, source_faces, 'foot')
        heel = min(p.z for p in bp)*BASE_HEIGHT/SOURCE_HEIGHT
        toe = max(p.z for p in bp)*BASE_HEIGHT/SOURCE_HEIGHT
        middle, length = (heel+toe)*.5, (toe-heel)*.5
        width = (max(p.x for p in bp)-min(p.x for p in bp))*BASE_HEIGHT/SOURCE_HEIGHT*.56
        fabric('Boot'+str(side), [(side*.135,.023,middle,width,length),
               (side*.135,.041,middle,width*1.04,length*1.02),
               (side*.135,.066,middle*.91,width,length*.93),
               (side*.135,.093,.034,width*.91,.097),
               (side*.135,.128,.007,width*.87,.067),
               (side*.135,.170,.002,width*.86,.054),
               (side*.135,.203,.002,width*.87,.053),
               (side*.135,.207,.002,width*.81,.048)],
               leather, 20, .0008, mat=materials['leather'])
        fabric('Sole'+str(side), [(side*.135,0,.073,.055,.132),
               (side*.135,.006,.073,.058,.134), (side*.135,.021,.073,.058,.134),
               (side*.135,.027,.073,.054,.129)], linear_hex('302821'), 20, 0,
               mat=materials['leather'], caps=True)

    # Compact fitted crown and three overlapping folds: no tall fantasy turban.
    fabric('HeadCloth', [(0,1.682,.032,.083,.107), (0,1.695,.032,.087,.109),
           (0,1.725,.032,.081,.099), (0,1.754,.032,.061,.074),
           (0,1.768,.032,.031,.041), (0,1.771,.032,.002,.003)],
           linear_hex('B5AA93'), 24, .0014)
    for j in range(3):
        centres = []
        for i in range(25):
            t = TAU*i/24
            centres.append(Vector((.083*math.cos(t),
                                   1.691+j*.015+.005*math.sin(t+.6),
                                   .032+.106*math.sin(t)))*ratio)
        p, f = tube(centres, [.0065*ratio]*25, 4)
        add('ClothFold'+str(j), p, f, materials['cloth'], linear_hex('B5AA93'))

    # Natural imported hands; inner hand is curled around the shaft's centreline.
    hp, hf = subset(raw, source_faces, 'hand')
    grip = Vector((sign*.53, 1.38, .24))*ratio
    posed, wrist = hand_pose(hp, True, sign, grip, height)
    ob = add('GrippingHand', posed, hf, materials['skin'], skin, moves=True)
    reduce_mesh(ob, 850)
    # Sleeve root is closed and buried inside the continuous cloth yoke.
    # No separate spherical shoulder pad: the moving seam stays under fabric.
    elbow = Vector((sign*.305, 1.165, .075))*ratio
    inset = shoulder + Vector((-sign*.033, -.020, 0))*ratio
    path = [inset, shoulder, shoulder.lerp(elbow,.22), shoulder.lerp(elbow,.55),
            shoulder.lerp(elbow,.84), elbow, elbow.lerp(wrist,.24),
            elbow.lerp(wrist,.58), elbow.lerp(wrist,.88), wrist,
            wrist+(wrist-elbow).normalized()*.014*ratio]
    p, f = tube(path, [v*ratio for v in (.055,.075,.084,.078,.065,.063,.068,.054,.039,.034,.032)],
                16, .11, caps=True)
    add('MovingSleeve', p, f, materials['cloth'], cloth, moves=True)

    outer = -sign
    rest_hand = Vector((outer*.285, .80, .045))*ratio
    posed, rest_wrist = hand_pose(hp, False, outer, rest_hand, height)
    ob = add('RestingHand', posed, hf, materials['skin'], skin)
    reduce_mesh(ob, 750)
    a = Vector((outer*.195,1.43,0))*ratio
    b = Vector((outer*.270,1.16,-.005))*ratio
    inset = a + Vector((-outer*.033, -.020, 0))*ratio
    path = [inset, a, a.lerp(b,.25), a.lerp(b,.56), a.lerp(b,.82), b,
            b.lerp(rest_wrist,.17), b.lerp(rest_wrist,.35),
            b.lerp(rest_wrist,.67), b.lerp(rest_wrist,.88), rest_wrist]
    p, f = tube(path, [v*ratio for v in (.055,.074,.083,.077,.064,.060,
                                      .064,.057,.046,.038,.033)], 16, .10, caps=True)
    add('RestSleeve', p, f, materials['cloth'], cloth)

    # Whole spear is exactly 2.3 m on BOTH guards, not scaled by character height.
    direction = Vector((sign*.8, .6, 0))
    # Depth separation lets the X cross visually without two shafts intersecting.
    # Offset the whole moving group/shoulder consistently, not the hand alone.
    base = grip-direction*.53
    tip = base+direction*2.30
    shaft_end = tip-direction*.19
    p, f = tube([base, base+direction*.025, shaft_end], [.016,.0165,.014], 12, caps=True)
    add('Shaft', p, f, materials['leather'], wood, moves=True)
    p, f = tube([shaft_end-direction*.065, shaft_end+direction*.015], [.017,.014], 10, caps=True)
    add('Socket', p, f, materials['metal'], iron, moves=True)
    # Faceted lenticular spearhead, forged ridge and narrow leaf silhouette.
    across = Vector((direction.y, -direction.x, 0))
    thick = Vector((0, 0, 1))
    points, faces = [], []
    for distance, width, depth in ((.0,.012,.003),(.052,.029,.004),(.135,.012,.0025)):
        centre = shaft_end+direction*distance
        points.extend((centre+across*width, centre+thick*depth,
                       centre-across*width, centre-thick*depth))
    for j in range(2):
        for i in range(4):
            faces.append((j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i))
    points.append(tip)
    for i in range(4):
        faces.append((8+i,8+(i+1)%4,12))
    faces.append((3,2,1,0))
    add('Spearhead', points, faces, materials['metal'], iron, moves=True, smooth_faces=False)

    # Separate crossing depth by 5 cm in world space; rigid shoulder/hand contact
    # remains unchanged, and the shoulder overlap hides the 2.5 cm adjustment.
    depth_offset = .025 if sign == 1 else -.025
    pivot.location += xyz((0, 0, depth_offset))
    pivot['crossing_depth_offset_m'] = depth_offset
    root['spear_length_m'] = 2.3
    return {'root':root, 'pivot':pivot, 'static':static, 'moving':moving,
            'shoulder':shoulder, 'base':base, 'tip':tip, 'sign':sign, 'height':height}


def finish_surface(mesh):
    """Bake triangles, orient closed islands outward, then reproject final UVs.

    UVs intentionally tile/overlap: they sample only the shared roughness image,
    not a unique atlas for baking. Projection after decimation also covers caps.
    Open textile hems retain their explicitly authored outward winding.
    """
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        remaining = set(bm.faces)
        while remaining:
            seed = remaining.pop()
            island, pending = [seed], [seed]
            while pending:
                face = pending.pop()
                for edge in face.edges:
                    for neighbour in edge.link_faces:
                        if neighbour in remaining:
                            remaining.remove(neighbour)
                            island.append(neighbour)
                            pending.append(neighbour)
            if all(len(edge.link_faces) == 2 for face in island for edge in face.edges):
                bmesh.ops.recalc_face_normals(bm, faces=island)
                origin = island[0].verts[0].co.copy()
                volume = 0.0
                for face in island:
                    a, b, c = [v.co-origin for v in face.verts]
                    volume += a.dot(b.cross(c))/6.0
                if volume < 0:
                    bmesh.ops.reverse_faces(bm, faces=island)
        bm.normal_update()
        bm.to_mesh(mesh)
    finally:
        bm.free()
    mesh.update()
    uv_layer = mesh.uv_layers.active
    for poly in mesh.polygons:
        magnitudes = [abs(poly.normal[k]) for k in range(3)]
        axis = magnitudes.index(max(magnitudes))
        axes = [k for k in range(3) if k != axis]
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            uv_layer.data[li].uv = (co[axes[0]]*16, co[axes[1]]*16)
    mesh.update()


def merge_parts(parts, name, parent, collection):
    """Data-only merge, preserving normals' smooth flags, face UV and Col.

    All components already share one local coordinate frame and identity object
    transforms. Keep material indices compact; one mesh per rigid assembly.
    """
    points, faces, colors, loop_uv, mids, smoothing, materials = [], [], [], [], [], [], []
    for obj in parts:
        mesh = obj.data
        first = len(points)
        points.extend(v.co.copy() for v in mesh.vertices)
        colour = mesh.color_attributes.get('Col')
        if colour is None or colour.domain != 'POINT':
            raise RuntimeError('Decimation lost point colours: '+obj.name)
        colors.extend(tuple(item.color) for item in colour.data)
        remap = []
        for mat in mesh.materials:
            if mat not in materials:
                materials.append(mat)
            remap.append(materials.index(mat))
        uv = mesh.uv_layers.active
        if uv is None:
            raise RuntimeError('Missing UV layer: '+obj.name)
        for poly in mesh.polygons:
            faces.append(tuple(first+i for i in poly.vertices))
            mids.append(remap[poly.material_index])
            smoothing.append(poly.use_smooth)
            loop_uv.extend(tuple(uv.data[li].uv) for li in poly.loop_indices)
    mesh = mark(bpy.data.meshes.new(name))
    mesh.from_pydata(points, [], faces)
    for mat in materials:
        mesh.materials.append(mat)
    col = mesh.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    for i, value in enumerate(colors):
        col.data[i].color = value
    mesh.color_attributes.active_color_index = 0
    mesh.color_attributes.render_color_index = 0
    uv = mesh.uv_layers.new(name='UVMap')
    for i, value in enumerate(loop_uv):
        uv.data[i].uv = value
    for i, poly in enumerate(mesh.polygons):
        poly.material_index = mids[i]
        poly.use_smooth = smoothing[i]
    mesh.update()
    finish_surface(mesh)
    obj = mark(bpy.data.objects.new(name, mesh))
    collection.objects.link(obj)
    obj.parent = parent
    for old in parts:
        data = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if data.users == 0 and own(data):
            bpy.data.meshes.remove(data)
    return obj


def orient_closed_components(objects):
    """Final pre-export pass; only reverse genuinely negative closed volumes.

    Use scalar Python doubles and a nearby origin: mathutils cross/dot use
    float precision, which can lose the volume of small parts in world space.
    No normal recalculation or reversal is applied to any open component.
    """
    bpy.context.view_layer.update()
    for obj in objects:
        bm = bmesh.new()
        flipped, closed_count, open_count = 0, 0, 0
        try:
            bm.from_mesh(obj.data)
            # finish_surface has already triangulated these final meshes.
            if any(len(f.verts) != 3 for f in bm.faces):
                raise RuntimeError('Final normal pass requires triangles: '+obj.name)
            remaining = set(bm.verts)
            while remaining:
                seed = remaining.pop()
                vertices, pending = [seed], [seed]
                while pending:
                    vertex = pending.pop()
                    for edge in vertex.link_edges:
                        other = edge.other_vert(vertex)
                        if other in remaining:
                            remaining.remove(other)
                            vertices.append(other)
                            pending.append(other)
                edges = {edge for vertex in vertices for edge in vertex.link_edges}
                if not edges or any(len(edge.link_faces) != 2 for edge in edges):
                    open_count += 1
                    continue
                faces = {face for vertex in vertices for face in vertex.link_faces}
                closed_count += 1
                origin = tuple(vertices[0].co)
                terms, qa_terms = [], []
                for face in faces:
                    a, b, c = [tuple(float(v.co[k])-origin[k] for k in range(3))
                               for v in face.verts]
                    terms.append((a[0]*(b[1]*c[2]-b[2]*c[1])
                                  + a[1]*(b[2]*c[0]-b[0]*c[2])
                                  + a[2]*(b[0]*c[1]-b[1]*c[0]))/6.0)
                    wa, wb, wc = [obj.matrix_world @ v.co for v in face.verts]
                    qa_terms.append(wa.dot(wb.cross(wc))/6.0)
                volume = math.fsum(terms)
                qa_volume = math.fsum(qa_terms)
                if volume < 0:
                    bmesh.ops.reverse_faces(bm, faces=list(faces))
                    flipped += 1
                    print('GUARDS_NORMAL_FLIP',obj.name,'verts',len(vertices),
                          'signed_volume',volume)
                    qa_volume = -qa_volume
                if qa_volume < -1e-9 and volume != 0:
                    # Diagnostic only: never invert an outward part to satisfy
                    # a numerically unstable world-origin float32 calculation.
                    centre = obj.matrix_world @ (sum((v.co for v in vertices),Vector())/len(vertices))
                    print('GUARDS_QA_VOLUME_PRECISION',obj.name,'verts',len(vertices),
                          'world_centre',tuple(centre),'outward_volume',abs(volume),
                          'world_float_volume',qa_volume)
            if flipped:
                bm.normal_update()
                bm.to_mesh(obj.data)
                obj.data.update()
        finally:
            bm.free()
        print('GUARDS_FINAL_NORMALS',obj.name,'closed',closed_count,
              'open_untouched',open_count,'flipped',flipped)


def validate(guards, meshes):
    bpy.context.view_layer.update()
    total = sum(triangles(obj) for obj in meshes)
    if total > MAX_TRIS:
        raise RuntimeError('Triangle budget exceeded; no GLB written: '+str(total))
    report = []
    for obj in meshes:
        if any(abs(s-1) > 1e-6 for s in obj.scale):
            raise RuntimeError('Non-unit scale: '+obj.name)
        if any(not math.isfinite(c) for v in obj.data.vertices for c in v.co):
            raise RuntimeError('Non-finite vertex: '+obj.name)
        bad = sum(1 for p in obj.data.polygons if p.area < 1e-11)
        if bad:
            raise RuntimeError('Degenerate faces in '+obj.name+': '+str(bad))
        bm = bmesh.new()
        try:
            bm.from_mesh(obj.data)
            nonmanifold = sum(1 for e in bm.edges if len(e.link_faces) > 2)
            boundaries = sum(1 for e in bm.edges if e.is_boundary)
        finally:
            bm.free()
        if nonmanifold:
            raise RuntimeError('Non-manifold junctions: '+obj.name)
        report.append((obj.name, triangles(obj), boundaries))
    for guard in guards:
        root, pivot = guard['root'], guard['pivot']
        if pivot.parent != root or root.parent is not None:
            raise RuntimeError('Broken web hierarchy')
        base, tip, shoulder = guard['base'], guard['tip'], guard['shoulder']
        if abs((tip-base).length-2.3) > 1e-6:
            raise RuntimeError('Wrong spear length')
        x0 = web(root.location).x
        s = guard['sign']
        # Linear centreline crosses world x=0 within the requested height band.
        t = -(x0+base.x)/(tip.x-base.x)
        crossing_y = base.y+t*(tip.y-base.y)
        if not 0 < t < 1 or not 1.0 <= crossing_y <= 2.5:
            raise RuntimeError('Closed spears do not cross in required height band')
        delta = s*(OPEN-CLOSED)
        endpoints = [turn_web_z(p-shoulder,delta)+shoulder for p in (base,tip)]
        # 16.5 mm shaft radius and 29 mm blade width margin, beyond x=+/-1.3.
        inward = max(s*(x0+p.x) for p in endpoints)
        if inward + .030 > -1.30:
            raise RuntimeError('Open spear does not clear 2.6 m doorway: '+str(inward))
        print('GUARD_PIVOT', root.name, 'closed',s*CLOSED,'open',s*OPEN,
              'crossing_y',round(crossing_y,3),'open_inner_x',round(inward+.030,3))
        local_heights = [v.co.z for ob in meshes if ob.parent == root for v in ob.data.vertices]
        if abs(min(local_heights)) > .002:
            raise RuntimeError('Boot soles are not on floor zero')
    print('GUARDS_QA tris=', total, 'meshes/tris/intentional_boundary_edges=', report)
    print('GUARDS_QA visual review and exported GLB read-back still required by user.')
    return total


def camera(scene, collection):
    data = mark(bpy.data.cameras.new('NG861_ReviewCamera'))
    obj = mark(bpy.data.objects.new('NG861_ReviewCamera', data))
    collection.objects.link(obj)
    obj.location = xyz((4.8, 2.7, 12.7))
    target = xyz((0, 1.25, 5.50))
    obj.rotation_euler = (target-obj.location).to_track_quat('-Z','Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = 5.9
    data.lens = 52
    scene.camera = obj
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'VERTEX'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.show_specular_highlight = False
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100


def preview(scene, guards):
    # Blender 5.x keyframe_insert creates slotted actions; no legacy fcurves API.
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, 100
    for guard in guards:
        pivot, sign = guard['pivot'], guard['sign']
        for frame, angle in ((1,CLOSED),(16,CLOSED),(48,OPEN),(70,OPEN),(100,CLOSED)):
            pivot.rotation_euler[1] = -sign*angle
            pivot.keyframe_insert(data_path='rotation_euler', index=1, frame=frame)
        action = pivot.animation_data.action
        mark(action)
        action.name = 'NG861_PREVIEW_ONLY_'+pivot.name
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for key in fc.keyframe_points:
                            key.interpolation = 'BEZIER'
                            key.handle_left_type = 'AUTO_CLAMPED'
                            key.handle_right_type = 'AUTO_CLAMPED'
    scene.frame_set(1)


def export_glb(scene, guards, meshes):
    objects = meshes+[g['root'] for g in guards]+[g['pivot'] for g in guards]
    for obj in scene.objects:
        obj.select_set(False)
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    settings = dict(filepath=EXPORT_PATH, export_format='GLB', use_selection=True,
                    use_active_scene=True, export_animations=False, export_skins=False,
                    export_morph=False, export_cameras=False, export_lights=False,
                    export_apply=True, export_yup=True, export_normals=True,
                    export_texcoords=True, export_vertex_color='ACTIVE',
                    export_image_format='WEBP', export_image_quality=82,
                    export_meshopt_compression_enable=True, export_extras=True)
    # Prefer the extension expected by the project's web loader, if selectable.
    if 'export_meshopt_extension' in props:
        values = {v.identifier for v in props['export_meshopt_extension'].enum_items}
        if 'EXT_meshopt_compression' in values:
            settings['export_meshopt_extension'] = 'EXT_meshopt_compression'
    result = bpy.ops.export_scene.gltf(**settings)
    if 'FINISHED' not in result:
        raise RuntimeError('glTF exporter did not finish: '+str(result))
    print('GUARDS_EXPORT operator FINISHED:',EXPORT_PATH,'Meshopt + WebP requested; no blend save.')


def build():
    existing = preflight()
    window = bpy.context.window
    original_scene = window.scene
    scene = existing or mark(bpy.data.scenes.new(SCENE_NAME))
    try:
        window.scene = scene
        clean_owned(scene)
        collection = mark(bpy.data.collections.new('NG861_Guards'))
        scene.collection.children.link(collection)
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[collection.name]
        scene.unit_settings.system = 'METRIC'
        scene.unit_settings.scale_length = 1
        raw, faces = source_body(scene, collection)
        mats = {
            'skin':material('Skin',.67,image=rough_image('SkinRoughness',.67,.035)),
            'cloth':material('Textiles',.94,image=rough_image('ClothRoughness',.94,.045,True),specular=.2),
            'leather':material('LeatherWood',.72,image=rough_image('LeatherRoughness',.72,.065)),
            'metal':material('ForgedIron',.52,metal=1),
            'eye':material('Eyes',.34),
        }
        guards = [build_guard('Left',1,1.76,raw,faces,mats,collection),
                  build_guard('Right',-1,1.81,raw,faces,mats,collection)]
        meshes = []
        for guard in guards:
            label = guard['root'].name
            meshes.append(merge_parts(guard['static'],'NG861_'+label+'_Body',guard['root'],collection))
            meshes.append(merge_parts(guard['moving'],'NG861_'+label+'_ArmSpear',guard['pivot'],collection))
        orient_closed_components(meshes)
        total = validate(guards,meshes)
        scene['guard_pair_triangles'] = total
        scene['guard_review_status'] = 'Awaiting user visual QA; see source docstring'
        if REVIEW_CAMERA:
            camera(scene,collection)
        if DO_EXPORT:
            export_glb(scene,guards,meshes)
        if PREVIEW_ANIMATION:
            preview(scene,guards)
        print('GUARDS_BUILD complete:',SCENE_NAME,'triangles=',total,
              'nodes=GuardLeft/Right > SpearLeft/Right; switch to owned scene to review.')
    finally:
        window.scene = original_scene


# Text Editor Run Script and MCP snippets do not share a reliable __name__.
build()
