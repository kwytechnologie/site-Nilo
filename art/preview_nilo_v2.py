"""Prévia editável de rio, entrada e interior. Executar após os dois geradores v2.
Não exporta a água: o navegador usa o shader próprio de water.js.
"""
import bpy, math, random
from mathutils import Vector
ROOT='C:/Users/alkim/site-Nilo'
architecture=bpy.data.scenes['Nilo • arquitetura v2']
guards=bpy.data.scenes['Nilo • guardas']
for obj in guards.objects:
    if obj.type in {'MESH','EMPTY'} and obj.name not in architecture.objects:architecture.collection.objects.link(obj)
for name,sign in [('SpearLeft',1),('SpearRight',-1)]:
    obj=bpy.data.objects[name]
    for frame,angle in [(1,-.25),(45,-.25),(100,.70)]:
        obj.rotation_euler.y=-sign*angle
        obj.keyframe_insert(data_path='rotation_euler',index=1,frame=frame)
architecture.frame_set(1)

river=bpy.data.scenes.get('Nilo • rio v2') or bpy.data.scenes.new('Nilo • rio v2')
bpy.context.window.scene=river
for obj in list(river.objects):bpy.data.objects.remove(obj,do_unlink=True)
def xyz(p):return (p[0],-p[2],p[1])
def mat(name,tone,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*tone,1);n.inputs['Roughness'].default_value=rough;m.diffuse_color=(*tone,1)
    return m
water=mat('Água do Nilo • prévia v2',(.025,.095,.072),.22)
bs=next(n for n in water.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
noise=water.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=3.8;noise.inputs['Detail'].default_value=2
bump=water.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.06
water.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);water.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
soil=mat('Aluvião e ilhas • v2',(.20,.19,.09),.96)
def mesh(name,verts,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.materials.append(material);data.update()
    ob=bpy.data.objects.new(name,data);river.collection.objects.link(ob);return ob
# Rio recortado sob o edifício: a água exterior não atravessa o poço.
for i,(left,right,front,back) in enumerate([(-200,-5,80,-600),(5,200,80,-600),(-5,5,80,-224.8),(-5,5,-235.2,-600)]):
    mesh('Rio • água '+str(i),[(left,0,front),(right,0,front),(right,0,back),(left,0,back)],[(0,1,2,3)],water)
# Água do poço também aparece na cena de arquitetura.
pool=mesh('Poço • água v2',[(2.33*math.cos(i*math.tau/64),-9.3,2.33*math.sin(i*math.tau/64)) for i in range(64)],[tuple(reversed(range(64)))],water)
river.collection.objects.unlink(pool);architecture.collection.objects.link(pool)
mount=bpy.data.objects.new('Edifício e guardas • referência comum',None);river.collection.objects.link(mount);mount.location=xyz((0,1,-230))
copies={}
for source in architecture.objects:
    if source.type=='CAMERA':continue
    ob=source.copy();river.collection.objects.link(ob);copies[source.name]=ob
for source in architecture.objects:
    if source.name not in copies:continue
    ob=copies[source.name];ob.parent=copies.get(source.parent.name) if source.parent else mount
    ob.hide_set(False)
# Island skin follows the square foundation and the elliptical river bank.
verts=[];faces=[];n=96
for ring in range(2):
    for i in range(n):
        t=math.tau*i/n
        if ring==0:
            r=4.66/max(abs(math.cos(t)),abs(math.sin(t)));verts.append((r*math.cos(t),.95,-230+r*math.sin(t)))
        else:verts.append((28*math.cos(t),-.12,-270+66*math.sin(t)))
for i in range(n):
    j=(i+1)%n;faces.append((i,j,n+j,n+i))
mesh('Roda • margem com abertura do poço',verts,faces,soil)
bpy.ops.import_scene.gltf(filepath=ROOT+'/public/models/vegetation.glb')
prototypes={ob.name.split('.')[0]:ob for ob in bpy.context.selected_objects if ob.type=='MESH'}
random.seed(861)
for side in [-1,1]:
    verts=[];faces=[]
    for i in range(61):
        z=80-i*10;edge=side*45+math.sin(z*.013)*6+math.sin(z*.039)*2.4
        for off,y in [(-4,-.5),(0,.12),(8,.9),(160,2.5)]:verts.append((edge+side*off,y,z))
        if i:
            for j in range(3):
                a=(i-1)*4+j;faces.append((a,a+1,a+5,a+4))
    mesh('Margem '+str(side),verts,faces,soil)
    for i in range(80):
        palm=i<25;source=prototypes.get('PalmA' if i%2 else 'PalmB') if palm else prototypes.get('Papyrus')
        if source is None:continue
        ob=source.copy();ob.data=source.data;river.collection.objects.link(ob)
        z=60-i*(20 if palm else 6.5);x=side*(56 if palm else 45)+math.sin(z*.013)*6
        ob.location=xyz((x,1 if palm else .1,z));ob.rotation_euler.z=random.random()*math.tau
        size=.75+random.random()*.4;ob.scale=(size,size,size)
for ob in prototypes.values():ob.hide_set(True);ob.hide_render=True
world=bpy.data.worlds.new('Céu da tarde • v2');world.use_nodes=True;river.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sun_elevation=.18;sky.sun_rotation=2.3;bg.inputs['Strength'].default_value=.30
world.node_tree.links.new(sky.outputs['Color'],bg.inputs[0])
sun_data=bpy.data.lights.new('Sol v2','SUN');sun_data.energy=2;sun_data.angle=.12;sun_data.color=(1,.82,.62)
sun=bpy.data.objects.new('Sol v2',sun_data);river.collection.objects.link(sun);sun.rotation_euler=(.8,-.6,-.6)
data=bpy.data.cameras.new('Rio e entrada • passeio v2');cam=bpy.data.objects.new(data.name,data);river.collection.objects.link(cam);river.camera=cam;data.lens=22
for frame,pos,target in [(1,(0,3,-195),(0,4,-230)),(100,(0,2.62,-226.2),(0,2.5,-230)),(135,(0,2.62,-226.2),(0,10.8,-230)),(160,(1.8,2.62,-226.6),(0,-1,-230)),(200,(-2.35,-.7,-227.58),(0,-4,-230))]:
    cam.location=xyz(pos);cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert(data_path='location',frame=frame);cam.keyframe_insert(data_path='rotation_euler',frame=frame)
river.frame_end=200;river.render.fps=30;river.render.engine='BLENDER_EEVEE';river.render.resolution_x=1440;river.render.resolution_y=1000;river.render.resolution_percentage=75
river.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/nilo-revisao.blend')
print('Prévia v2 salva: rio, arquitetura, água e guardas. Timeline 1–200.')
