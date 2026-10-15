"""Nilo: modelos leves editáveis, construídos no Blender 5.2.

Execute no Blender pelo MCP ou `blender -b --python art/build_nilo.py`.
Unidades em metros. A geometria é descrita no referencial Y-up da web e
convertida para Z-up do Blender; glTF restaura Y-up na exportação.
Interpretação artística de Roda, não levantamento arqueológico.
"""
import bpy, bmesh, math, random
from mathutils import Vector
from math import sin, cos, pi

ROOT = 'C:/Users/alkim/site-Nilo'
random.seed(861)
scene = bpy.data.scenes.get('Nilo • atelier') or bpy.data.scenes.new('Nilo • atelier')
bpy.context.window.scene = scene
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

def xyz(p): return (p[0], -p[2], p[1])
def color(tone_hex):
    h=tone_hex.lstrip('#'); v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v)+(1,)

materials=[]
def material(name, tone, rough=.9, metal=0, texture=False):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=color(tone)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal
    m.diffuse_color=color(tone)
    if texture:
        for key, target in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
            tex=m.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image=bpy.data.images.load(ROOT+'/art/textures/sandstone_'+key+'.jpg',check_existing=True)
            if key!='Diffuse': tex.image.colorspace_settings.name='Non-Color'
            if key=='nor_gl':
                normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.58
                m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
                m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
            else:m.node_tree.links.new(tex.outputs['Color'],bs.inputs[target])
        vertex=m.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Col'
        diffuse=next(n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and 'Diffuse' in n.image.name)
        multiply=m.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
        m.node_tree.links.new(diffuse.outputs['Color'],multiply.inputs[1]);m.node_tree.links.new(vertex.outputs['Color'],multiply.inputs[2])
        m.node_tree.links.new(multiply.outputs[0],bs.inputs['Base Color'])
    materials.append(m);return len(materials)-1

STONE=material('Arenito • Poly Haven CC0','#c8b28e',texture=True)
MARBLE=material('Calcário claro • coluna','#d6d0b8',.5)
WET=material('Pedra úmida • nível das cheias','#506454',.68)
CARVE=material('Incisões e juntas','#5a5545',.94)
WOOD=material('Cedro envelhecido','#5d4129',.84)
LAPIS=material('Azul mineral do pavilhão','#16373f',.75)
GOLD=material('Ocre e latão envelhecido','#a7864d',.55,.25)
LEAF=material('Vegetação • cores nos vértices','#ffffff',.93)
leaf_node=materials[LEAF].node_tree.nodes.new('ShaderNodeVertexColor');leaf_node.layer_name='Col'
leaf_bs=next(n for n in materials[LEAF].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
materials[LEAF].node_tree.links.new(leaf_node.outputs['Color'],leaf_bs.inputs['Base Color'])
GLOW=material('Luz das lanternas','#ffcf82',.65)
bs=next(n for n in materials[GLOW].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bs.inputs['Emission Color'].default_value=color('#ffd39a');bs.inputs['Emission Strength'].default_value=2

def new_model(name):return {'name':name,'v':[],'f':[],'mi':[],'uv':[],'col':[]}
def face(model,points,mat=STONE,uv=None,tint=(1,1,1,1)):
    start=len(model['v']);model['v'].extend(xyz(p) for p in points)
    model['f'].append(tuple(range(start,start+len(points))));model['mi'].append(mat)
    if uv is None:
        n=(Vector(points[1])-Vector(points[0])).cross(Vector(points[2])-Vector(points[0]))
        absolute=[abs(n[k]) for k in range(3)];axis=absolute.index(max(absolute))
        axes=[k for k in range(3) if k!=axis]
        uv=[(p[axes[0]]/3,p[axes[1]]/3) for p in points]
    model['uv'].extend(uv);model['col'].extend([tint]*len(points))
def box(model,c,size,mat=STONE,angle=0,tint=(1,1,1,1)):
    x,y,z=c;w,h,d=[s/2 for s in size]
    pts=[(a*w,b*h,k*d) for a,b,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    p=[(x+a*cos(angle)-k*sin(angle),y+b,z+a*sin(angle)+k*cos(angle)) for a,b,k in pts]
    for ids in [(3,2,1,0),(4,5,6,7),(0,1,5,4),(2,3,7,6),(1,2,6,5),(3,0,4,7)]:face(model,[p[i] for i in ids],mat,tint=tint)
def cylinder(model,c,r,h,mat=STONE,n=16,r2=None,tint=(1,1,1,1)):
    x,y,z=c;r2=r if r2 is None else r2
    lo=[(x+r*cos(i*2*pi/n),y-h/2,z+r*sin(i*2*pi/n)) for i in range(n)]
    hi=[(x+r2*cos(i*2*pi/n),y+h/2,z+r2*sin(i*2*pi/n)) for i in range(n)]
    for i in range(n):
        j=(i+1)%n;face(model,[lo[j],lo[i],hi[i],hi[j]],mat,[(j/n*2,0),(i/n*2,0),(i/n*2,h/3),(j/n*2,h/3)],tint)
    face(model,list(reversed(lo)),mat,tint=tint);face(model,hi,mat,tint=tint)
def rod(model,a,b,r,mat=WOOD,n=5,tint=(1,1,1,1)):
    a,b=Vector(a),Vector(b);d=(b-a).normalized();v=d.cross(Vector((0,1,0)))
    if v.length<.01:v=d.cross(Vector((1,0,0)))
    v.normalize();w=d.cross(v)
    for i in range(n):
        u=i*2*pi/n;q=(i+1)*2*pi/n
        off=v*cos(u)*r+w*sin(u)*r;off2=v*cos(q)*r+w*sin(q)*r
        face(model,[a+off,a+off2,b+off2,b+off],mat,tint=tint)
def finish(model):
    mesh=bpy.data.meshes.new(model['name']);mesh.from_pydata(model['v'],[],model['f']);mesh.update()
    for m in materials:mesh.materials.append(m)
    for p,m in zip(mesh.polygons,model['mi']):p.material_index=m
    uv=mesh.uv_layers.new(name='UVMap')
    attr=mesh.color_attributes.new(name='Col',type='BYTE_COLOR',domain='CORNER')
    for i,loop in enumerate(mesh.loops):uv.data[i].uv=model['uv'][loop.vertex_index];attr.data[i].color=model['col'][loop.vertex_index]
    if model['name'] in ['Nilometer','Pavilion']:
        bm=bmesh.new();bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(model['name'],mesh);scene.collection.objects.link(obj)
    if model['name'] in ['Nilometer','Pavilion']:
        bevel=obj.modifiers.new('Arestas gastas • 8 mm','BEVEL');bevel.width=.008;bevel.segments=1
    return obj

def arch(model,width,spring,top,bottom,z,depth,mat=STONE,rotation=0):
    # Arco pontudo com aduelas de pedra; abertura real, sem plano opaco.
    half=width/2
    curve=[]
    for k in range(13):
        t=k/12
        curve.append((-half*(1-t)**.68,spring+(top-spring)*t))
    curve+= [(-x,y) for x,y in reversed(curve[:-1])]
    def p(x,y,d):return (x*cos(rotation)-d*sin(rotation),y,x*sin(rotation)+d*cos(rotation))
    for i in range(len(curve)-1):
        a,b=curve[i],curve[i+1]
        # Moldura extrudida com juntas discretas entre aduelas.
        def outer(q):return (q[0]*(1+.24/half),q[1]+.22)
        aa,bb=outer(a),outer(b)
        for zz in [z-depth/2,z+depth/2]:face(model,[p(*a,zz),p(*b,zz),p(*bb,zz),p(*aa,zz)],mat)
        face(model,[p(*a,z-depth/2),p(*a,z+depth/2),p(*b,z+depth/2),p(*b,z-depth/2)],mat)
        if i%2==0:rod(model,p(*a,z+.01),p(*aa,z+.01),.007,CARVE,3)
    for sign in [-1,1]:
        c=p(sign*(half+.12),(bottom+spring)/2,z)
        box(model,c,(.24,spring-bottom,depth),mat,rotation)

def square_ring(m,outer,inner,y,thick,mat=STONE):
    box(m,(0,y-thick/2,-(outer+inner)/2),(outer*2,thick,outer-inner),mat)
    box(m,(0,y-thick/2,(outer+inner)/2),(outer*2,thick,outer-inner),mat)
    for s in [-1,1]:box(m,(s*(outer+inner)/2,y-thick/2,0),(outer-inner,thick,inner*2),mat)

def build_well():
    m=new_model('Nilometer');a=2.47;drop=3.12;floor=-11.4
    # Assises irrégulières, joints et chants réels; grandes surfaces UV à l'échelle.
    # Parede sul/oeste contínua; nichos nas faces norte/leste.
    for side in range(4):
        theta=side*pi/2
        def place(x,y,z):return (x*cos(theta)-z*sin(theta),y,x*sin(theta)+z*cos(theta))
        if side in [0,1]:
            for sign in [-1,1]:box(m,place(sign*2.05,-3.12,-3.12),(1.8,6.24,.34),STONE,theta)
            box(m,place(0,-6.12,-3.12),(2.3,.24,.34),STONE,theta)
            curve=[]
            for j in range(13):
                t=j/12;curve.append((-1.15*(1-t)**.68,-4.65+1.25*t))
            curve += [(-x,y) for x,y in reversed(curve[:-1])]
            for j in range(len(curve)-1):
                x,y=curve[j];xx,yy=curve[j+1]
                for depth in [-2.95,-3.29]:
                    face(m,[place(x,y,depth),place(xx,yy,depth),place(xx,0,depth),place(x,0,depth)],STONE,[(x/3,y/3),(xx/3,yy/3),(xx/3,0),(x/3,0)])
        else:
            box(m,place(0,-3.12,-3.12),(5.9,6.24,.34),STONE,theta)
        if side in [0,1]:
            # Nicho rebaixado em pedra, colunetas e moldura ogival.
            box(m,place(0,-4.72,-3.5),(2.6,2.7,.15),STONE,theta,(.57,.59,.53,1))
            arch(m,2.3,-4.65,-3.4,-6,-2.91,.25,STONE,theta)
            for s in [-1,1]:
                cylinder(m,place(s*1.14,-5.35,-2.84),.075,1.35,MARBLE,8)
                box(m,place(s*1.14,-4.63,-2.84),(.24,.13,.25),MARBLE,theta)
        # Faixa ornamental geométrica, não inventa inscrições sagradas.
        box(m,place(0,-1.45,-2.925),(5.6,.43,.026),LAPIS,theta)
        for yy in [-1.68,-1.22]:box(m,place(0,yy,-2.89),(5.63,.027,.03),GOLD,theta)
        for k in range(24):
            x=-2.62+k*.228
            pts=[place(x,-1.27,-2.87),place(x+.09,-1.45,-2.87),place(x,-1.63,-2.87),place(x-.09,-1.45,-2.87)]
            for edge in range(4):rod(m,pts[edge],pts[(edge+1)%4],.008,GOLD,3)
    # Parede circular; cor úmida cresce perto da água, em vez de brilho uniforme.
    for i in range(64):
        t=i*2*pi/64;u=(i+1)*2*pi/64
        for lo,hi in [(-11.4,-9.3),(-9.3,-8.75),(-8.75,-6.24)]:
            tint=(.32,.40,.33,1) if hi<=-9.3 else ((.48,.51,.41,1) if hi<=-8.75 else (.76,.79,.70,1))
            face(m,[(2.35*cos(t),lo,2.35*sin(t)),(2.35*cos(t),hi,2.35*sin(t)),(2.35*cos(u),hi,2.35*sin(u)),(2.35*cos(u),lo,2.35*sin(u))],STONE,[(t*.78,lo/3),(t*.78,hi/3),(u*.78,hi/3),(u*.78,lo/3)],tint)
    # Transição quadrado/círculo fechada, sem os vãos triangulares nos cantos.
    for i in range(64):
        t=i*2*pi/64;u=(i+1)*2*pi/64
        outer_t=2.95/max(abs(cos(t)),abs(sin(t)))
        outer_u=2.95/max(abs(cos(u)),abs(sin(u)))
        face(m,[(2.35*cos(t),-6.24,2.35*sin(t)),(outer_t*cos(t),-6.24,outer_t*sin(t)),(outer_u*cos(u),-6.24,outer_u*sin(u)),(2.35*cos(u),-6.24,2.35*sin(u))],STONE)
    cylinder(m,(0,floor-.12,0),2.35,.24,STONE,64,tint=(.36,.42,.35,1))
    # Escadas com nariz abaulado, dimensões preservadas do percurso da página.
    corners=[(a,a),(-a,a),(-a,-a)];run=(2*a-.96)/13
    for k in range(2):
        x,z=corners[k];ex,ez=corners[k+1];dx=(ex-x)/(2*a);dz=(ez-z)/(2*a)
        box(m,(x,-k*drop-.23,z),(.96,.46,.96))
        for j in range(13):
            yy=-k*drop-(j+1)*.24
            xx=x+dx*(.48+(j+.5)*run);zz=z+dz*(.48+(j+.5)*run)
            angle=math.atan2(dz,dx)
            box(m,(xx,yy-.25,zz),(run+.012,.5,.96),STONE,angle)
            box(m,(xx-dx*(run/2-.025),yy-.025,zz),(.055,.05,.95),MARBLE,angle,tint=(.72,.69,.61,1))
    box(m,(-a,-6.24-.23,-a),(.96,.46,.96))
    for j in range(21):
        th=5*pi/4+j*.165;yy=-6.24-(j+1)*.24
        # Wedge-shaped steps follow the curved wall without square protrusions.
        inner,outer=1.39,2.35;d=.184
        pts=[(r*cos(t),yy,r*sin(t)) for r,t in [(inner,th-d/2),(outer,th-d/2),(outer,th+d/2),(inner,th+d/2)]]
        face(m,pts,STONE,tint=(.84,.81,.73,1))
        for i in range(4):
            p,q=pts[i],pts[(i+1)%4]
            face(m,[p,(p[0],yy-.55,p[2]),(q[0],yy-.55,q[2]),q],STONE,tint=(.67,.66,.57,1))
    # Fuste octogonal, 16 côvados e subdivisões; inscrições abstratas não são usadas.
    base=-10.2;h=16*.5405
    cylinder(m,(0,-10.8,0),.48,1.2,MARBLE,8,r2=.42)
    for i in range(16):
        cylinder(m,(0,base+(i+.5)*.5405,0),.285-i*.001,.538,MARBLE,8)
        cylinder(m,(0,base+i*.5405,0),.288-i*.001,.012,CARVE,8)
        for tick in range(1,7):
            yy=base+(i+tick/7)*.5405
            box(m,(.05,yy,.278-i*.001),(.13 if tick%2 else .085,.009,.005),CARVE)
    # Capitel com folhas dobradas e volutas discretas.
    top=base+h
    cylinder(m,(0,top+.2,0),.29,.4,MARBLE,16,r2=.48)
    for ring in range(2):
        for i in range(8):
            th=i*pi/4+ring*pi/8;r=.28+ring*.09;y=top+ring*.25
            radial=Vector((cos(th),0,sin(th)));tangent=Vector((-sin(th),0,cos(th)))
            root=radial*r+Vector((0,y,0));tip=radial*(r+.22)+Vector((0,y+.45,0));mid=radial*(r+.12)+Vector((0,y+.22,0))
            face(m,[root-tangent*.12,mid-tangent*.18,tip,mid+tangent*.18,root+tangent*.12],MARBLE)
            rod(m,root,tip,.012,MARBLE,4)
    box(m,(0,top+.72,0),(1.18,.18,1.18),MARBLE)
    box(m,(0,top+.96,0),(6.7,.28,.32),WOOD)
    # Piso superior e pavilhão, aberturas e treliças projetam luz.
    square_ring(m,4.4,2.95,0,.35)
    for s in [-1,1]:
        box(m,(s*4.52,2.6,0),(.25,5.2,9),STONE)
        box(m,(0,2.6,s*4.52),(9,5.2,.25),STONE)
    for x in [-3.65,3.65]:
        for z in [-3.65,3.65]:
            cylinder(m,(x,2.3,z),.18,4.6,MARBLE,12)
            box(m,(x,4.7,z),(.62,.25,.62),MARBLE)
    square_ring(m,4.4,3.35,5.2,.25)
    for i in range(12):
        th=2*pi*i/12;nextTh=2*pi*(i+1)/12;r=3.36
        a=(r*cos(th),5.2,r*sin(th));b=(r*cos(nextTh),5.2,r*sin(nextTh))
        rod(m,a,(a[0],6.7,a[2]),.085,WOOD,6)
        rod(m,a,b,.07,WOOD,6)
        for s in [1,2,3,4]:
            f=s/5;x=a[0]*(1-f)+b[0]*f;z=a[2]*(1-f)+b[2]*f
            rod(m,(x,5.2,z),(x,6.7,z),.026,WOOD,4)
        for h2 in [5.6,6,6.4,6.7]:rod(m,(a[0],h2,a[2]),(b[0],h2,b[2]),.026,WOOD,4)
        tip=(0,12.2,0);aa=(a[0],6.7,a[2]);bb=(b[0],6.7,b[2])
        face(m,[aa,tip,bb],LAPIS)
        rod(m,aa,tip,.035,GOLD,5)
        # Motif en losange sur chaque panneau de la tente.
        for y2 in [7.2,8.1,9]:
            rr=r*(12.2-y2)/5.5;mid=th+pi/12
            rod(m,(rr*cos(mid-.07),y2,rr*sin(mid-.07)),((rr-.19)*cos(mid),y2+.48,(rr-.19)*sin(mid)),.018,GOLD,4)
            rod(m,(rr*cos(mid+.07),y2,rr*sin(mid+.07)),((rr-.19)*cos(mid),y2+.48,(rr-.19)*sin(mid)),.018,GOLD,4)
    # Pequenas lanternas; emissão visível sem multiplicar luzes dinâmicas.
    for x,z,y in [(-2.75,1,-2.5),(1,-2.75,-4.4),(1.95,.3,-7.6)]:
        cylinder(m,(x,y,z),.09,.29,GLOW,6)
        cylinder(m,(x,y+.18,z),.15,.08,GOLD,6,r2=.08)
        cylinder(m,(x,y-.18,z),.13,.08,GOLD,6)
    return finish(m)

def build_palm(name,seed):
    rng=random.Random(seed);m=new_model(name);h=10+rng.random()*2;lean=.65
    trunk=color('#76644a')
    for j in range(12):
        y0=j*h/12;y1=(j+1)*h/12
        rod(m,(lean*(y0/h)**2,y0,0),(lean*(y1/h)**2,y1,0),.23*(1-.3*j/12),LEAF,6,tuple(c*(.78+.2*(j%2)) for c in trunk[:3])+(1,))
    for j in range(12):
        th=j*2*pi/12+rng.random()*.24;length=3.5+rng.random()*.8
        def spine(t):return Vector((lean+cos(th)*length*t,h+sin(t*pi)*.8-t*t*1.8,sin(th)*length*t))
        tangent=Vector((-sin(th),0,cos(th)))
        for k in range(12):
            t=(k+1)/13;center=spine(t);nxt=spine(min(1,t+.07))
            width=sin(t*pi)*.72
            tint=color(['#617443','#758346','#455c35'][j%3])
            for sign in [-1,1]:
                tip=center+tangent*width*sign+Vector((cos(th)*.5,-.32,sin(th)*.5))
                face(m,[center,nxt,tip],LEAF,tint=tint)
        for k in range(3):rod(m,spine(k/3),spine((k+1)/3),.024,LEAF,3,color('#8b8d4f'))
    return finish(m)

def build_papyrus():
    m=new_model('Papyrus');rng=random.Random(14)
    for i in range(5):
        x=(rng.random()-.5)*.8;z=(rng.random()-.5)*.8;h=1.65+rng.random()*1.2
        crown=Vector((x+.1,h,z));rod(m,(x,0,z),crown,.025,LEAF,3,color('#52663a'))
        for j in range(13):
            th=j*2*pi/13;tip=crown+Vector((cos(th)*.48,-.13,sin(th)*.48));mid=crown+(tip-crown)*.6+Vector((0,.16,0))
            face(m,[crown,mid,tip,mid+Vector((.025,0,.025))],LEAF,tint=color('#8d9553'))
    return finish(m)

def build_pavilion():
    m=new_model('Pavilion')
    for side in [-1,1]:box(m,(side*5,3.5,0),(.55,7,10),STONE)
    box(m,(0,3.5,-5),(10,7,.5),STONE,tint=(.2,.22,.2,1))
    box(m,(0,2.6,-1),(3.4,5.2,.06),CARVE,tint=(.12,.15,.13,1))
    for side in [-1,1]:box(m,(side*3.15,3.5,5),(3.7,7,.6),STONE)
    box(m,(0,6.2,5),(2.7,1.6,.6),STONE)
    arch(m,2.6,3.5,5.3,0,5.05,.65)
    for yy in [6.7,7.0]:box(m,(0,yy,0),(10.6,.18,10.6),MARBLE)
    cylinder(m,(0,7.7,0),4.5,1.35,WOOD,12)
    cylinder(m,(0,11.4,0),4.8,6.2,LAPIS,12,r2=.12)
    for i in range(12):
        th=i*pi/6;rod(m,(4.8*cos(th),8.3,4.8*sin(th)),(0,14.5,0),.055,GOLD,4)
    cylinder(m,(0,14.8,0),.1,.7,GOLD,8)
    # Adornos de portal sem texto falso.
    for s in [-1,1]:
        box(m,(s*2.2,3,5.34),(.65,3.2,.04),LAPIS)
        for yy in [1.5,4.5]:box(m,(s*2.2,yy,5.38),(.72,.06,.06),GOLD)
    return finish(m)

well=build_well();palm1=build_palm('PalmA',2);palm2=build_palm('PalmB',9);papyrus=build_papyrus();pavilion=build_pavilion()
models=[well,palm1,palm2,papyrus,pavilion]
for ob in models:ob.hide_set(True)
well.hide_set(False)

# A câmera de revisão mostra coluna, pedra e escada; não é exportada para a web.
cam_data=bpy.data.cameras.new('Revisão • interior');cam=bpy.data.objects.new('Revisão • interior',cam_data);scene.collection.objects.link(cam)
cam.location=xyz((1.7,-1.0,2.1));target=Vector(xyz((0,-3.1,0)))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.lens=19;scene.camera=cam
world=bpy.data.worlds.new('Ambiente do Nilo');world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.32,.4,.46,1);bg.inputs[1].default_value=.45;scene.world=world
for name,pos,energy,size,tone in [('Claraboia',(0,7,0),1800,5,'#ffdfb0'),('Luz indireta',(1,-3,1),90,4,'#a8c8cb'),('Janela',(-3,3,0),700,3,'#ffbf79')]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color(tone)[:3]
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=xyz(pos)
    ob.rotation_euler=(Vector(xyz((0,-5,0)))-ob.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=65

def export(objects,path):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.hide_set(False);ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/'+path,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True,export_vertex_color='ACTIVE',export_image_format='WEBP',export_image_quality=82,export_meshopt_compression_enable=True)
    for ob in objects:ob.hide_set(True)
export([well],'nilometer.glb')
export([palm1,palm2,papyrus],'vegetation.glb')
export([pavilion],'pavilion.glb')
well.hide_set(False)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.shading.type='MATERIAL'
for image in bpy.data.images:
    if image.source=='FILE' and image.filepath: image.pack()
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/nilo.blend')
print('NILO ASSETS:',[(ob.name,len(ob.data.polygons)) for ob in models])
