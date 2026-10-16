"""Texturas procedurais originais de madeira, sem bibliotecas nem downloads."""
from PIL import Image
import math, random
from pathlib import Path
root=Path(__file__).parent/'textures'
w,h=512,1024
rng=random.Random(861)
grain=[]
for y in range(h):
    row=[]
    for x in range(w):
        bend=x+3*math.sin(y*.014)+1.5*math.sin(y*.039+x*.002)
        line=math.sin(bend*.56+math.sin(bend*.08)*2)
        pores=max(0,line)**12
        row.append(.5+.13*math.sin(bend*.065)+.065*line-.16*pores+rng.uniform(-.045,.045))
    grain.append(row)
diff=Image.new('RGB',(w,h));rough=Image.new('L',(w,h));normal=Image.new('RGB',(w,h))
for y in range(h):
    for x in range(w):
        v=grain[y][x]-.5
        diff.putpixel((x,y),tuple(max(0,min(255,int(c+v*70))) for c in (115,79,49)))
        rough.putpixel((x,y),int(185+v*45))
        dx=(grain[y][min(w-1,x+1)]-grain[y][max(0,x-1)])*.8
        dy=(grain[min(h-1,y+1)][x]-grain[max(0,y-1)][x])*.8
        normal.putpixel((x,y),(int(128-dx*127),int(128+dy*127),254))
for im,name in [(diff,'wood-color'),(rough,'wood-rough'),(normal,'wood-normal')]: im.save(root/(name+'.png'))
print('Madeira: três mapas 512 × 1024')
