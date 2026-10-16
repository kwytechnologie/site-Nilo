"""Run in headless Blender with nilo-revisao.blend loaded.

Uses the installed blender-asset-qa skill. Its origin-based float32 determinant
misclassifies the tiny belt buckle at world Y=-5.575 m. The ONLY checker change
below is an equivalent, translation-invariant signed volume in Python float64.
All topology, UV, contact, overlap and winding checks remain enabled.
"""
import bpy, sys, inspect, json
from pathlib import Path
skill=Path.home()/'.codex/skills/blender-asset-qa/scripts'
sys.path.insert(0,str(skill))
import qa_check
source=inspect.getsource(qa_check.run)
old='''        for f in bm_t.faces:
            a, b, c = (v.co for v in f.verts)
            g = isl[f.verts[0].index]
            vol[g] += a.dot(b.cross(c)) / 6.0'''
new='''        anchors = {}
        for f in bm_t.faces:
            points = [tuple(v.co) for v in f.verts]
            g = isl[f.verts[0].index]
            origin = anchors.setdefault(g, points[0])
            a,b,c = [tuple(p[k]-origin[k] for k in range(3)) for p in points]
            vol[g] += (a[0]*(b[1]*c[2]-b[2]*c[1]) +
                       a[1]*(b[2]*c[0]-b[0]*c[2]) +
                       a[2]*(b[0]*c[1]-b[1]*c[0]))/6.0'''
assert source.count(old)==1,'Skill changed: review the signed-volume adaptation.'
exec(source.replace(old,new),qa_check.__dict__)
reports={}
bpy.context.window.scene=bpy.data.scenes['Nilo • arquitetura v2']
reports['architecture']=qa_check.run(objects=['NilometerV2','PaintedDome','CeilingSpandrels','DoorLeft','DoorRight','BrandInscriptions'],profile='game')
bpy.context.window.scene=bpy.data.scenes['Nilo • guardas']
for side in ['Left','Right']:
    reports[side]=qa_check.run(objects=['NG861_Guard'+side+'_Body','NG861_Guard'+side+'_ArmSpear'],profile='game')
print('@@JSON@@'+json.dumps(reports))
