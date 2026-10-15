"""Monta uma prévia editável do rio no mesmo .blend. Execute após build_nilo.py.
Os materiais de água desta prévia são do Blender; no site a água é um shader WebGL.
"""
import bpy, math, random
from mathutils import Vector
random.seed(861)
interior=bpy.data.scenes.get('Nilo • atelier')
river_scene=bpy.data.scenes.get('Nilo • rio') or bpy.data.scenes.new('Nilo • rio')
bpy.context.window.scene=river_scene
for obj in list(river_scene.objects):bpy.data.objects.remove(obj,do_unlink=True)
def river_pos(x,y,z):return (x,-z,y)
def river_material(name,tone,roughness):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*tone,1);mat.use_nodes=True
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*tone,1);bs.inputs['Roughness'].default_value=roughness
    return mat
water_mat=river_material('Rio • reflexo verde-azulado',(.035,.12,.115),.21)
bs=next(n for n in water_mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
noise=water_mat.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4.5;noise.inputs['Detail'].default_value=2
bump=water_mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.07
water_mat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);water_mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
soil=river_material('Margens • aluvião',(.19,.17,.08),.95)
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,180,0));water_obj=bpy.context.object;water_obj.name='Nilo • água';water_obj.scale=(200,380,1);water_obj.data.materials.append(water_mat)
for side in [-1,1]:
    verts=[];faces=[]
    for i in range(71):
        z=80-i*10;edge=side*45+math.sin(z*.013)*6+math.sin(z*.039)*2.4
        for offset,y in [(-4,-.6),(0,.12),(6,.75),(18,1.5),(180,3)]:verts.append(river_pos(edge+side*offset,y,z))
        if i:
            for j in range(4):
                a=(i-1)*5+j;faces.append((a,a+1,a+6,a+5))
    mesh=bpy.data.meshes.new('Margem');mesh.from_pydata(verts,[],faces);mesh.materials.append(soil);mesh.update()
    ob=bpy.data.objects.new('Margem oeste' if side<0 else 'Margem leste',mesh);river_scene.collection.objects.link(ob)
    for i in range(40):
        z=50-i*12+random.random()*8;x=side*(53+random.random()*20)+math.sin(z*.013)*6
        source=interior.objects.get('PalmA' if i%2 else 'PalmB');ob=source.copy();ob.data=source.data;ob.name='Tamareira';river_scene.collection.objects.link(ob)
        ob.hide_set(False);ob.hide_render=False;ob.location=river_pos(x,1,z);scale=.8+random.random()*.35;ob.scale=(scale,scale,scale);ob.rotation_euler.z=random.random()*6.28
    for i in range(100):
        z=70-i*5+random.random()*6;x=side*45+math.sin(z*.013)*6+math.sin(z*.039)*2.4
        source=interior.objects.get('Papyrus');ob=source.copy();ob.data=source.data;ob.name='Papiros';river_scene.collection.objects.link(ob)
        ob.hide_set(False);ob.hide_render=False;ob.location=river_pos(x,.1,z);ob.rotation_euler.z=random.random()*6.28
source=interior.objects.get('Pavilion');ob=source.copy();ob.data=source.data;ob.name='Nilômetro • exterior';river_scene.collection.objects.link(ob);ob.hide_set(False);ob.hide_render=False;ob.location=river_pos(0,1,-230);ob.scale=(1.35,1.35,1.35)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=12,location=river_pos(0,-.5,-265));island=bpy.context.object;island.name='Ilha • margem inundável';island.scale=(28,70,2);island.data.materials.append(soil)
world=bpy.data.worlds.new('Nilo • céu da tarde');world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sun_elevation=.15;sky.sun_rotation=2.3;bg.inputs['Strength'].default_value=.3
world.node_tree.links.new(sky.outputs['Color'],bg.inputs[0]);river_scene.world=world
sun_data=bpy.data.lights.new('Sol • fim da tarde','SUN');sun_data.energy=2.5;sun_data.angle=.12;sun_data.color=(1,.78,.52)
sun=bpy.data.objects.new('Sol • fim da tarde',sun_data);river_scene.collection.objects.link(sun);sun.rotation_euler=(.8,-.6,-.6)
cam_data=bpy.data.cameras.new('Passeio pelo Nilo');cam=bpy.data.objects.new('Passeio pelo Nilo',cam_data);river_scene.collection.objects.link(cam);cam.location=river_pos(4,3.2,-140)
cam.rotation_euler=(Vector(river_pos(0,4,-230))-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.lens=25;river_scene.camera=cam
river_scene.render.resolution_x=1440;river_scene.render.resolution_y=900;river_scene.render.resolution_percentage=60
# A cena interior é deixada em foco para a revisão do usuário.
bpy.context.window.scene=interior
old_water=interior.objects.get('Água • prévia Blender')
if old_water:bpy.data.objects.remove(old_water,do_unlink=True)
water_mesh=bpy.data.meshes.new('Superfície do poço')
water_mesh.from_pydata([(2.33*math.cos(i*math.pi/24),2.33*math.sin(i*math.pi/24),-9.3) for i in range(48)],[],[tuple(range(48))])
water_mesh.materials.append(water_mat);water_mesh.update()
pool=bpy.data.objects.new('Água • prévia Blender',water_mesh);interior.collection.objects.link(pool)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/alkim/site-Nilo/art/nilo.blend')
print('Cenas disponíveis:',[s.name for s in bpy.data.scenes])
