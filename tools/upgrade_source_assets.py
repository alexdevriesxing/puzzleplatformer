from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import cv2, numpy as np, json

ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'assets/source/final-art-source.png'; OUT=ROOT/'assets/commercial'
source=Image.open(SRC).convert('RGB')
def panel(box):
    im=source.crop(box);return im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS)
hero_panel=panel((680,0,1024,360));enemy_panel=panel((1024,0,1536,360));env_panel=panel((0,360,580,692));obj_panel=panel((580,360,980,692));cv_panel=panel((980,360,1255,692))

def extract(im,bbox,cell=160,fit=146,pad=5,keep=2):
    crop=np.array(im.crop(bbox).convert('RGB'));h,w=crop.shape[:2]
    mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8);edge=max(4,min(h,w)//15)
    mask[:edge,:]=mask[-edge:,:]=mask[:,:edge]=mask[:,-edge:]=cv2.GC_BGD
    hsv=cv2.cvtColor(crop,cv2.COLOR_RGB2HSV);v=hsv[:,:,2];sat=hsv[:,:,1]
    yy,xx=np.mgrid[:h,:w];center=((xx-w/2)/(w*.58))**2+((yy-h/2)/(h*.62))**2<1
    mask[((v>62)&(sat>45)&center)|((v>115)&center)]=cv2.GC_PR_FGD
    mask[(v>170)&center]=cv2.GC_FGD
    bgd=np.zeros((1,65),np.float64);fgd=np.zeros((1,65),np.float64)
    try:cv2.grabCut(crop,mask,None,bgd,fgd,6,cv2.GC_INIT_WITH_MASK)
    except cv2.error:pass
    raw=((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)).astype(np.uint8)
    n,labels,stats,cent=cv2.connectedComponentsWithStats(raw,8)
    scores=[]
    for i in range(1,n):
        area=stats[i,cv2.CC_STAT_AREA];cx,cy=cent[i];dist=((cx-w/2)/(w/2))**2+((cy-h*.55)/(h*.55))**2
        if area>max(10,h*w//1200):scores.append((area/(1+dist*2.5),i))
    scores.sort(reverse=True);alpha=np.zeros((h,w),np.uint8)
    for _,i in scores[:keep]:alpha[labels==i]=255
    alpha=cv2.GaussianBlur(alpha,(0,0),.65)
    rgba=np.dstack([crop,alpha]);pil=Image.fromarray(rgba,'RGBA');bb=pil.getchannel('A').getbbox()
    if not bb:return Image.new('RGBA',(cell,cell))
    pil=pil.crop(bb);scale=min(fit/pil.width,fit/pil.height);pil=pil.resize((max(1,int(pil.width*scale)),max(1,int(pil.height*scale))),Image.Resampling.LANCZOS)
    rgb=ImageEnhance.Color(pil.convert('RGB')).enhance(1.08);rgb=ImageEnhance.Contrast(rgb).enhance(1.07);rgb.putalpha(pil.getchannel('A'));pil=rgb
    out=Image.new('RGBA',(cell,cell));out.alpha_composite(pil,((cell-pil.width)//2,cell-pad-pil.height));return out

# Dedicated, frame-aligned hero atlas from the illustrated animation panel.
idle=[(118,65,190,178),(210,65,282,178),(300,65,374,178),(395,65,468,178),(488,65,560,178),(575,65,648,178)]
walk=[(110,185,195,302),(205,185,288,302),(298,185,382,302),(392,185,477,302),(480,185,565,302),(570,185,655,302)]
pull=[(100,405,205,510),(205,405,300,510),(295,405,390,510),(390,405,500,510),(540,400,655,520)]
special=[(195,505,305,605),(305,505,405,605),(405,505,510,605),(540,400,655,520),(105,605,215,705),(220,605,330,705)]
hero=Image.new('RGBA',(960,640))
for row,boxes in enumerate([idle,walk,pull+[pull[-1]],special]):
    for col,b in enumerate(boxes[:6]):hero.alpha_composite(extract(hero_panel,b,keep=3),(col*160,row*160))
hero.save(OUT/'hero-sprites.png',optimize=True)

# Eight distinct high-detail enemy families with four subtle animation phases each.
boxes=[(35,55,225,215),(250,55,465,215),(505,55,725,215),(775,55,980,215),(30,335,220,520),(245,335,470,520),(490,335,710,525),(735,325,1000,535)]
enemy=Image.new('RGBA',(640,1280))
for row,b in enumerate(boxes):
    base=extract(enemy_panel,b,fit=150,pad=3,keep=4)
    for phase in range(4):
        angle=(-1.2,0,1.2,0)[phase];scale=(.975,1,1.025,1)[phase]
        fr=base.rotate(angle,resample=Image.Resampling.BICUBIC,expand=False);nw=int(160*scale);nh=int(160*(1+(scale-1)*.7));fr=fr.resize((nw,nh),Image.Resampling.LANCZOS)
        c=Image.new('RGBA',(160,160));c.alpha_composite(fr,((160-nw)//2,(160-nh)//2+(1,0,-1,0)[phase]));enemy.alpha_composite(c,(phase*160,row*160))
enemy.save(OUT/'enemy-sprites.png',optimize=True)

# Four prism colors and four key colors, using production illustrations.
prism=extract(cv_panel,(165,45,310,175),fit=150,pad=4,keep=5);collect=Image.new('RGBA',(640,320))
for i,shift in enumerate((0,28,72,118)):
    arr=np.array(prism);hsv=cv2.cvtColor(arr[:,:,:3],cv2.COLOR_RGB2HSV);hsv[:,:,0]=(hsv[:,:,0].astype(np.int16)+shift)%180;arr[:,:,:3]=cv2.cvtColor(hsv.astype(np.uint8),cv2.COLOR_HSV2RGB);collect.alpha_composite(Image.fromarray(arr,'RGBA'),(i*160,0))
key_boxes=[(165,45,285,180),(265,45,385,180),(365,45,485,180)]
keys=[extract(obj_panel,b,fit=142,pad=6,keep=3) for b in key_boxes]
arr=np.array(keys[0]);hsv=cv2.cvtColor(arr[:,:,:3],cv2.COLOR_RGB2HSV);hsv[:,:,0]=22;hsv[:,:,1]=np.maximum(hsv[:,:,1],170);arr[:,:,:3]=cv2.cvtColor(hsv.astype(np.uint8),cv2.COLOR_HSV2RGB);keys.append(Image.fromarray(arr,'RGBA'))
for i,k in enumerate(keys):collect.alpha_composite(k,(i*160,160))
collect.save(OUT/'collectible-sprites.png',optimize=True)

# Ten detailed chapter backdrops derived from the final approved environment paintings.
theme_boxes=[]
for r in range(2):
    for c in range(5):theme_boxes.append((c*116+5,r*166+28,c*116+115,r*166+163)) # omit labels
for i,b in enumerate(theme_boxes):
    card=env_panel.crop(b).convert('RGB');segment=card.resize((320,720),Image.Resampling.LANCZOS);scene=Image.new('RGB',(1280,720))
    for x in range(0,1280,320):scene.paste(segment if (x//320)%2==0 else segment.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(x,0))
    soft=scene.filter(ImageFilter.GaussianBlur(.8));scene=Image.blend(soft,scene,.68)
    arr=np.array(scene).astype(np.float32);yy,xx=np.mgrid[:720,:1280];rad=np.sqrt(((xx-640)/780)**2+((yy-360)/520)**2);shade=np.clip(1.07-rad*.45,.52,1)[...,None];top=(.62+.38*(yy/720))[...,None];arr=np.clip(arr*shade*top,0,255).astype(np.uint8)
    Image.fromarray(arr).save(OUT/f'backdrop-{i+1:02}.webp','WEBP',quality=92,method=6)

m=json.loads((OUT/'asset-manifest.json').read_text());m['version']='3.4.0-commercial-ui-polish';m['provenance']='Frame-aligned illustrated hero/enemy/collectible atlases and ten detailed chapter backdrops derived from the approved final art source.';(OUT/'asset-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print('Production source-art upgrade complete.')

# --- final cleanup pass: color-keyed hero frames and label-free chapter paintings ---
def extract_keyed(im,bbox,cell=160,fit=146,pad=4,keep_n=1):
    crop=np.array(im.crop(bbox).convert('RGB'));h,w=crop.shape[:2]
    border=np.concatenate([crop[:5].reshape(-1,3),crop[-5:].reshape(-1,3),crop[:,:5].reshape(-1,3),crop[:,-5:].reshape(-1,3)])
    lum=border.mean(1);sample=border[lum<np.percentile(lum,70)];bg=np.median(sample,axis=0) if len(sample) else np.median(border,axis=0)
    lab=cv2.cvtColor(crop,cv2.COLOR_RGB2LAB).astype(np.float32);bgl=cv2.cvtColor(np.uint8([[bg]]),cv2.COLOR_RGB2LAB).astype(np.float32)[0,0]
    dist=np.linalg.norm(lab-bgl,axis=2);alpha=np.clip((dist-10)*14,0,255).astype(np.uint8)
    # Keep meaningful components, suppress line/text flecks.
    n,labels,stats,cent=cv2.connectedComponentsWithStats((alpha>24).astype(np.uint8),8);chosen=[]
    for i in range(1,n):
        area=stats[i,cv2.CC_STAT_AREA];cx,cy=cent[i]
        cw=stats[i,cv2.CC_STAT_WIDTH];ch=stats[i,cv2.CC_STAT_HEIGHT]
        if area>=12 and ch>=10 and cw/ch<4.5 and ch/cw<5 and 2<cx<w-2 and 2<cy<h-2:chosen.append((area,i))
    chosen.sort(reverse=True);clean=np.zeros_like(alpha)
    for _,i in chosen[:keep_n]:clean[labels==i]=alpha[labels==i]
    alpha=cv2.GaussianBlur(clean,(0,0),.45)
    pil=Image.fromarray(np.dstack([crop,alpha]),'RGBA');bb=pil.getchannel('A').getbbox()
    if not bb:return Image.new('RGBA',(cell,cell))
    pil=pil.crop(bb);scale=min(fit/pil.width,fit/pil.height);pil=pil.resize((max(1,int(pil.width*scale)),max(1,int(pil.height*scale))),Image.Resampling.LANCZOS)
    rgb=ImageEnhance.Color(pil.convert('RGB')).enhance(1.08);rgb=ImageEnhance.Contrast(rgb).enhance(1.06);rgb.putalpha(pil.getchannel('A'));pil=rgb
    out=Image.new('RGBA',(cell,cell));out.alpha_composite(pil,((cell-pil.width)//2,cell-pad-pil.height));return out

idle2=[(105,58,198,180),(195,58,292,180),(285,58,388,180),(375,58,480,180),(455,58,575,180),(540,58,665,180)]
walk2=[(95,178,208,305),(185,178,302,305),(275,178,395,305),(365,178,490,305),(450,178,585,305),(535,178,670,305)]
pull2=[(90,397,215,518),(185,397,315,518),(275,397,405,518),(365,397,515,518),(515,392,670,528)]
special2=[(175,497,320,612),(280,497,425,612),(385,497,530,612),(515,392,670,528),(85,592,230,712),(190,592,345,712)]
hero2=Image.new('RGBA',(960,640))
for row,boxes in enumerate([idle2,walk2,pull2+[pull2[-1]]]):
    for col,b in enumerate(boxes[:6]):hero2.alpha_composite(extract_keyed(hero_panel,b,keep_n=1),(col*160,row*160))
heroic=extract_keyed(hero_panel,(515,392,670,528),keep_n=1)
for col,(ang,scale,yoff) in enumerate([(-1.4,.98,2),(0,1,0),(1.4,1.02,-1),(0,1,0)]):
    fr=heroic.rotate(ang,resample=Image.Resampling.BICUBIC,expand=False);nw=int(160*scale);nh=int(160*scale);fr=fr.resize((nw,nh),Image.Resampling.LANCZOS);cell=Image.new('RGBA',(160,160));cell.alpha_composite(fr,((160-nw)//2,(160-nh)//2+yoff));hero2.alpha_composite(cell,(col*160,480))
hero2.alpha_composite(extract_keyed(hero_panel,(85,592,230,712),keep_n=1),(4*160,480))
hero2.alpha_composite(extract_keyed(hero_panel,(190,592,345,712),keep_n=1),(5*160,480))
hero2.save(OUT/'hero-sprites.png',optimize=True)

# Correct 5x2 card coordinates in the 2x environment panel, excluding all headings.
for i in range(10):
    r=i//5;c=i%5
    x0=c*232+5;x1=min((c+1)*232-5,env_panel.width-2)
    y0=(92 if r==0 else 402);y1=(344 if r==0 else 650)
    card=env_panel.crop((x0,y0,x1,y1)).convert('RGB')
    # Build depth: blurred full-frame material, mirrored architectural midground, dark floor vignette.
    base=card.resize((1280,720),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(1.0))
    seg=card.resize((320,720),Image.Resampling.LANCZOS);mid=Image.new('RGB',(1280,720))
    for x in range(0,1280,320):mid.paste(seg if (x//320)%2==0 else seg.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(x,0))
    scene=Image.blend(base,mid,.58);arr=np.array(scene).astype(np.float32);yy,xx=np.mgrid[:720,:1280]
    rad=np.sqrt(((xx-640)/820)**2+((yy-350)/560)**2);shade=np.clip(1.10-rad*.43,.54,1.0)[...,None];vert=(.70+.30*(yy/720))[...,None]
    arr=np.clip(arr*shade*vert,0,255).astype(np.uint8);Image.fromarray(arr).save(OUT/f'backdrop-{i+1:02}.webp','WEBP',quality=92,method=6)
print('Final hero/background cleanup complete.')
