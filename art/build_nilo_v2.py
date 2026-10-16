"""Nilo: modelos leves editáveis, construídos no Blender 5.2.

Execute no Blender pelo MCP ou `blender -b --python art/build_nilo_v2.py`.
Unidades em metros. A geometria é descrita no referencial Y-up da web e
convertida para Z-up do Blender; glTF restaura Y-up na exportação.
Interpretação artística de Roda, não levantamento arqueológico.
"""
import bpy, bmesh, math, random
from mathutils import Vector
from math import sin, cos, pi

ROOT = 'C:/Users/alkim/site-Nilo'
random.seed(861)
scene = bpy.data.scenes.get('Nilo • arquitetura v2') or bpy.data.scenes.new('Nilo • arquitetura v2')
bpy.context.window.scene = scene
for obj in list(scene.objects):
    if obj.name.startswith(('Guard','Spear','NG861_')):
        if obj.name in scene.collection.objects:scene.collection.objects.unlink(obj)
    else:bpy.data.objects.remove(obj, do_unlink=True)

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
GOLD=material('Ocre pintado','#a7864d',.62,0)
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
    face(model,lo,mat,tint=tint);face(model,list(reversed(hi)),mat,tint=tint)
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
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001)
    bmesh.ops.split_edges(bm,edges=[e for e in bm.edges if len(e.link_faces)>2])
    if model['name'] in ['NilometerV2','DoorLeft','DoorRight']:bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if model['name']=='NilometerV2':
        hidden=[]
        for f in bm.faces:
            zs=[v.co.z for v in f.verts]
            if max(abs(z) for z in zs)<.000001:
                if f.calc_area()<8:hidden.append(f)
                elif f.normal.z<0:f.normal_flip()
            elif max(abs(z+10.2) for z in zs)<.000001 and f.calc_area()<.30:hidden.append(f)
            elif max(abs(z+11.4) for z in zs)<.000001:
                if f.calc_area()<2:hidden.append(f)
                elif f.normal.z<0:f.normal_flip()
        for f in bm.faces:
            if f in hidden:continue
            pts=[v.co for v in f.verts]
            for axis in [0,1]:
                if max(p[axis] for p in pts)-min(p[axis] for p in pts)<.000001:
                    c=pts[0][axis]
                    if abs(abs(c)-4.65)<.000001 and max(p.z for p in pts)<=.000001:
                        if f.normal[axis]*c<0:f.normal_flip()
                    if abs(abs(c)-2.95)<.000001 and max(p.z for p in pts)<=.000001:
                        if f.normal[axis]*c>0:f.normal_flip()
            if max(abs(p.z+.35) for p in pts)<.000001 and f.calc_area()>8 and f.normal.z>0:f.normal_flip()
        bmesh.ops.delete(bm,geom=hidden,context='FACES_ONLY')
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    if model['name']=='NilometerV2':
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        todo=set(bm.faces)
        while todo:
            seed=todo.pop();part=[seed];stack=[seed]
            while stack:
                face0=stack.pop()
                for e in face0.edges:
                    for face1 in e.link_faces:
                        if face1 in todo:todo.remove(face1);part.append(face1);stack.append(face1)
            ref=None;desired=None
            for f in part:
                if max(abs(v.co.z) for v in f.verts)<.000001 and f.calc_area()>8:
                    ref=f;desired=Vector((0,0,1));break
            if ref is None:
                for f in part:
                    for axis in [0,1]:
                        vals=[v.co[axis] for v in f.verts]
                        if max(vals)-min(vals)<.000001 and abs(abs(vals[0])-2.95)<.000001 and f.calc_area()>4:
                            ref=f;desired=Vector((0,0,0));desired[axis]=-1 if vals[0]>0 else 1;break
                    if ref is not None:break
            if ref is not None and ref.normal.dot(desired)<0:
                for f in part:f.normal_flip()
    bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(model['name'],mesh);scene.collection.objects.link(obj)

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
        face(model,[p(*a,z+depth/2),p(*b,z+depth/2),p(*bb,z+depth/2),p(*aa,z+depth/2)],mat)
        face(model,[p(*aa,z-depth/2),p(*bb,z-depth/2),p(*b,z-depth/2),p(*a,z-depth/2)],mat)
        face(model,[p(*aa,z+depth/2),p(*bb,z+depth/2),p(*bb,z-depth/2),p(*aa,z-depth/2)],mat)
        face(model,[p(*a,z-depth/2),p(*a,z+depth/2),p(*b,z+depth/2),p(*b,z-depth/2)],mat)

    for sign in [-1,1]:
        c=p(sign*(half+.12),(bottom+spring)/2,z)
        box(model,c,(.24,spring-bottom,depth),mat,rotation)

def square_ring(m,outer,inner,y,thick,mat=STONE):
    for k in range(4):
        th=k*pi/2
        def pos(x,yy,z):return (x*cos(th)-z*sin(th),yy,x*sin(th)+z*cos(th))
        quad=[(-outer,y,-outer),(outer,y,-outer),(inner,y,-inner),(-inner,y,-inner)]
        face(m,[pos(*p) for p in reversed(quad)],mat)
        face(m,[pos(x,y-thick,z) for x,yy,z in quad],mat)
        face(m,[pos(outer,y,-outer),pos(outer,y-thick,-outer),pos(-outer,y-thick,-outer),pos(-outer,y,-outer)],mat)
        if y!=0:face(m,[pos(-inner,y-thick,-inner),pos(inner,y-thick,-inner),pos(inner,y,-inner),pos(-inner,y,-inner)],mat)

def build_well():
    m=new_model('NilometerV2');a=2.47;drop=3.12;floor=-11.4
    # Cantaria contínua com nichos: faces voltadas para o poço, sem duplicatas.
    for side in range(4):
        th=side*pi/2
        def place(x,y,z):return (x*cos(th)-z*sin(th),y,x*sin(th)+z*cos(th))
        def panel(poly):
            face(m,[place(x,y,-2.95) for x,y in poly],STONE)
        if side in [0,1]:
            panel([(-2.95,-6.24),(-1.15,-6.24),(-1.15,0),(-2.95,0)])
            panel([(1.15,-6.24),(2.95,-6.24),(2.95,0),(1.15,0)])
            panel([(-1.15,-6.24),(1.15,-6.24),(1.15,-6.0),(-1.15,-6.0)])
            curve=[]
            for j in range(17):
                t=j/16;curve.append((-1.15*(1-t)**.68,-4.65+1.25*t))
            curve += [(-x,y) for x,y in reversed(curve[:-1])]
            for j in range(len(curve)-1):
                x,y=curve[j];xx,yy=curve[j+1]
                panel([(x,y),(xx,yy),(xx,0),(x,0)])
                face(m,[place(x,y,-2.95),place(x,y,-3.48),place(xx,yy,-3.48),place(xx,yy,-2.95)],STONE)
            # Reveal, sill and inset back close the niche instead of a floating backdrop.
            for sign in [-1,1]:
                face(m,[place(sign*1.15,-6,-2.95),place(sign*1.15,-6,-3.48),place(sign*1.15,-4.65,-3.48),place(sign*1.15,-4.65,-2.95)],STONE)
            face(m,[place(-1.15,-6,-2.95),place(1.15,-6,-2.95),place(1.15,-6,-3.48),place(-1.15,-6,-3.48)],STONE)
            back=[(-1.15,-6),(1.15,-6)]+list(reversed(curve))
            face(m,[place(x,y,-3.48) for x,y in back],STONE,tint=(.72,.74,.68,1))
            arch(m,2.28,-4.65,-3.4,-5.985,-2.91,.12,MARBLE,th)
        else:panel([(-2.95,-6.24),(2.95,-6.24),(2.95,0),(-2.95,0)])
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
        face(m,[(2.35*cos(t),-6.254,2.35*sin(t)),(outer_t*cos(t),-6.254,outer_t*sin(t)),(outer_u*cos(u),-6.254,outer_u*sin(u)),(2.35*cos(u),-6.254,2.35*sin(u))],STONE)
    cylinder(m,(0,floor-.12,0),2.35,.24,STONE,64,tint=(.36,.42,.35,1))
    # Duas escadas contínuas. A antiga pilha de caixas sobrepunha faces laterais.
    corners=[(a,a),(-a,a),(-a,-a)];run=(2*a-.96)/13
    for k in range(2):
        x,z=corners[k];ex,ez=corners[k+1];dx=(ex-x)/(2*a);dz=(ez-z)/(2*a);y=-k*drop
        profile=[(-.477,y),(.48,y)]
        for j in range(13):
            profile += [(.48+j*run,y-(j+1)*.24),(.48+(j+1)*run,y-(j+1)*.24)]
        profile += [(4.46,y-3.65),(-.477,y-.53)]
        for v in [-.477,.477]:
            points=[(x+dx*u-dz*v,yy,z+dz*u+dx*v) for u,yy in profile]
            face(m,points if v<0 else list(reversed(points)),STONE)
        for j in range(len(profile)):
            u,yy=profile[j];uu,y2=profile[(j+1)%len(profile)]
            face(m,[(x+dx*u+dz*.477,yy,z+dz*u-dx*.477),(x+dx*uu+dz*.477,y2,z+dz*uu-dx*.477),(x+dx*uu-dz*.477,y2,z+dz*uu+dx*.477),(x+dx*u-dz*.477,yy,z+dz*u+dx*.477)],STONE)
    # Cada degrau circular ocupa um setor exclusivo, sem sobreposição angular.
    for j in range(21):
        th=5*pi/4+j*.165;yy=-6.24-(j+1)*.24
        inner,outer=1.39,2.346;d=.165
        pts=[(r*cos(t),yy,r*sin(t)) for r,t in [(inner,th-d/2),(outer,th-d/2),(outer,th+d/2),(inner,th+d/2)]]
        face(m,list(reversed(pts)),STONE)
        face(m,[(x,yy-.24,z) for x,y,z in pts],STONE)
        for i in range(4):
            p,q=pts[i],pts[(i+1)%4]
            face(m,[p,(p[0],yy-.24,p[2]),(q[0],yy-.24,q[2]),q],STONE)
    # Fuste octogonal, 16 côvados e subdivisões; inscrições abstratas não são usadas.
    base=-10.2;h=16*.5405
    cylinder(m,(0,-10.8,0),.48,1.2,MARBLE,8,r2=.42)
    low=[(.285*cos(pi/8+i*pi/4),base,.285*sin(pi/8+i*pi/4)) for i in range(8)]
    high=[(.27*cos(pi/8+i*pi/4),base+h,.27*sin(pi/8+i*pi/4)) for i in range(8)]
    for j in range(8):face(m,[low[(j+1)%8],low[j],high[j],high[(j+1)%8]],MARBLE)
    face(m,low,MARBLE);face(m,list(reversed(high)),MARBLE)
    for i in range(16):
        yy=base+i*.5405;r=.285-.015*i/16
        # Small dark graduations on the front octagonal flat, embedded at the back.
        box(m,(0,yy,r*cos(pi/8)+.001),(.20,.012,.006),CARVE)
        for tick in range(1,7):
            yy=base+(i+tick/7)*.5405;r=.285-.015*(yy-base)/h
            box(m,(0,yy,r*cos(pi/8)+.001),(.13 if tick%2 else .085,.009,.006),CARVE)
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
    # Galeria e porta são parte do MESMO edifício que o poço.
    square_ring(m,4.65,2.95,0,.35)
    for sign in [-1,1]: box(m,(sign*4.52,2.6,0),(.30,5.2,9.34),STONE)
    box(m,(0,2.6,-4.52),(8.74,5.2,.30),STONE)
    # Fachada com abertura de verdade; não há plano escuro atrás da porta.
    for sign in [-1,1]: box(m,(sign*2.835,2.6,4.52),(3.07,5.2,.30),STONE)
    curve=[]
    for j in range(17):
        t=j/16;curve.append((-1.30*(1-t)**.68,2.75+1.45*t))
    curve += [(-x,y) for x,y in reversed(curve[:-1])]
    for j in range(len(curve)-1):
        x,y=curve[j];xx,yy=curve[j+1]
        extrude_xy(m,[(x,y),(xx,yy),(xx,5.2),(x,5.2)],4.37,4.67,STONE)
    arch(m,2.58,2.75,4.2,.02,4.70,.22,MARBLE)
    # Transom de madeira acima das folhas retangulares, sem vedar a passagem.
    for j in range(13):
        x=-1.22+j*.2033;top=2.75+1.45*(1-(abs(x)/1.3)**(1/.68))
        if top>3.04: box(m,(x,(3.04+top)/2,4.54),(.025,top-3.04,.06),WOOD)
    for yy,ww in [(3.13,2.05),(3.4,1.60),(3.68,1.2)]:box(m,(0,yy,4.59),(ww,.025,.06),WOOD)
    for x in [-3.65,3.65]:
        for z in [-3.65,3.65]:
            cylinder(m,(x,2.41,z),.18,4.58,MARBLE,16)
            box(m,(x,4.95,z),(.62,.52,.62),MARBLE)
            box(m,(x,.08,z),(.50,.16,.50),MARBLE)
    for y in [5.02,5.24]:square_ring(m,4.76,4.25,y,.12,MARBLE)
    # Tambor dodecagonal: janelas intencionais, estrutura apoiada na galeria.
    r=3.40
    for i in range(12):
        th=2*pi*i/12;nt=2*pi*(i+1)/12
        a=Vector((r*cos(th),5.2,r*sin(th)));b=Vector((r*cos(nt),5.2,r*sin(nt)))
        rod(m,a,a+Vector((0,1.5,0)),.085,WOOD,8)
        rod(m,a,b,.09,WOOD,8);rod(m,a+Vector((0,1.5,0)),b+Vector((0,1.5,0)),.09,WOOD,8)
        for j in range(1,7):
            c=a.lerp(b,j/7);rod(m,c,c+Vector((0,1.5,0)),.018,WOOD,4)
        for yy in [.3,.6,.9,1.2]:rod(m,a+Vector((0,yy,0)),b+Vector((0,yy,0)),.018,WOOD,4)
        # Cobertura exterior completamente fechada. A pintura tem cúpula própria por dentro.
        ra=Vector((4.05*cos(th),6.72,4.05*sin(th)));rb=Vector((4.05*cos(nt),6.72,4.05*sin(nt)))
        face(m,[ra,rb,(0,14.1,0)],LAPIS)
        rod(m,ra,(0,14.1,0),.032,GOLD,6)
    cylinder(m,(0,14.35,0),.055,.55,GOLD,8)
    # Pequenas lanternas; emissão visível sem multiplicar luzes dinâmicas.
    for x,z,y in [(-2.75,1,-2.5),(1,-2.75,-4.4),(1.95,.3,-7.6)]:
        wall=(x,-2.95) if z < -2 else (-2.95,z) if x < -2 else (2.35,z)
        rod(m,(x,y+.22,z),(wall[0],y+.22,wall[1]),.025,GOLD,6)
        cylinder(m,(x,y,z),.09,.29,GLOW,6)
        cylinder(m,(x,y+.18,z),.15,.08,GOLD,6,r2=.08)
        cylinder(m,(x,y-.18,z),.13,.08,GOLD,6)
    return finish(m)

def extrude_xy(m,poly,back,front,mat):
    face(m,[(x,y,front) for x,y in poly],mat)
    face(m,[(x,y,back) for x,y in reversed(poly)],mat)
    for i in range(len(poly)):
        a,b=poly[i],poly[(i+1)%len(poly)]
        face(m,[(a[0],a[1],back),(b[0],b[1],back),(b[0],b[1],front),(a[0],a[1],front)],mat)

def image_material(name,file,rough=.85):
    idx=material(name,'#ffffff',rough)
    m=materials[idx];bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(ROOT+'/art/textures/'+file,check_existing=True)
    m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    return idx

PAINT=image_material('Pintura floral • Nilo original','dome.png',.82)
UPPER=image_material('MEDIR PARA NÃO FALTAR','inscription-upper.png')
LOWER=image_material('QUEM MEDE NÃO FICA SEM','inscription-lower.png')
FRIEZE=image_material('Estuque vegetal • Nilo','frieze.png')
# Madeira de grão fino: mapas exportáveis, a luz é calculada pelo motor.
wood=materials[WOOD];bs=next(n for n in wood.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for file,target in [('wood-color.png','Base Color'),('wood-rough.png','Roughness'),('wood-normal.png','Normal')]:
    node=wood.node_tree.nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(ROOT+'/art/textures/'+file,check_existing=True)
    if target!='Base Color':node.image.colorspace_settings.name='Non-Color'
    if target=='Normal':
        bump=wood.node_tree.nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.35
        wood.node_tree.links.new(node.outputs['Color'],bump.inputs['Color']);wood.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    else:wood.node_tree.links.new(node.outputs['Color'],bs.inputs[target])

def build_ceiling():
    m=new_model('CeilingSpandrels')
    for i in range(96):
        t=i*2*pi/96;u=(i+1)*2*pi/96
        # Exact polygonal inner border closes every corner under the 12-sided drum.
        rt=3.4*cos(pi/12)/cos((t%(pi/6))-pi/12)
        ru=3.4*cos(pi/12)/cos((u%(pi/6))-pi/12)
        ot=4.67/max(abs(cos(t)),abs(sin(t)));ou=4.67/max(abs(cos(u)),abs(sin(u)))
        low=[(rt*cos(t),5.18,rt*sin(t)),(ot*cos(t),5.18,ot*sin(t)),(ou*cos(u),5.18,ou*sin(u)),(ru*cos(u),5.18,ru*sin(u))]
        face(m,low,PAINT,[(.0,.7),(.0,.98),(.08,.98),(.08,.7)])
        face(m,[(p[0],5.30,p[2]) for p in reversed(low)],STONE)
    shell=finish(m)
    m=new_model('PaintedDome');segments=96;rows=20
    for j in range(rows):
        t=j/rows*pi/2;u=(j+1)/rows*pi/2
        for i in range(segments):
            a=i*2*pi/segments;b=(i+1)*2*pi/segments
            p=(3.38*cos(t)*cos(a),6.69+3.11*sin(t),3.38*cos(t)*sin(a))
            q=(3.38*cos(t)*cos(b),6.69+3.11*sin(t),3.38*cos(t)*sin(b))
            if j==rows-1:
                face(m,[p,(0,9.8,0),q],PAINT,[(i/segments,j/rows),((i+.5)/segments,1),((i+1)/segments,j/rows)])
            else:
                r=(3.38*cos(u)*cos(b),6.69+3.11*sin(u),3.38*cos(u)*sin(b))
                s=(3.38*cos(u)*cos(a),6.69+3.11*sin(u),3.38*cos(u)*sin(a))
                face(m,[p,s,r,q],PAINT,[(i/segments,j/rows),(i/segments,(j+1)/rows),((i+1)/segments,(j+1)/rows),((i+1)/segments,j/rows)])
    dome=finish(m)
    for poly in dome.data.polygons:poly.use_smooth=True
    # One-sided inward dome, separate from the exterior tent. Intentional open base.
    return [shell,dome]

def build_inscriptions():
    m=new_model('BrandInscriptions')
    for side in range(4):
        th=side*pi/2
        for y,mat,width,height in [(-.72,UPPER,5.25,.64),(-2.42,LOWER,4.8,.6),(4.05,FRIEZE,8.4,.35)]:
            z=-2.918 if y<0 else -4.347
            points=[(-width/2,y-height/2,z),(width/2,y-height/2,z),(width/2,y+height/2,z),(-width/2,y+height/2,z)]
            points=[(x*cos(th)-zz*sin(th),yy,x*sin(th)+zz*cos(th)) for x,yy,zz in points]
            face(m,points,mat,[(0,0),(1,0),(1,1),(0,1)])
            cc=(0,y,z-.02);cc=(cc[0]*cos(th)-cc[2]*sin(th),cc[1],cc[0]*sin(th)+cc[2]*cos(th))
            box(m,cc,(width+.02,height+.02,.036),LAPIS,th)
    return finish(m)

def palmette(m,cx,cy,sx,sy,z):
    # Contour with a real bevel, inspired by axial vegetal motifs in Met 31.119.4.
    points=[]
    for i in range(20):
        t=i*2*pi/20
        points.append((cx+sx*sin(t)*(.65+.35*cos(t)),cy+sy*cos(t)))
    centre=(cx,cy,z+.034)
    for i in range(len(points)):
        a=points[i];b=points[(i+1)%len(points)]
        # faceted slope catches light like a chamfered carving, not applied gold wire.
        face(m,[(a[0],a[1],z),(b[0],b[1],z),centre],WOOD)

def build_door(left):
    name='DoorLeft' if left else 'DoorRight';m=new_model(name)
    direction=1 if left else -1
    def cx(x):return direction*x
    box(m,(cx(.625),1.51,0),(1.25,3.02,.14),WOOD)
    for x in [.06,1.19]:box(m,(cx(x),1.51,.086),(.11,3.00,.05),WOOD)
    for yy in [.06,.78,1.51,2.24,2.96]:box(m,(cx(.625),yy,.086),(1.01,.10,.05),WOOD)
    for k in range(4):
        y=.41+k*.728
        # Recessed field, with the broad carved shapes raised only 2–4 cm.
        for a in [-1,1]:
            palmette(m,cx(.625+a*.28),y,.13,.23,.069)
        palmette(m,cx(.625),y,.15,.28,.069)
    # A quiet iron ring handle, attached to the stile and away from the centre seam.
    for i in range(20):
        t=i*pi/10;u=(i+1)*pi/10
        rod(m,(cx(1.03)+.065*cos(t),1.45+.08*sin(t),.16),(cx(1.03)+.065*cos(u),1.45+.08*sin(u),.16),.010,CARVE,6)
    box(m,(cx(1.03),1.53,.12),(.035,.045,.08),CARVE)
    ob=finish(m);ob.location=xyz((-1.27 if left else 1.27,.012,4.52))
    # Curve previews are stored in the Blender file; the web drives the same hinges by scroll.
    ob.rotation_euler.z=0;ob.keyframe_insert(data_path='rotation_euler',frame=1)
    ob.keyframe_insert(data_path='rotation_euler',frame=45)
    ob.rotation_euler.z=-1.4 if left else 1.4;ob.keyframe_insert(data_path='rotation_euler',frame=100)
    return ob

well=build_well();ceilings=build_ceiling();inscriptions=build_inscriptions();doors=[build_door(True),build_door(False)]
models=[well,*ceilings,inscriptions,*doors]
scene.frame_set(1);scene.frame_end=200;scene.render.fps=30
scene.unit_settings.system='METRIC'
# Preview camera follows an entry, inspection and descent in the editable scene.
cam_data=bpy.data.cameras.new('Passeio • revisão v2');cam=bpy.data.objects.new('Passeio • revisão v2',cam_data);scene.collection.objects.link(cam);scene.camera=cam;cam_data.lens=19
for frame,pos,target in [(1,(0,1.62,13),(0,2,4.5)),(100,(0,1.62,3.8),(0,1.5,0)),(135,(0,1.62,3.6),(0,9.5,0)),(160,(1.8,1.62,3.4),(0,-2,0)),(200,(-2.35,-1.7,2.42),(0,-5,0))]:
    cam.location=xyz(pos);cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert(data_path='location',frame=frame);cam.keyframe_insert(data_path='rotation_euler',frame=frame)
world=bpy.data.worlds.new('Luz do Nilo • revisão');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.34,.40,.46,1);bg.inputs[1].default_value=.45
for name,pos,target,energy,size,tone in [('Luz da entrada',(0,4.8,9),(0,1,2),1000,5,'#ffe1b4'),('Luz do tambor',(1,6.5,0),(0,-6,0),1700,4,'#fff0d0'),('Rebatimento do poço',(0,-6,0),(0,-1,0),95,3,'#9ab9ac'),('Luz da cúpula',(0,5.8,0),(0,9,0),500,3,'#ffdfb0')]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color(tone)[:3]
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=xyz(pos);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=75
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for ob in models:ob.select_set(True)
bpy.context.view_layer.objects.active=well
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/nilometer.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True,export_vertex_color='ACTIVE',export_image_format='WEBP',export_image_quality=85,export_meshopt_compression_enable=True)
for img in bpy.data.images:
    if img.source=='FILE' and img.filepath:img.pack()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/nilo-revisao.blend')
print('NILO V2:',[(o.name,len(o.data.polygons)) for o in models])
