from __future__ import annotations
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from pathlib import Path
import math, os, json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'commercial'
OUT.mkdir(parents=True, exist_ok=True)
SRC = ROOT / 'assets' / 'source' / 'final-art-source.png'

S=4

def sc(v): return int(round(v*S))
def pt(x,y): return (sc(x),sc(y))
def box(x0,y0,x1,y1): return (sc(x0),sc(y0),sc(x1),sc(y1))

INK=(8,11,25,255); GOLD=(245,190,63,255); CREAM=(255,241,194,255); CYAN=(72,220,255,255); VIOLET=(155,94,255,255); CORAL=(255,91,105,255); MINT=(90,225,145,255)

def find_font(candidates):
    for c in candidates:
        if Path(c).exists(): return c
    return None

font_serif = find_font([
    '/usr/share/fonts/truetype/dejavu/DejaVuSerifCondensed-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    'C:/Windows/Fonts/georgiab.ttf',
    'C:/Windows/Fonts/timesbd.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
]) or 'C:/Windows/Fonts/arial.ttf'

font_sans = find_font([
    '/usr/share/fonts/truetype/lato/Lato-Heavy.ttf',
    '/usr/share/fonts/truetype/lato/Lato-Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/calibrib.ttf',
]) or 'C:/Windows/Fonts/arial.ttf'

def new_canvas(w,h,bg=(0,0,0,0)):
    return Image.new('RGBA',(w*S,h*S),bg)

def down(im):
    return im.resize((im.width//S, im.height//S), Image.Resampling.LANCZOS)

def rr(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box(*xy), radius=sc(r), fill=fill, outline=outline, width=sc(width))

def ellipse(draw, xy, fill, outline=None, width=1):
    draw.ellipse(box(*xy), fill=fill, outline=outline, width=sc(width))

def polygon(draw, pts, fill, outline=None, width=1):
    p=[pt(x,y) for x,y in pts]; draw.polygon(p, fill=fill)
    if outline:
        draw.line(p+[p[0]], fill=outline, width=sc(width), joint='curve')

def line(draw, pts, fill, width=1): draw.line([pt(x,y) for x,y in pts], fill=fill, width=sc(width), joint='curve')

def shadowed(layer, radius=4, offset=(0,3), alpha=.55):
    a=layer.getchannel('A').filter(ImageFilter.GaussianBlur(sc(radius)))
    shade=Image.new('RGBA',layer.size,(0,0,0,0)); shade.putalpha(a.point(lambda p:int(p*alpha)))
    out=Image.new('RGBA',layer.size,(0,0,0,0)); out.alpha_composite(shade,(sc(offset[0]),sc(offset[1]))); out.alpha_composite(layer)
    return out

def gradient_rect(w,h,top,bottom):
    im=Image.new('RGBA',(w,h)); d=ImageDraw.Draw(im)
    for y in range(h):
        t=y/max(1,h-1); c=tuple(int(top[i]*(1-t)+bottom[i]*t) for i in range(4)); d.line((0,y,w,y),fill=c)
    return im

def frame_base(cell=160):
    im=new_canvas(cell,cell)
    # transparent, with subtle ground contact glow
    return im

def draw_prism(draw,cx,cy,size,colors=(CREAM,CYAN,VIOLET,CORAL)):
    pts=[(cx,cy-size*.62),(cx+size*.45,cy-size*.12),(cx+size*.27,cy+size*.58),(cx-size*.32,cy+size*.48),(cx-size*.48,cy-size*.14)]
    polygon(draw,pts,colors[2],INK,2)
    polygon(draw,[(cx,cy-size*.62),(cx+size*.45,cy-size*.12),(cx,cy+size*.10)],colors[0],None)
    polygon(draw,[(cx,cy-size*.62),(cx,cy+size*.10),(cx-size*.48,cy-size*.14)],colors[1],None)
    polygon(draw,[(cx,cy+size*.10),(cx+size*.27,cy+size*.58),(cx-size*.32,cy+size*.48)],colors[3],None)
    line(draw,[(cx,cy-size*.58),(cx,cy+size*.48)],(255,255,255,190),1)

# --- HERO ---
def draw_hero_frame(state:str, phase:int, cell=160):
    im=frame_base(cell); layer=new_canvas(cell,cell); d=ImageDraw.Draw(layer)
    cx=80; ground=137
    bob={"idle":math.sin(phase/6*math.tau)*1.4,"walk":math.sin(phase/6*math.tau)*3,"push":0,"special":0}[state]
    if state=='walk':
        stride=math.sin(phase/6*math.tau)
    else: stride=0
    if state=='push':
        lean=4+phase%3; armreach=10
    else: lean=0; armreach=0
    if state=='special':
        bob=[0,-3,-1,1,0,0][phase]
    # shadow
    ellipse(d,(51,ground-4,109,ground+8),(0,0,0,95))
    # cape/scarf tail
    sway=math.sin(phase*.85)*4
    line(d,[(72,86+bob),(42-sway,91+bob),(30-sway*1.4,107+bob)],CORAL,9)
    line(d,[(72,86+bob),(44-sway,91+bob)],(255,153,126,255),2)
    # legs
    hipy=109+bob
    if state=='walk':
        lx=-8*stride; rx=8*stride
    elif state=='push': lx=-3;rx=5
    else: lx=-4;rx=4
    # boots behind
    rr(d,(52+lx,121+bob,77+lx,139+bob),7,(53,35,43,255),INK,3)
    rr(d,(83+rx,121+bob,108+rx,139+bob),7,(53,35,43,255),INK,3)
    # trousers
    polygon(d,[(68,105+bob),(78,108+bob),(73+lx,129+bob),(58+lx,129+bob)],(37,53,84,255),INK,2)
    polygon(d,[(82,107+bob),(94,105+bob),(102+rx,129+bob),(86+rx,129+bob)],(37,53,84,255),INK,2)
    # torso coat
    polygon(d,[(61+lean,78+bob),(96+lean,78+bob),(105+lean,112+bob),(79+lean,121+bob),(53+lean,111+bob)],(36,89,137,255),INK,3)
    rr(d,(59+lean,83+bob,99+lean,92+bob),4,(52,123,176,255),None)
    # belt
    rr(d,(57+lean,105+bob,102+lean,113+bob),3,(77,48,38,255),INK,2)
    rr(d,(75+lean,104+bob,86+lean,114+bob),2,GOLD,INK,1)
    # arms
    arm_y=90+bob
    if state=='push':
        line(d,[(63+lean,88+bob),(46-armreach,94+bob),(32-armreach,96+bob)],(231,161,93,255),11)
        line(d,[(95+lean,88+bob),(112+armreach,94+bob),(127+armreach*.4,96+bob)],(231,161,93,255),11)
        ellipse(d,(20,88+bob,38,104+bob),(88,57,48,255),INK,2); ellipse(d,(121,88+bob,139,104+bob),(88,57,48,255),INK,2)
    elif state=='special' and phase in (0,1,2):
        line(d,[(94,88+bob),(112,69+bob),(119,48+bob)],(231,161,93,255),11)
        ellipse(d,(111,39+bob,127,54+bob),(88,57,48,255),INK,2)
        line(d,[(62,89+bob),(46,101+bob)],(231,161,93,255),10)
    else:
        swing=8*stride
        line(d,[(63,88+bob),(52+swing,107+bob)],(231,161,93,255),10)
        line(d,[(95,88+bob),(105-swing,107+bob)],(231,161,93,255),10)
        ellipse(d,(44+swing,102+bob,58+swing,116+bob),(88,57,48,255),INK,2); ellipse(d,(99-swing,102+bob,113-swing,116+bob),(88,57,48,255),INK,2)
    # neck scarf
    rr(d,(61+lean,75+bob,98+lean,87+bob),6,CORAL,INK,2)
    polygon(d,[(88+lean,82+bob),(104+lean,88+bob),(91+lean,96+bob)],(212,54,74,255),INK,1)
    # head
    hx=79+lean; hy=57+bob
    # hair back spikes
    hair=(37,25,55,255)
    polygon(d,[(58+lean,58+bob),(47+lean,45+bob),(63+lean,47+bob),(57+lean,32+bob),(73+lean,42+bob),(78+lean,25+bob),(88+lean,42+bob),(102+lean,30+bob),(99+lean,52+bob)],hair,INK,2)
    ellipse(d,(54+lean,38+bob,105+lean,82+bob),(234,166,101,255),INK,3)
    # ear
    polygon(d,[(57+lean,49+bob),(47+lean,43+bob),(52+lean,60+bob)],(229,147,88,255),INK,2)
    # fringe
    polygon(d,[(55+lean,49+bob),(62+lean,36+bob),(69+lean,47+bob),(78+lean,34+bob),(84+lean,48+bob),(96+lean,37+bob),(101+lean,51+bob)],hair,None)
    # face highlight
    ellipse(d,(63+lean,50+bob,98+lean,76+bob),(247,190,126,255),None)
    # eyes / expression
    blink=(state=='special' and phase==4)
    if state=='special' and phase==5: # hurt
        line(d,[(68+lean,57+bob),(76+lean,62+bob)],INK,2); line(d,[(76+lean,57+bob),(68+lean,62+bob)],INK,2)
        line(d,[(87+lean,57+bob),(95+lean,62+bob)],INK,2); line(d,[(95+lean,57+bob),(87+lean,62+bob)],INK,2)
        line(d,[(75+lean,70+bob),(86+lean,67+bob),(92+lean,72+bob)],INK,2)
    else:
        if blink:
            line(d,[(68+lean,61+bob),(76+lean,61+bob)],INK,2); line(d,[(87+lean,61+bob),(95+lean,61+bob)],INK,2)
        else:
            ellipse(d,(68+lean,55+bob,77+lean,66+bob),CREAM,INK,1); ellipse(d,(87+lean,55+bob,96+lean,66+bob),CREAM,INK,1)
            ellipse(d,(72+lean,58+bob,76+lean,64+bob),(20,24,42,255)); ellipse(d,(91+lean,58+bob,95+lean,64+bob),(20,24,42,255))
        if state=='special' and phase<3:
            line(d,[(75+lean,70+bob),(82+lean,75+bob),(91+lean,68+bob)],INK,2)
        else: line(d,[(77+lean,70+bob),(84+lean,72+bob),(91+lean,69+bob)],INK,2)
    # chest prism
    draw_prism(d,80+lean,96+bob,13)
    # held prism for victory
    if state=='special' and phase<3: draw_prism(d,120,35+bob,25)
    return down(shadowed(layer,3,(0,3),.45))

hero=Image.new('RGBA',(6*160,4*160),(0,0,0,0))
for row,state in enumerate(['idle','walk','push','special']):
    for col in range(6): hero.alpha_composite(draw_hero_frame(state,col),(col*160,row*160))
hero.save(OUT/'hero-sprites.png',optimize=True)

# --- ENEMIES ---
def enemy_frame(kind,phase,cell=160):
    im=frame_base(cell); l=new_canvas(cell,cell); d=ImageDraw.Draw(l); cx=80; cy=90+math.sin(phase/4*math.tau)*3
    ellipse(d,(47,130,113,141),(0,0,0,85))
    p=phase/4*math.tau
    def eye_pair(y=82,dx=13):
        ellipse(d,(cx-dx-6,y-7,cx-dx+6,y+7),CREAM,INK,2); ellipse(d,(cx+dx-6,y-7,cx+dx+6,y+7),CREAM,INK,2)
        ox=2*math.sin(p); ellipse(d,(cx-dx-1+ox,y-2,cx-dx+3+ox,y+3),INK); ellipse(d,(cx+dx-1+ox,y-2,cx+dx+3+ox,y+3),INK)
    if kind=='scarab':
        # legs
        for sy in [-1,0,1]:
            yy=cy+sy*13
            line(d,[(54,yy),(35-4*math.sin(p+sy),yy+sy*8)],INK,5); line(d,[(106,yy),(125+4*math.sin(p+sy),yy+sy*8)],INK,5)
        ellipse(d,(47,51,113,126),(38,103,154,255),INK,4); ellipse(d,(56,57,104,116),(33,132,187,255),None)
        line(d,[(80,54),(80,119)],GOLD,4); polygon(d,[(66,56),(73,37),(79,55)],GOLD,INK,2); polygon(d,[(94,56),(87,37),(81,55)],GOLD,INK,2); eye_pair(77,13)
    elif kind=='crawler':
        for i in range(5):
            x=49+i*16; ellipse(d,(x-8,114,x+8,132),(27,31,46,255),INK,2)
        rr(d,(39,54,121,120),21,(98,61,164,255),INK,4); rr(d,(48,61,112,102),16,(123,76,197,255),None)
        polygon(d,[(44,70),(28,62),(40,88)],(91,49,146,255),INK,2); polygon(d,[(116,70),(132,62),(120,88)],(91,49,146,255),INK,2); eye_pair(82,15)
    elif kind=='slime':
        wob=4*math.sin(p)
        polygon(d,[(40,118),(42+wob,82),(54,58),(78,50-wob),(104,61),(119-wob,87),(120,118),(108,128),(94,123),(80,131),(65,123),(52,128)],(82,203,94,255),INK,4)
        ellipse(d,(50,63,111,113),(112,232,113,255),None); eye_pair(88,14); ellipse(d,(73,106,89,113),(20,88,38,255))
    elif kind=='hopper':
        polygon(d,[(51,116),(48,85),(60,55),(80,43),(102,58),(115,88),(109,116)],(91,183,74,255),INK,4)
        polygon(d,[(55,59),(44,42),(63,48)],(146,217,71,255),INK,2); polygon(d,[(103,59),(117,42),(98,48)],(146,217,71,255),INK,2)
        line(d,[(61,115),(45-5*math.sin(p),137)],INK,6); line(d,[(99,115),(115+5*math.sin(p),137)],INK,6); eye_pair(78,14)
    elif kind=='turret':
        eye_r = 13 + int(round(math.sin(p*1.5)*3))
        rr(d,(37,92,123,129),12,(70,78,94,255),INK,4); rr(d,(48,69,112,111),17,(97,105,121,255),INK,4)
        rr(d,(72,40,88,79),5,(75,83,102,255),INK,3); ellipse(d,(58,62,102,104),(59,63,78,255),INK,3); ellipse(d,(80-eye_r,84-eye_r,80+eye_r,84+eye_r),(230,52,64,255),INK,3); ellipse(d,(73,77,87,91),(255,225,171,255),None)
        line(d,[(80,67),(80+p*2,41-p)],(165,175,195,255),4); line(d,[(52,128),(45,140)],INK,5); line(d,[(108,128),(115,140)],INK,5)
    elif kind=='drone':
        # rotors
        ang=p*1.7
        for ox in [-42,42]:
            line(d,[(80+ox,69),(80+ox+20*math.cos(ang),69+7*math.sin(ang))],(201,213,229,255),5)
            line(d,[(80+ox,69),(80+ox-20*math.cos(ang),69-7*math.sin(ang))],(201,213,229,255),5)
        line(d,[(48,70),(60,80)],INK,5); line(d,[(112,70),(100,80)],INK,5)
        ellipse(d,(50,57,110,116),(75,80,101,255),INK,4); ellipse(d,(60,68,100,106),(32,35,50,255),INK,3); ellipse(d,(69,77,91,99),(222,49,56,255),INK,2); ellipse(d,(75,83,85,93),(255,232,178,255),None)
    elif kind=='mimic':
        rr(d,(35,53,125,126),12,(128,74,42,255),INK,4); rr(d,(41,58,119,87),8,(161,99,54,255),None)
        line(d,[(36,88),(124,88)],GOLD,6); rr(d,(72,81,88,101),3,GOLD,INK,2)
        polygon(d,[(45,96),(57,117),(68,96),(80,118),(92,96),(105,117),(117,96)],CREAM,INK,2); polygon(d,[(53,93),(66,104),(80,93),(94,104),(108,93)],CREAM,INK,2)
        ellipse(d,(58,65,72,80),(255,235,195,255),INK,1); ellipse(d,(88,65,102,80),(255,235,195,255),INK,1); ellipse(d,(64,70,69,76),INK); ellipse(d,(94,70,99,76),INK)
        polygon(d,[(78,103),(80+5*math.sin(p),134),(90,113)],CORAL,INK,2)
    elif kind=='ghost':
        polygon(d,[(45,121),(44,75),(55,52),(79,41),(104,53),(116,77),(115,121),(103,108),(91,124),(80,108),(67,124),(56,108)],(105,65,183,205),INK,4)
        ellipse(d,(53,50,108,112),(127,79,215,180),None); ellipse(d,(60,67,76,88),CREAM,INK,2); ellipse(d,(86,67,102,88),CREAM,INK,2); ellipse(d,(66,72,72,83),INK); ellipse(d,(92,72,98,83),INK)
        # aura wisps
        line(d,[(47,79),(29+5*math.sin(p),68),(38,54)],(172,111,255,180),4); line(d,[(113,81),(131-5*math.sin(p),69),(122,54)],(172,111,255,180),4)
    return down(shadowed(l,3,(0,3),.5))

enemies=Image.new('RGBA',(4*160,8*160),(0,0,0,0))
for r,kind in enumerate(['scarab','crawler','slime','hopper','turret','drone','mimic','ghost']):
    for c in range(4): enemies.alpha_composite(enemy_frame(kind,c),(c*160,r*160))
enemies.save(OUT/'enemy-sprites.png',optimize=True)

# --- TILES ---
themes=[
 ('gear',(62,94,138),(32,51,81),GOLD),('garden',(55,117,83),(28,68,57),MINT),('ice',(83,170,211),(34,91,132),CYAN),('foundry',(131,61,48),(54,31,40),CORAL),('storm',(83,73,153),(40,38,100),VIOLET),('library',(110,74,58),(58,39,47),(224,181,113,255)),('moon',(75,82,133),(31,35,70),(210,215,255,255)),('aquarium',(36,119,139),(16,66,91),(71,230,211,255)),('citadel',(83,48,91),(40,24,52),CORAL),('prism',(104,73,166),(42,35,99),(232,214,255,255))]

def tile_frame(theme,wall=False):
    name,a,b,accent=theme; im=new_canvas(128,128); d=ImageDraw.Draw(im)
    # fill gradient
    grad=gradient_rect(128*S,128*S,tuple(list(a)+[255]),tuple(list(b)+[255])); im.alpha_composite(grad)
    d=ImageDraw.Draw(im)
    if wall:
        rr(d,(3,3,125,125),10,(*a,255),INK,4)
        # brick blocks
        for row in range(4):
            y=8+row*29; off=0 if row%2==0 else 16
            for x in range(-off,128,32):
                rr(d,(x+2,y,x+30,y+25),4,(*a,255),(255,255,255,45),1)
        # inset / motif
        if name=='gear':
            ellipse(d,(44,43,84,83),(28,45,74,255),accent,4); ellipse(d,(57,56,71,70),accent,INK,2)
        elif name=='garden':
            line(d,[(16,112),(41,72),(70,57),(111,14)],accent,5); ellipse(d,(60,48,79,60),accent,None)
        elif name=='ice':
            polygon(d,[(12,102),(44,70),(64,80),(115,15)],(190,245,255,115),(235,255,255,210),2)
        elif name=='foundry':
            for x,y in [(18,17),(109,18),(18,108),(109,108)]: ellipse(d,(x-5,y-5,x+5,y+5),GOLD,INK,1)
        elif name=='storm': line(d,[(12,83),(46,83),(46,46),(113,46)],(203,191,255,255),5)
        elif name=='library':
            for x,c in [(21,(151,65,55,255)),(45,(53,113,149,255)),(69,(169,123,49,255)),(93,(79,140,85,255))]: rr(d,(x,24,x+14,108),2,c,(40,29,34,255),2)
        elif name=='moon':
            ellipse(d,(54,46,91,83),(221,224,255,90),(230,235,255,190),2); ellipse(d,(65,42,98,80),(*a,255),None)
        elif name=='aquarium':
            for i in range(4): line(d,[(8,44+i*18),(35,36+i*18),(67,46+i*18),(120,37+i*18)],accent,3)
        elif name=='citadel': line(d,[(14,15),(63,63),(34,96),(111,116)],accent,4)
        elif name=='prism':
            draw_prism(d,64,65,65,(CREAM,CYAN,VIOLET,CORAL))
    else:
        rr(d,(2,2,126,126),9,(*a,255),INK,3)
        # perspective floor seams
        line(d,[(5,92),(123,92)],(0,0,0,55),3); line(d,[(64,5),(64,123)],(255,255,255,25),2)
        if name=='gear':
            ellipse(d,(46,46,82,82),(30,50,78,90),accent,3); ellipse(d,(58,58,70,70),accent,None)
        elif name=='garden':
            line(d,[(10,108),(42,74),(65,71),(112,24)],accent,4)
            for x,y in [(36,78),(66,67),(94,43)]: ellipse(d,(x-5,y-2,x+6,y+3),accent,None)
        elif name=='ice':
            line(d,[(8,105),(45,68),(59,77),(118,18)],(220,252,255,220),3); line(d,[(20,22),(68,70),(111,62)],(161,232,255,160),2)
        elif name=='foundry':
            rr(d,(8,8,120,120),7,(77,39,42,120),None); line(d,[(10,96),(44,70),(71,78),(118,40)],(255,101,48,220),5)
        elif name=='storm':
            for x,y in [(25,25),(103,29),(29,101),(101,99)]: ellipse(d,(x-3,y-3,x+3,y+3),accent,None)
        elif name=='library':
            line(d,[(9,41),(119,41)],(234,196,126,120),2); line(d,[(9,87),(119,87)],(234,196,126,120),2)
        elif name=='moon':
            ellipse(d,(50,44,81,75),(236,239,255,72),None); ellipse(d,(61,39,88,70),(*a,255),None)
        elif name=='aquarium':
            for i in range(3): line(d,[(5,35+i*28),(30,28+i*28),(66,37+i*28),(123,27+i*28)],accent,3)
        elif name=='citadel': line(d,[(13,16),(55,59),(40,79),(112,113)],accent,3)
        elif name=='prism': polygon(d,[(64,16),(102,95),(27,95)],(168,130,236,80),(238,226,255,180),3)
    return down(im)

tiles=Image.new('RGBA',(10*128,2*128),(0,0,0,0))
for c,t in enumerate(themes): tiles.alpha_composite(tile_frame(t,False),(c*128,0)); tiles.alpha_composite(tile_frame(t,True),(c*128,128))
tiles.save(OUT/'tile-sprites.png',optimize=True)

# --- OBJECTS ---
def object_frame(idx,cell=160):
    l=new_canvas(cell,cell); d=ImageDraw.Draw(l); cx=80; cy=86
    ellipse(d,(46,132,114,143),(0,0,0,70))
    if idx in (0,1):
        col=(160,95,49,255) if idx==0 else (115,80,63,255); rr(d,(35,39,125,130),11,col,INK,4); rr(d,(44,48,116,121),7,(188,118,57,255),None)
        line(d,[(43,47),(117,122)],(238,176,92,255),8); line(d,[(117,47),(43,122)],(238,176,92,255),8)
        for x,y in [(44,48),(116,48),(44,121),(116,121)]: ellipse(d,(x-4,y-4,x+4,y+4),GOLD,INK,1)
    elif idx==2:
        rr(d,(35,39,125,130),12,(102,203,232,185),(221,252,255,255),4); line(d,[(45,116),(86,70),(105,83),(121,50)],(235,255,255,230),4)
    elif idx==3:
        rr(d,(35,39,125,130),12,(82,54,128,255),INK,4); draw_prism(d,80,83,58)
    elif idx==4: # lock
        rr(d,(44,68,116,127),10,(77,82,94,255),INK,4); line(d,[(58,70),(58,48),(69,35),(92,35),(103,48),(103,70)],(207,216,231,255),9); ellipse(d,(73,82,87,99),GOLD,INK,2); rr(d,(78,94,82,111),2,GOLD,None)
    elif idx==5: # plate
        ellipse(d,(33,92,127,126),(82,76,67,255),INK,4); ellipse(d,(47,82,113,112),(255,203,79,255),INK,3); ellipse(d,(59,88,101,105),(255,240,160,255),None)
    elif idx==6: # gate
        rr(d,(33,29,127,136),8,(60,62,73,255),INK,4)
        for x in [46,68,92,114]: line(d,[(x,38),(x,129)],(206,213,227,255),7)
        line(d,[(39,53),(121,53)],GOLD,5); line(d,[(39,113),(121,113)],GOLD,5)
    elif idx==7: # door
        rr(d,(37,28,123,136),10,(103,56,38,255),INK,4); rr(d,(45,36,115,130),7,(148,80,47,255),(222,158,83,255),3); ellipse(d,(96,80,106,90),GOLD,INK,1)
    elif idx==8: # conveyor
        rr(d,(22,56,138,122),13,(60,65,78,255),INK,4)
        for y in [68,105]: line(d,[(31,y),(129,y)],(164,174,190,255),4)
        for x in [42,69,96,123]: ellipse(d,(x-7,75,x+7,94),(37,41,53,255),INK,2)
        polygon(d,[(58,101),(84,81),(84,94),(112,94),(112,108),(84,108),(84,121)],CYAN,INK,2)
    elif idx==9: # ice
        rr(d,(32,35,128,132),12,(90,196,232,180),(225,253,255,255),4); line(d,[(41,121),(78,76),(95,89),(121,48)],(242,255,255,230),4)
    elif idx==10: # exit portal
        ellipse(d,(34,30,126,136),(24,30,54,255),INK,4); ellipse(d,(45,40,115,126),(88,53,158,255),VIOLET,4); ellipse(d,(58,53,102,114),(60,26,102,255),CYAN,3); draw_prism(d,80,83,30)
    elif idx in (11,12): # teleports
        col=CYAN if idx==11 else VIOLET
        for r in [18,31,44]:
            d.arc(box(80-r,84-r,80+r,84+r),start=sc(phase:=0),end=sc(330),fill=col,width=sc(4))
        ellipse(d,(72,76,88,92),CREAM,None)
    elif idx==13: # fragile
        rr(d,(27,47,133,127),8,(98,95,92,255),INK,4); line(d,[(34,55),(69,82),(58,104),(90,125)],CREAM,4); line(d,[(69,82),(111,55)],CREAM,4); line(d,[(58,104),(34,121)],CREAM,4)
    elif idx==14: # broken hole
        polygon(d,[(26,62),(50,43),(77,51),(102,40),(134,66),(123,111),(95,130),(59,123),(32,108)],(13,15,26,255),INK,4); polygon(d,[(43,70),(68,58),(90,65),(111,56),(119,91),(96,114),(62,110),(39,96)],(0,0,0,255),None)
    elif idx==15: # spikes
        for x in [35,58,81,104,127]: polygon(d,[(x-13,126),(x,54),(x+13,126)],(187,197,214,255),INK,3)
    elif idx in (16,17):
        rr(d,(38,55,122,129),12,(62,68,82,255),INK,4); ellipse(d,(55,67,105,117),CORAL if idx==16 else MINT,INK,4); ellipse(d,(68,79,92,103),CREAM,None)
    elif idx==18:
        rr(d,(34,76,126,129),10,(69,72,84,255),INK,4); rr(d,(65,35,95,84),8,(80,84,100,255),INK,3); ellipse(d,(67,43,93,69),CORAL,INK,3); line(d,[(94,56),(139,56)],CORAL,7)
    elif idx==19:
        rr(d,(23,82,137,123),7,(91,63,43,255),INK,4)
        for x in [32,55,78,101,124]:
            rr(d,(x,71,x+10,132),3,(138,87,50,255),INK,2)
    return down(shadowed(l,3,(0,3),.4))

objects=Image.new('RGBA',(5*160,4*160),(0,0,0,0))
for i in range(20): objects.alpha_composite(object_frame(i),((i%5)*160,(i//5)*160))
objects.save(OUT/'object-sprites.png',optimize=True)

# --- COLLECTIBLES ---
def collect_frame(i,cell=160):
    l=new_canvas(cell,cell); d=ImageDraw.Draw(l)
    ellipse(d,(50,130,110,140),(0,0,0,65))
    if i<4:
        colors=[(CYAN,VIOLET,CORAL,CREAM),(VIOLET,CYAN,GOLD,CREAM),(CORAL,GOLD,VIOLET,CREAM),(MINT,CYAN,VIOLET,CREAM)][i]
        draw_prism(d,80,79,66,colors)
        for a in range(0,360,45):
            r1=50;r2=62; x1=80+math.cos(math.radians(a))*r1; y1=79+math.sin(math.radians(a))*r1; x2=80+math.cos(math.radians(a))*r2; y2=79+math.sin(math.radians(a))*r2; line(d,[(x1,y1),(x2,y2)],colors[0],2)
    else:
        cols=[CORAL,CYAN,MINT,GOLD]; c=cols[i-4]
        ellipse(d,(37,45,83,91),(0,0,0,0),c,10); line(d,[(76,82),(122,125)],c,11); line(d,[(103,106),(115,93)],c,8); line(d,[(113,117),(126,103)],c,8)
        ellipse(d,(49,57,71,79),CREAM,None)
    return down(shadowed(l,3,(0,3),.45))
collect=Image.new('RGBA',(4*160,2*160),(0,0,0,0))
for i in range(8): collect.alpha_composite(collect_frame(i),((i%4)*160,(i//4)*160))
collect.save(OUT/'collectible-sprites.png',optimize=True)

# --- VFX ---
def vfx_frame(i,cell=160):
    l=new_canvas(cell,cell); d=ImageDraw.Draw(l); cx=80;cy=80
    colors=[GOLD,CYAN,VIOLET,CORAL,MINT,(220,240,255,255),(255,125,55,255),(180,145,255,255)]; c=colors[i]
    if i==0:
        for a in range(0,360,30):
            r1=18 if a%60 else 8; r2=62 if a%60 else 48; line(d,[(cx+math.cos(math.radians(a))*r1,cy+math.sin(math.radians(a))*r1),(cx+math.cos(math.radians(a))*r2,cy+math.sin(math.radians(a))*r2)],c,5)
        ellipse(d,(62,62,98,98),CREAM,None)
    elif i==1:
        ellipse(d,(40,40,120,120),(0,0,0,0),c,8); ellipse(d,(55,55,105,105),(0,0,0,0),CREAM,3); polygon(d,[(80,25),(90,65),(135,80),(90,95),(80,135),(70,95),(25,80),(70,65)],(255,255,255,90),None)
    elif i==2:
        for r in [18,35,52]: d.arc(box(cx-r,cy-r,cx+r,cy+r),0,sc(320),fill=c,width=sc(5)); ellipse(d,(70,70,90,90),CREAM,None)
    elif i==3:
        line(d,[(18,80),(142,80)],c,12); line(d,[(18,80),(142,80)],CREAM,3); ellipse(d,(16,72,32,88),CREAM,None); ellipse(d,(128,72,144,88),CREAM,None)
    elif i==4:
        for a in range(0,360,45): polygon(d,[(cx,cy),(cx+math.cos(math.radians(a-.18))*65,cy+math.sin(math.radians(a-.18))*65),(cx+math.cos(math.radians(a+.18))*65,cy+math.sin(math.radians(a+.18))*65)],(*c[:3],130),None)
        ellipse(d,(66,66,94,94),CREAM,None)
    elif i==5:
        for j in range(12):
            a=j/12*math.tau; r=20+(j%3)*14; x=cx+math.cos(a)*r;y=cy+math.sin(a)*r; polygon(d,[(x,y-8),(x+5,y),(x,y+8),(x-5,y)],c,None)
    elif i==6:
        for j in range(15):
            a=j/15*math.tau; r=20+(j%4)*11; x=cx+math.cos(a)*r;y=cy+math.sin(a)*r; ellipse(d,(x-4,y-4,x+4,y+4),c,None)
    else:
        for a in range(0,360,20): line(d,[(cx,cy),(cx+math.cos(math.radians(a))*65,cy+math.sin(math.radians(a))*65)],c,3)
        draw_prism(d,cx,cy,45)
    return down(l.filter(ImageFilter.GaussianBlur(sc(.5))))
vfx=Image.new('RGBA',(4*160,2*160),(0,0,0,0))
for i in range(8): vfx.alpha_composite(vfx_frame(i),((i%4)*160,(i//4)*160))
vfx.save(OUT/'vfx-sprites.png',optimize=True)

# --- KEY ART / COMICS FROM GENERATED SOURCE, CLEANED ---
source=Image.open(SRC).convert('RGB')
# crop source's key-art area while avoiding sheet dividers as much as possible
sw,sh=source.size
crop=source.crop((0,0,640,360))
crop=crop.resize((1600,900),Image.Resampling.LANCZOS)
# vignette and bottom darkening for UI legibility
ka=crop.convert('RGBA'); overlay=Image.new('RGBA',ka.size,(0,0,0,0)); od=ImageDraw.Draw(overlay)
for y in range(900):
    a=int(max(0,(y-600)/300)*125); od.line((0,y,1600,y),fill=(5,7,18,a))
# border vignette mask
mask=Image.new('L',(1600,900),0); md=ImageDraw.Draw(mask); md.ellipse((-300,-180,1900,1080),fill=255); mask=ImageChops.invert(mask.filter(ImageFilter.GaussianBlur(110)))
vig=Image.new('RGBA',(1600,900),(0,0,0,130)); vig.putalpha(mask.point(lambda p:int(p*.65)))
ka=Image.alpha_composite(ka,overlay); ka=Image.alpha_composite(ka,vig)
ka.convert('RGB').save(OUT/'key-art.webp','WEBP',quality=94,method=6)
ka.resize((1200,675),Image.Resampling.LANCZOS).convert('RGB').save(OUT/'og-image.webp','WEBP',quality=92,method=6)

# clean logo rendered from bundled raster, not runtime font dependency
logo=new_canvas(1000,360); ld=ImageDraw.Draw(logo)
def fit_font(text,path,maxw,start):
    size=start
    while size>10:
        f=ImageFont.truetype(path,sc(size)); bb=ld.textbbox((0,0),text,font=f,stroke_width=sc(2))
        if bb[2]-bb[0]<=sc(maxw): return f
        size-=2
    return ImageFont.truetype(path,sc(size))
# text shadows and gradient mask
f1=fit_font('SUPER SEAN 007',font_serif,760,88); f2=fit_font('PRISM VAULT',font_serif,940,128)
ld.text(pt(500,87),'SUPER SEAN 007',font=f1,anchor='mm',fill=(0,0,0,190),stroke_width=sc(6),stroke_fill=INK)
ld.text(pt(500,215),'PRISM VAULT',font=f2,anchor='mm',fill=GOLD,stroke_width=sc(7),stroke_fill=INK)
ld.text(pt(500,84),'SUPER SEAN 007',font=f1,anchor='mm',fill=CREAM,stroke_width=sc(2),stroke_fill=(121,71,29,255))
ld.text(pt(500,210),'PRISM VAULT',font=f2,anchor='mm',fill=(255,200,70,255),stroke_width=sc(2),stroke_fill=(137,70,25,255))
line(ld,[(150,291),(850,291)],CYAN,5); draw_prism(ld,500,291,28)
ld.text(pt(500,326),'WWW.SUPERSEAN007.COM',font=ImageFont.truetype(font_sans,sc(28)),anchor='mm',fill=(219,232,255,255),stroke_width=sc(1),stroke_fill=INK)
down(shadowed(logo,4,(0,5),.55)).save(OUT/'logo.png',optimize=True)

# comics: use five source panels where present, else key-art-derived crops with color grading
# bottom-left story panels in latest sheet roughly x 0..610 y .69..93
if sw>=1000 and sh>=700:
    y0=718; y1=870; ranges=[(8,124),(126,242),(244,360),(362,478),(480,596)]
    crops=[]
    for x0,x1 in ranges:
        c=source.crop((x0,y0,x1,y1)).resize((1280,500),Image.Resampling.LANCZOS)
        crops.append(c)
else: crops=[]
for i in range(5):
    if i<len(crops): c=crops[i]
    else:
        x=int((i/5)*max(1,sw-800)); c=source.crop((x,0,min(sw,x+800),min(sh,450))).resize((1280,500),Image.Resampling.LANCZOS)
    # cinematic grade / border
    ci=c.convert('RGBA'); ov=Image.new('RGBA',ci.size,(0,0,0,0)); dd=ImageDraw.Draw(ov); dd.rectangle((0,0,1279,499),outline=(255,205,90,255),width=8); dd.rectangle((12,12,1267,487),outline=(6,8,20,230),width=4)
    ci=Image.alpha_composite(ci,ov)
    ci.convert('RGB').save(OUT/f'comic-{i+1}.webp','WEBP',quality=93,method=6)

# icons from hero/prism key art
icon=new_canvas(512,512,(16,19,45,255)); idr=ImageDraw.Draw(icon); draw_prism(idr,256,230,230); rr(idr,(80,382,432,455),28,(21,31,75,235),GOLD,5); idr.text(pt(256,418),'SEAN 007',font=ImageFont.truetype(font_serif,sc(54)),anchor='mm',fill=CREAM,stroke_width=sc(3),stroke_fill=INK)
icon512=down(icon); icon512.save(OUT/'app-icon-512.png',optimize=True); icon512.resize((192,192),Image.Resampling.LANCZOS).save(OUT/'app-icon-192.png',optimize=True); icon512.resize((64,64),Image.Resampling.LANCZOS).save(OUT/'favicon.png',optimize=True)

# asset bible contact sheet from final individual files (no embedded bogus text)
thumbs=[]
for name in ['key-art.webp','hero-sprites.png','enemy-sprites.png','tile-sprites.png','object-sprites.png','collectible-sprites.png','vfx-sprites.png']:
    im=Image.open(OUT/name).convert('RGBA'); im.thumbnail((760,360),Image.Resampling.LANCZOS); thumbs.append((name,im.copy()))
bible=Image.new('RGB',(1600,1600),(8,11,23)); bd=ImageDraw.Draw(bible); font=ImageFont.truetype(font_sans,32)
y=24
for name,im in thumbs:
    bd.text((24,y),name,font=font,fill=(245,207,107)); bible.paste(im,(24,y+44),im); y+=max(190,im.height+78)
bible.save(OUT/'commercial-art-bible.webp','WEBP',quality=92,method=6)

manifest={
 'version':'3.6.0-pages-resilience-polish',
 'hero':{'cell':[160,160],'cols':6,'rows':4,'states':{'idle':[0,5],'walk':[6,11],'push':[12,17],'special':[18,23]}},
 'enemies':{'cell':[160,160],'cols':4,'rows':8,'order':['scarab','crawler','slime','hopper','turret','drone','mimic','ghost'],'framesPerEnemy':4},
 'tiles':{'cell':[128,128],'cols':10,'rows':2,'row0':'floor','row1':'wall'},
 'objects':{'cell':[160,160],'cols':5,'rows':4},
 'collectibles':{'cell':[160,160],'cols':4,'rows':2},
 'vfx':{'cell':[160,160],'cols':4,'rows':2},
 'screens':['title','comic','levelSelect','playing','paused','victory','defeat','settings','help','credits','chapterComplete','complete'],
 'shippingFiles':['app-icon-192.png','app-icon-512.png','app-icon-maskable-192.png','app-icon-maskable-512.png','favicon.png','og-image.webp','install-wide.webp','install-narrow.webp','key-art.webp','logo.png','hero-sprites.png','enemy-sprites.png','object-sprites.png','collectible-sprites.png','tile-sprites.png','vfx-sprites.png','ui-atlas.png',*[f'backdrop-{i:02}.webp' for i in range(1,11)],*[f'comic-{i}.webp' for i in range(1,6)]],
 'qualityGate':{'failFastLoading':True,'proceduralFallbacks':False,'atlasCellsValidated':True,'headlessScreenRenderSmoke':True,'contentHashedOfflineCache':True},
}
(OUT/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'files':sorted(p.name for p in OUT.iterdir())},indent=2))

# --- CHAPTER BACKDROPS ---
def chapter_backdrop(theme_index:int):
    name,a,b,accent=themes[theme_index]
    w,h=1280,720
    im=Image.new('RGBA',(w,h),(0,0,0,255)); dr=ImageDraw.Draw(im)
    # vertical atmosphere gradient
    for y in range(h):
        t=y/(h-1); c=tuple(int((b[i]*.55)*(1-t)+(a[i]*.62)*t) for i in range(3))+(255,); dr.line((0,y,w,y),fill=c)
    # distant vault arches
    for k in range(7):
        x=80+k*205; top=75+(k%2)*35
        dr.rounded_rectangle((x-75,top,x+75,680),radius=70,fill=(7,10,27,105),outline=(*accent[:3],45),width=5)
        dr.rounded_rectangle((x-51,top+30,x+51,655),radius=48,fill=(7,10,24,92),outline=(255,255,255,18),width=2)
    # central door / focal portal
    dr.rounded_rectangle((470,65,810,690),radius=155,fill=(4,7,22,145),outline=(*accent[:3],105),width=10)
    dr.rounded_rectangle((510,110,770,660),radius=125,fill=(5,9,28,130),outline=(255,255,255,30),width=3)
    # world-specific silhouettes
    if name=='gear':
        for cx,cy,r in [(160,560,90),(1080,535,115),(900,610,55)]:
            dr.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(*accent[:3],100),width=14)
            for j in range(12):
                a0=j*math.tau/12; x1=cx+math.cos(a0)*r; y1=cy+math.sin(a0)*r; x2=cx+math.cos(a0)*(r+24); y2=cy+math.sin(a0)*(r+24); dr.line((x1,y1,x2,y2),fill=(*accent[:3],95),width=12)
    elif name=='garden':
        for x in range(0,w,120):
            dr.line((x,720,x+70,420),fill=(35,105,67,130),width=20)
            for q in range(3): dr.ellipse((x+20+q*16,470-q*55,x+80+q*16,500-q*55),fill=(90,220,135,75))
    elif name=='ice':
        for x in [30,175,990,1130]:
            dr.polygon([(x,700),(x+80,385),(x+150,700)],fill=(105,220,250,75),outline=(210,250,255,130))
    elif name=='foundry':
        for x in [70,260,980,1160]:
            dr.rectangle((x,420,x+70,720),fill=(35,20,26,180)); dr.ellipse((x+8,390,x+62,448),fill=(255,94,35,100)); dr.line((x+35,385,x+35,270),fill=(255,144,65,90),width=16)
    elif name=='storm':
        for x in [100,330,935,1160]:
            dr.line((x,675,x+30,360,x-25,245),fill=(175,155,255,100),width=7)
            dr.ellipse((x-20,225,x+30,275),fill=(188,170,255,55))
    elif name=='library':
        for x in [15,165,1010,1160]:
            dr.rectangle((x,330,x+115,710),fill=(41,27,35,190),outline=(215,168,105,70),width=4)
            for yy in range(355,680,42): dr.line((x+8,yy,x+107,yy),fill=(230,190,120,55),width=3)
    elif name=='moon':
        dr.ellipse((925,95,1145,315),fill=(220,226,255,50),outline=(235,240,255,110),width=5); dr.ellipse((990,70,1175,270),fill=(22,28,70,240))
        for x in [150,310,980]: dr.ellipse((x,430,x+90,520),outline=(210,220,255,70),width=5)
    elif name=='aquarium':
        for y in [190,320,490]:
            pts=[]
            for x in range(-30,1340,40): pts.append((x,y+math.sin(x*.018+y)*18))
            dr.line(pts,fill=(75,235,220,45),width=6)
        for x,y,r in [(160,210,14),(1130,300,18),(980,140,10),(310,430,12)]: dr.ellipse((x-r,y-r,x+r,y+r),outline=(180,250,255,80),width=4)
    elif name=='citadel':
        for x in [30,200,1040,1190]: dr.polygon([(x,720),(x+55,270),(x+110,720)],fill=(35,20,45,210),outline=(255,90,110,55))
    elif name=='prism':
        for x,y,siz in [(170,480,110),(1060,430,135),(930,625,70),(320,635,55)]:
            pts=[(x,y-siz),(x+siz*.55,y),(x+siz*.25,y+siz),(x-siz*.3,y+siz*.82),(x-siz*.55,y)]
            dr.polygon(pts,fill=(150,90,230,52),outline=(230,220,255,100))
    # foreground floor and soft lights
    dr.polygon([(0,560),(1280,520),(1280,720),(0,720)],fill=(4,7,18,200))
    for x in range(0,w,160):
        dr.polygon([(x,720),(x+115,720),(x+82,565),(x+30,570)],fill=(*a,75),outline=(255,255,255,18))
    # atmospheric particles
    for i in range(90):
        x=(i*149+theme_index*37)%w; y=(i*83+theme_index*61)%h; r=1+(i%3)
        dr.ellipse((x-r,y-r,x+r,y+r),fill=(*accent[:3],35+(i%5)*10))
    return im.convert('RGB')

for i in range(10):
    chapter_backdrop(i).save(OUT/f'backdrop-{i+1:02d}.webp','WEBP',quality=90,method=6)

# --- UI ATLAS: 4x2 cells, production chrome ---
ui=Image.new('RGBA',(4*320,2*160),(0,0,0,0))
def ui_cell(kind):
    c=Image.new('RGBA',(320,160),(0,0,0,0)); d=ImageDraw.Draw(c)
    if kind in ('panel','panelGold','dialog'):
        base=(17,24,57,245) if kind!='dialog' else (251,240,201,248)
        border=(112,134,205,210) if kind=='panel' else ((245,190,63,245) if kind=='panelGold' else (28,33,61,245))
        d.rounded_rectangle((5,5,315,155),radius=28,fill=base,outline=border,width=5)
        d.rounded_rectangle((14,14,306,146),radius=20,outline=(255,255,255,35),width=2)
        for x,y in [(22,22),(298,22),(22,138),(298,138)]: d.ellipse((x-4,y-4,x+4,y+4),fill=border)
    elif kind in ('button','buttonHover'):
        top=(76,103,184,255) if kind=='button' else (255,228,111,255); bottom=(32,52,115,255) if kind=='button' else (205,132,50,255)
        for y in range(150):
            t=y/149; col=tuple(int(top[i]*(1-t)+bottom[i]*t) for i in range(4)); d.line((8,5+y,312,5+y),fill=col)
        d.rounded_rectangle((5,5,315,155),radius=26,outline=INK,width=6)
        d.rounded_rectangle((14,14,306,38),radius=12,fill=(255,255,255,38))
    elif kind=='badge':
        d.ellipse((52,5,268,155),fill=(24,31,69,250),outline=GOLD,width=6); d.ellipse((70,22,250,138),outline=(255,255,255,35),width=3); draw_prism(d,160,80,78)
    elif kind=='star':
        pts=[]
        for j in range(10):
            ang=-math.pi/2+j*math.pi/5; rad=65 if j%2==0 else 28; pts.append((160+math.cos(ang)*rad,80+math.sin(ang)*rad))
        d.polygon(pts,fill=GOLD,outline=INK); d.line(pts+[pts[0]],fill=INK,width=5)
    elif kind=='chip':
        d.rounded_rectangle((18,32,302,128),radius=34,fill=(22,30,69,245),outline=(91,222,255,220),width=5); d.rounded_rectangle((30,44,290,65),radius=9,fill=(255,255,255,30))
    return c
for i,k in enumerate(['panel','panelGold','button','buttonHover','dialog','badge','star','chip']): ui.alpha_composite(ui_cell(k),((i%4)*320,(i//4)*160))
ui.save(OUT/'ui-atlas.png',optimize=True)

# regenerate bible including new UI/backdrops
thumbs=[]
for name in ['key-art.webp','hero-sprites.png','enemy-sprites.png','tile-sprites.png','object-sprites.png','collectible-sprites.png','vfx-sprites.png','ui-atlas.png','backdrop-01.webp','backdrop-10.webp']:
    im=Image.open(OUT/name).convert('RGBA'); im.thumbnail((760,300),Image.Resampling.LANCZOS); thumbs.append((name,im.copy()))
bible=Image.new('RGB',(1600,2400),(8,11,23)); bd=ImageDraw.Draw(bible); font=ImageFont.truetype(font_sans,32)
y=24
for name,im in thumbs:
    bd.text((24,y),name,font=font,fill=(245,207,107)); bible.paste(im,(24,y+44),im); y+=max(180,im.height+76)
bible.save(OUT/'commercial-art-bible.webp','WEBP',quality=92,method=6)
print('generated chapter backdrops and UI atlas')
