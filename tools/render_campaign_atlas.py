import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).parents[1]
s=(ROOT/'src'/'room-data.js').read_text(); rooms=json.loads(s.split('=',1)[1].rsplit(';',1)[0])
TW,TH=230,158; CELL=10; PAD=24
W,H=TW*5,TH*20
img=Image.new('RGB',(W,H),(8,11,28));d=ImageDraw.Draw(img)
try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',12)
 small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',9)
except: font=small=None
chapter_colors=['#ffd35a','#78f0a4','#8ff3ff','#ff9a4d','#b68cff','#ffcf91','#e5e6ff','#51e5d4','#ff6d7a','#fff27a']
tile={'#':'#17213d','.':'#344b78','~':'#d95b55','^':'#dce6f4','i':'#8fe8ff','>':'#f7a94e','<':'#f7a94e','u':'#f7a94e','d':'#f7a94e','f':'#c89a6d','a':'#60e6ff','b':'#d886ff'}
entity={'player':'#fff4cf','exit':'#78f0a4','shard':'#fff27a','key':'#ffd35a','door':'#b96f42','crate':'#d89a55','plate':'#f4dc72','gate':'#ff6d7a','enemy':'#ff6d7a'}
for i,r in enumerate(rooms):
 col=i%5;row=i//5;ox=col*TW;oy=row*TH;accent=chapter_colors[r['chapter']]
 d.rounded_rectangle((ox+5,oy+5,ox+TW-5,oy+TH-5),radius=12,fill='#10172f',outline=accent,width=2)
 d.text((ox+12,oy+10),f"{r['number']:03d}  {r['name']}",fill='#fff4cf',font=font)
 gx=ox+12;gy=oy+32
 for y,line in enumerate(r['map']):
  for x,ch in enumerate(line):
   d.rectangle((gx+x*CELL,gy+y*CELL,gx+(x+1)*CELL-1,gy+(y+1)*CELL-1),fill=tile.get(ch,'#344b78'))
 for e in r['entities']:
  x=gx+e['x']*CELL+CELL//2;y=gy+e['y']*CELL+CELL//2;rad=3 if e['kind']!='player' else 4
  d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=entity.get(e['kind'],'#fff'),outline='#080b18')
 d.text((ox+196,oy+36),f"O{r['optimalTurns']}",fill=accent,font=small)
 d.text((ox+196,oy+50),f"P{r['par']}",fill='#d9e9ff',font=small)
 f=', '.join(r['features'][:3]) or 'route'
 d.text((ox+12,oy+145),f,fill='#b8c5e8',font=small)
out=ROOT/'assets'/'campaign-atlas.webp';img.save(out,'WEBP',quality=88,method=6)
print(out, img.size)
