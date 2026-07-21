from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math
root=Path(__file__).resolve().parents[1]
out=root/'assets'/'screenshots';out.mkdir(parents=True,exist_ok=True)
A=root/'assets'/'commercial'
font='/usr/share/fonts/truetype/lato/Lato-Heavy.ttf'
font2='/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed-Bold.ttf'

def cell(atlas,index,cols,w,h):
    x=(index%cols)*w;y=(index//cols)*h
    return atlas.crop((x,y,x+w,y+h))

def txt(d,xy,s,size,fill,anchor='mm',stroke=0):
    d.text(xy,s,font=ImageFont.truetype(font,size),fill=fill,anchor=anchor,stroke_width=stroke,stroke_fill=(7,10,24))

def title():
    im=Image.open(A/'key-art.webp').convert('RGBA').resize((1280,720))
    ov=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(ov)
    d.rectangle((0,0,1280,720),fill=(4,8,25,55));d.rounded_rectangle((70,315,535,665),radius=28,fill=(10,16,46,225),outline=(245,190,63,215),width=4)
    buttons=[('CONTINUE',365,112,493),('LEVELS',430,112,296),('OPTIONS',430,310,493),('HOW TO PLAY',492,112,296),('STORY COMIC',492,310,493),('CREDITS',552,112,493)]
    for i,(label,y,x1,x2) in enumerate(buttons):
        d.rounded_rectangle((x1,y-23,x2,y+23),radius=15,fill=(181,88,97,245) if i==0 else (55,77,155,245),outline=(255,255,255,55),width=2);txt(d,((x1+x2)//2,y),label,18 if i else 21,(255,245,213))
    d.rounded_rectangle((112,590,493,638),radius=14,fill=(14,21,55,230),outline=(255,255,255,35),width=2);txt(d,(302,614),'VAULT 73/100  •  PRISM STARS 181/300',15,(255,245,213))
    d.text((1260,706),'COMMERCIAL UI BUILD 3.4',font=ImageFont.truetype(font,14),fill=(255,255,255,150),anchor='rs')
    Image.alpha_composite(im,ov).convert('RGB').save(out/'title.webp','WEBP',quality=92)

def gameplay():
    bg=Image.open(A/'backdrop-05.webp').convert('RGBA')
    im=bg.copy();d=ImageDraw.Draw(im)
    d.rounded_rectangle((24,20,1256,124),radius=22,fill=(7,12,34,230),outline=(255,255,255,35),width=2)
    txt(d,(52,48),'ROOM 047',18,(82,228,255),anchor='lm');txt(d,(52,84),'THE THUNDER INDEX',30,(255,241,194),anchor='lm')
    txt(d,(1225,50),'SPARKS  2/3',18,(255,220,96),anchor='rm');txt(d,(1225,86),'MOVES  31  •  PAR  36',18,(225,232,255),anchor='rm')
    tiles=Image.open(A/'tile-sprites.png').convert('RGBA');objs=Image.open(A/'object-sprites.png').convert('RGBA');hero=Image.open(A/'hero-sprites.png').convert('RGBA');enemy=Image.open(A/'enemy-sprites.png').convert('RGBA');collect=Image.open(A/'collectible-sprites.png').convert('RGBA')
    gx,gy,sz=352,150,48;cols,rows=12,10
    walls={(x,0) for x in range(cols)}|{(x,rows-1) for x in range(cols)}|{(0,y) for y in range(rows)}|{(cols-1,y) for y in range(rows)}|{(3,y) for y in range(2,8)}|{(8,y) for y in range(2,8)}|{(x,5) for x in range(4,8)}
    for y in range(rows):
        for x in range(cols):
            idx=14 if (x,y) in walls else 4
            tile=cell(tiles,idx,10,128,128).resize((sz,sz),Image.Resampling.LANCZOS);im.alpha_composite(tile,(gx+x*sz,gy+y*sz))
    specials={(2,2):11,(9,7):12,(5,4):8,(6,4):8,(7,4):8,(4,7):15,(5,7):15,(6,7):15}
    for pos,idx in specials.items(): im.alpha_composite(cell(objs,idx,5,160,160).resize((56,56),Image.Resampling.LANCZOS),(gx+pos[0]*sz-4,gy+pos[1]*sz-4))
    for pos,idx in [((2,7),0),((6,2),5),((9,2),10)]: im.alpha_composite(cell(objs,idx,5,160,160).resize((60,60),Image.Resampling.LANCZOS),(gx+pos[0]*sz-6,gy+pos[1]*sz-6))
    for pos,idx in [((4,2),0),((7,7),1),((9,4),2)]: im.alpha_composite(cell(collect,idx,4,160,160).resize((54,54),Image.Resampling.LANCZOS),(gx+pos[0]*sz-3,gy+pos[1]*sz-3))
    im.alpha_composite(cell(hero,7,6,160,160).resize((68,68),Image.Resampling.LANCZOS),(gx+1*sz-10,gy+4*sz-12))
    for pos,row,phase in [((5,2),4,0),((7,2),5,2),((9,6),1,1)]: im.alpha_composite(cell(enemy,row*4+phase,4,160,160).resize((68,68),Image.Resampling.LANCZOS),(gx+pos[0]*sz-10,gy+pos[1]*sz-12))
    d=ImageDraw.Draw(im);d.rounded_rectangle((40,620,1240,688),radius=18,fill=(8,12,35,235),outline=(255,255,255,30),width=2);txt(d,(68,644),'FOCUS',14,(82,228,255),anchor='lm');txt(d,(68,669),'Use the conveyor timing to open the central lane before the drone completes its loop.',17,(238,239,255),anchor='lm')
    im.convert('RGB').save(out/'gameplay.webp','WEBP',quality=92)

def comic():
    bg=Image.open(A/'backdrop-01.webp').convert('RGBA');d=ImageDraw.Draw(bg);d.rectangle((0,0,1280,720),fill=(4,8,24,145));d.rounded_rectangle((44,32,1236,682),radius=22,fill=(255,244,207,255),outline=(8,11,25),width=5)
    panel=Image.open(A/'comic-3.webp').convert('RGBA').resize((1128,420));bg.alpha_composite(panel,(76,68));d=ImageDraw.Draw(bg);d.text((640,530),'BARON NULL',font=ImageFont.truetype(font2,38),fill=(205,54,85),anchor='mm',stroke_width=2,stroke_fill=(8,11,25));txt(d,(640,580),'“Order is terribly dull. Let us see how your little worlds manage without it.”',20,(39,48,79));
    bg.convert('RGB').save(out/'comic.webp','WEBP',quality=92)

def level_select():
    im=Image.open(A/'backdrop-07.webp').convert('RGBA');d=ImageDraw.Draw(im);d.rectangle((0,0,1280,720),fill=(4,8,24,110));d.rounded_rectangle((70,48,1210,672),radius=28,fill=(9,14,39,235),outline=(155,94,255,180),width=4);txt(d,(640,92),'MOONLIT ORRERY',34,(255,241,194));txt(d,(640,126),'Rooms 61–70  •  Teleport coils and spatial planning',17,(211,218,245))
    for i in range(10):
        x=160+(i%5)*200;y=190+(i//5)*210;d.rounded_rectangle((x,y,x+150,y+150),radius=18,fill=(25,33,79,245),outline=(245,190,63,180) if i<7 else (255,255,255,40),width=3);txt(d,(x+75,y+54),str(61+i),34,(255,241,194));txt(d,(x+75,y+95),'★★★' if i<4 else ('★★☆' if i<7 else 'LOCKED'),18,(245,190,63) if i<7 else (130,140,175));txt(d,(x+75,y+125),'BEST 42' if i<7 else '—',14,(200,210,240))
    im.convert('RGB').save(out/'level-select.webp','WEBP',quality=92)

for fn in (title,gameplay,comic,level_select):fn()
print(out)
