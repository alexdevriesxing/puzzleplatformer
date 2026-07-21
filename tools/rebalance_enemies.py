from __future__ import annotations
import json, random
from pathlib import Path
from generate_campaign import replay_with_enemies, floor_cells

ROOT=Path(__file__).parents[1]
s=(ROOT/'src'/'room-data.js').read_text()
rooms=json.loads(s.split('=',1)[1].rsplit(';',1)[0])
CHAR={'#':'wall','.':'floor','~':'hazard','^':'spikes','i':'ice','>':'conveyorRight','<':'conveyorLeft','u':'conveyorUp','d':'conveyorDown','f':'fragile','a':'teleportA','b':'teleportB'}
ROSTERS=[
 ['scarab','crawler'], ['slime','crawler','scarab'], ['hopper','crawler'], ['turret','crawler','scarab'],
 ['drone','turret'], ['mimic','ghost','scarab'], ['ghost','drone','hopper'], ['slime','crawler','hopper'],
 ['turret','mimic','ghost','drone','hopper','slime','crawler','scarab'],
 ['turret','ghost','mimic','drone','hopper','slime','crawler','scarab']
]

def safe_candidates(level,reserved):
 g=level['grid']
 out=[]
 for p in floor_cells(g):
  if p in reserved:continue
  t=g[p[1]][p[0]]
  if t in ('wall','hazard','spikes','teleportA','teleportB','ice','fragile'):continue
  out.append(p)
 return out

counts={}
for room in rooms:
 chapter,stage=room['chapter'],room['stage']
 level={'grid':[[CHAR[c] for c in row] for row in room['map']], 'entities':[dict(e) for e in room['entities'] if e['kind']!='enemy']}
 target=0 if chapter==0 and stage<2 else min(4,1+(chapter+stage)//4)
 reserved={(e['x'],e['y']) for e in level['entities']}
 candidates=safe_candidates(level,reserved)
 rnd=random.Random(0xE11E + room['number']*8191)
 rnd.shuffle(candidates)
 roster=ROSTERS[chapter]
 desired=[roster[(stage+i)%len(roster)] for i in range(target)]
 for slot,typ in enumerate(desired):
  placed=False
  # Prefer roomy cells for turrets and corridors for walkers.
  ordered=candidates[:]
  if typ=='turret':
   ordered.sort(key=lambda p: -sum(level['grid'][p[1]+dy][p[0]+dx]!='wall' for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))))
  for p in ordered:
   if p in reserved:continue
   phases=range(3)
   dirs=(1,-1)
   for phase in phases:
    for direction in dirs:
     enemy={'kind':'enemy','type':typ,'x':p[0],'y':p[1],'dir':direction,'phase':phase}
     level['entities'].append(enemy)
     if replay_with_enemies(level,room['solution']):
      reserved.add(p);placed=True;break
     level['entities'].pop()
    if placed:break
   if placed:break
  if not placed:
   # Fallback through the chapter roster rather than dropping the slot.
   for alt in roster:
    if alt==typ:continue
    for p in candidates:
     if p in reserved:continue
     for phase in range(3):
      enemy={'kind':'enemy','type':alt,'x':p[0],'y':p[1],'dir':1 if slot%2==0 else -1,'phase':phase}
      level['entities'].append(enemy)
      if replay_with_enemies(level,room['solution']):reserved.add(p);placed=True;typ=alt;break
      level['entities'].pop()
     if placed:break
    if placed:break
  if placed:counts[typ]=counts.get(typ,0)+1
 room['entities']=level['entities']

out='// Generated once as explicit authored room data. Runtime never mutates this source.\nexport const ROOM_DATA = '+json.dumps(rooms,separators=(',',':'))+';\n'
(ROOT/'src'/'room-data.js').write_text(out)
print(counts)
