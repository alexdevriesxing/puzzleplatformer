from __future__ import annotations
import json, random, math, hashlib, collections, itertools, sys
from dataclasses import dataclass
from pathlib import Path

COLS, ROWS = 18, 11
DIRS = [(1,0,'R'),(-1,0,'L'),(0,1,'D'),(0,-1,'U')]
MOVE_CHAR = {(1,0):'R',(-1,0):'L',(0,1):'D',(0,-1):'U'}

CHAPTERS = [
    ('Brass Beginnings','gear'),('The Overgrown Wing','garden'),('Cold Calculations','ice'),('Trial by Fire','foundry'),
    ('Thunder in a Bottle','storm'),('The Whispering Stacks','library'),('One Small Pip','moon'),('Pressure Below','aquarium'),
    ("Null's Last Guard",'citadel'),('Heart of the Vault','prism')
]

STAGE_NAMES = [
  ['First Click', 'The Welcome Mat', 'Keynote', 'Weight of Things', 'Two-Step Trouble', 'The Long Way Round', 'Clever Corners', 'Tight Timing', 'The Brass Test', 'Foyer Finale'],
  ['Green Fingers', 'Pond Logic', 'Beetle Lane', 'Root Route', 'Mossy Business', 'A Slime in Time', 'Garden Circuit', 'Watermark', 'Thorny Thinking', 'Conservatory Crown'],
  ['Easy Does It', 'Slipstream', 'Cold Key', 'Crate on Ice', 'Hopper Frost', 'Blue Detour', 'Thin Ice', 'Crystal Crossing', 'Zero Friction', 'Glacier Crown'],
  ['Warm Welcome', 'Belt and Braces', 'Hot Key', 'Pressure Cooked', 'Line of Fire', 'Conveyor Caper', 'Molten Maze', 'Turret Tango', 'Redline', 'Foundry Crown'],
  ['Static Start', 'Twin Spark', 'Coil Key', 'Portal Pressure', 'Drone Zone', 'Split Decision', 'Arc Route', 'Thunder Run', 'Purple Haze', 'Laboratory Crown'],
  ['Quiet Please', 'Dog-Eared', 'Index Key', 'Heavy Reading', 'Mimicry', 'Ghost Writer', 'Fragile Fiction', 'Stacks on Stacks', 'Final Chapter', 'Library Crown'],
  ['Little Leap', 'Dark Side', 'Moon Key', 'Orbit Weight', 'Pale Pursuit', 'Vacuum Route', 'Ghost Crater', 'Star Bridge', 'Total Eclipse', 'Orrery Crown'],
  ['Deep Breath', 'Cross Current', 'Brass Keyfish', 'Pressure Plate', 'Reef Runner', 'High Tide', 'Bubble Route', 'Floodgate', 'Abyssal Logic', 'Aquarium Crown'],
  ['Front Gate', 'Guard Rotation', 'Black Key', 'Siege Weight', 'Elite Patrol', 'Crossfire', 'No Safe Corner', 'The Gauntlet', "Null's Doorstep", 'Citadel Crown'],
  ['The First Shard', 'Spectrum Shift', 'Heart Key', 'Perfect Balance', 'All Eyes Open', 'Prism Route', 'Tenfold Trial', 'The Last Lock', 'Baron Null', 'Light Returns'],
]

# ---------- topology generation ----------

def blank(fill='wall'):
    return [[fill for _ in range(COLS)] for _ in range(ROWS)]

def carve_maze(seed:int, loops:int=0, chambers:int=0):
    rnd=random.Random(seed)
    g=blank('wall')
    cw,ch=8,5
    visited={(rnd.randrange(cw),rnd.randrange(ch))}
    stack=[next(iter(visited))]
    def pos(c,r):return (1+2*c,1+2*r)
    sx,sy=pos(*stack[0]);g[sy][sx]='floor'
    while stack:
        c,r=stack[-1]
        ns=[]
        for dc,dr in [(1,0),(-1,0),(0,1),(0,-1)]:
            nc,nr=c+dc,r+dr
            if 0<=nc<cw and 0<=nr<ch and (nc,nr) not in visited:ns.append((nc,nr,dc,dr))
        if not ns:stack.pop();continue
        nc,nr,dc,dr=rnd.choice(ns);visited.add((nc,nr));stack.append((nc,nr))
        x,y=pos(c,r);nx,ny=pos(nc,nr)
        g[y][x]=g[(y+ny)//2][(x+nx)//2]=g[ny][nx]='floor'
    # braid selected walls between existing maze nodes
    edges=[]
    for r in range(ch):
      for c in range(cw):
        x,y=pos(c,r)
        for dc,dr in [(1,0),(0,1)]:
          nc,nr=c+dc,r+dr
          if nc<cw and nr<ch:
            nx,ny=pos(nc,nr);wx,wy=(x+nx)//2,(y+ny)//2
            if g[wy][wx]=='wall':edges.append((wx,wy))
    rnd.shuffle(edges)
    for x,y in edges[:loops]:g[y][x]='floor'
    # open asymmetrical chambers
    nodes=[pos(c,r) for r in range(ch) for c in range(cw)]
    rnd.shuffle(nodes)
    for cx,cy in nodes[:chambers]:
      radius=1 if rnd.random()<.75 else 2
      for y in range(max(1,cy-radius),min(ROWS-1,cy+radius+1)):
        for x in range(max(1,cx-radius),min(COLS-1,cx+radius+1)):
          if abs(x-cx)+abs(y-cy)<=radius+1:g[y][x]='floor'
    return g

def carve_stripes(seed:int):
    rnd=random.Random(seed);g=blank('floor')
    for x in range(COLS):g[0][x]=g[-1][x]='wall'
    for y in range(ROWS):g[y][0]=g[y][-1]='wall'
    horizontal=rnd.random()<.5
    if horizontal:
      for y in range(2,ROWS-1,2):
        gaps=sorted(rnd.sample(range(1,COLS-1),3))
        for x in range(1,COLS-1):g[y][x]='floor' if x in gaps else 'wall'
    else:
      for x in range(2,COLS-1,2):
        gaps=sorted(rnd.sample(range(1,ROWS-1),3))
        for y in range(1,ROWS-1):g[y][x]='floor' if y in gaps else 'wall'
    # add asymmetric blocks
    for _ in range(6):
      x=rnd.randrange(2,COLS-3);y=rnd.randrange(2,ROWS-3)
      if rnd.random()<.5:g[y][x]=g[y][x+1]='wall'
      else:g[y][x]=g[y+1][x]='wall'
    return g

def carve_rings(seed:int):
    rnd=random.Random(seed);g=blank('floor')
    for x in range(COLS):g[0][x]=g[-1][x]='wall'
    for y in range(ROWS):g[y][0]=g[y][-1]='wall'
    rings=[(2,2,COLS-3,ROWS-3),(4,3,COLS-5,ROWS-4)]
    for i,(x1,y1,x2,y2) in enumerate(rings):
      for x in range(x1,x2+1):g[y1][x]=g[y2][x]='wall'
      for y in range(y1,y2+1):g[y][x1]=g[y][x2]='wall'
      # four nonaligned gaps
      gaps=[(rnd.randrange(x1+1,x2),y1),(rnd.randrange(x1+1,x2),y2),(x1,rnd.randrange(y1+1,y2)),(x2,rnd.randrange(y1+1,y2))]
      for x,y in gaps:g[y][x]='floor'
    # center split
    if rnd.random()<.5:
      x=COLS//2
      for y in range(3,ROWS-3):g[y][x]='wall'
      for y in rnd.sample(range(3,ROWS-3),2):g[y][x]='floor'
    else:
      y=ROWS//2
      for x in range(4,COLS-4):g[y][x]='wall'
      for x in rnd.sample(range(4,COLS-4),2):g[y][x]='floor'
    return g

def carve_rooms(seed:int):
    rnd=random.Random(seed);g=blank('wall')
    rooms=[]
    attempts=0
    while len(rooms)<7 and attempts<100:
      attempts+=1;w=rnd.randrange(2,5);h=rnd.randrange(2,4);x=rnd.randrange(1,COLS-w-1);y=rnd.randrange(1,ROWS-h-1)
      rect=(x,y,w,h)
      if any(not (x+w+1<rx or rx+rw+1<x or y+h+1<ry or ry+rh+1<y) for rx,ry,rw,rh in rooms):continue
      rooms.append(rect)
      for yy in range(y,y+h):
        for xx in range(x,x+w):g[yy][xx]='floor'
    rooms.sort()
    centers=[]
    for x,y,w,h in rooms:centers.append((x+w//2,y+h//2))
    rnd.shuffle(centers)
    for (x1,y1),(x2,y2) in zip(centers,centers[1:]):
      if rnd.random()<.5:
        for x in range(min(x1,x2),max(x1,x2)+1):g[y1][x]='floor'
        for y in range(min(y1,y2),max(y1,y2)+1):g[y][x2]='floor'
      else:
        for y in range(min(y1,y2),max(y1,y2)+1):g[y][x1]='floor'
        for x in range(min(x1,x2),max(x1,x2)+1):g[y2][x]='floor'
    # ensure border walls
    for x in range(COLS):g[0][x]=g[-1][x]='wall'
    for y in range(ROWS):g[y][0]=g[y][-1]='wall'
    return g

def carve_spiral(seed:int):
    rnd=random.Random(seed);g=blank('floor')
    for x in range(COLS):g[0][x]=g[-1][x]='wall'
    for y in range(ROWS):g[y][0]=g[y][-1]='wall'
    x1,y1,x2,y2=2,2,COLS-3,ROWS-3
    gap_side=seed%4
    while x1<=x2 and y1<=y2:
      for x in range(x1,x2+1):g[y1][x]='wall'
      for y in range(y1,y2+1):g[y][x2]='wall'
      if y1<y2:
        for x in range(x1+1,x2+1):g[y2][x]='wall'
      if x1<x2:
        for y in range(y1+2,y2):g[y][x1]='wall'
      # gaps rotate
      if x1<x2-1:g[y1][rnd.randrange(x1+1,x2)]='floor'
      if y1<y2-1:g[rnd.randrange(y1+1,y2)][x2]='floor'
      if x1<x2-1:g[y2][rnd.randrange(x1+1,x2)]='floor'
      x1+=3;y1+=2;x2-=3;y2-=2
    return g

GENERATORS=[
 lambda s:carve_maze(s,0,0), lambda s:carve_maze(s,2,1), lambda s:carve_maze(s,4,2),
 carve_stripes, carve_rings, carve_rooms, carve_spiral,
 lambda s:carve_maze(s,6,3), lambda s:carve_rooms(s^0xabc), lambda s:carve_maze(s,8,4)
]

def floor_cells(g):return [(x,y) for y in range(1,ROWS-1) for x in range(1,COLS-1) if g[y][x]!='wall']
def neigh(g,p):
    x,y=p
    return [(x+dx,y+dy) for dx,dy,_ in DIRS if 0<=x+dx<COLS and 0<=y+dy<ROWS and g[y+dy][x+dx]!='wall']

def connected_component(g,start):
    q=collections.deque([start]);seen={start}
    while q:
      p=q.popleft()
      for n in neigh(g,p):
        if n not in seen:seen.add(n);q.append(n)
    return seen

def normalize_connected(g):
    cells=floor_cells(g)
    if not cells:return None
    comp=connected_component(g,cells[0])
    # keep largest component only
    comps=[comp];remaining=set(cells)-comp
    while remaining:
      s=next(iter(remaining));c=connected_component(g,s);comps.append(c);remaining-=c
    largest=max(comps,key=len)
    for x,y in cells:
      if (x,y) not in largest:g[y][x]='wall'
    return g if len(largest)>=45 else None

def distances(g,start,blocked=frozenset()):
    q=collections.deque([start]);d={start:0}
    while q:
      x,y=q.popleft()
      for dx,dy,_ in DIRS:
        n=(x+dx,y+dy)
        if n in d or n in blocked or not (0<n[0]<COLS-1 and 0<n[1]<ROWS-1) or g[n[1]][n[0]]=='wall':continue
        d[n]=d[(x,y)]+1;q.append(n)
    return d

def shortest_path(g,a,b,blocked=frozenset()):
    q=collections.deque([a]);prev={a:None}
    while q:
      p=q.popleft()
      if p==b:break
      for n in neigh(g,p):
        if n in blocked or n in prev:continue
        prev[n]=p;q.append(n)
    if b not in prev:return []
    out=[];p=b
    while p is not None:out.append(p);p=prev[p]
    return out[::-1]

def farthest_pair(g):
    cells=floor_cells(g);a=cells[0];d=distances(g,a);a=max(d,key=d.get);d=distances(g,a);b=max(d,key=d.get);return a,b,d[b]

def articulation_points(g):
    # Tarjan over floor graph
    nodes=floor_cells(g);adj={p:neigh(g,p) for p in nodes};timer=0;disc={};low={};parent={};arts=set()
    def dfs(u):
      nonlocal timer
      timer+=1;disc[u]=low[u]=timer;children=0
      for v in adj[u]:
        if v not in disc:
          parent[v]=u;children+=1;dfs(v);low[u]=min(low[u],low[v])
          if u not in parent and children>1:arts.add(u)
          if u in parent and low[v]>=disc[u]:arts.add(u)
        elif parent.get(u)!=v:low[u]=min(low[u],disc[v])
    for n in nodes:
      if n not in disc:dfs(n)
    return arts

def canonical_wall_signature(g):
    # consider all mirror transforms; keep lexical min to reject rotations/mirrors as duplicates
    interior=[[1 if g[y][x]=='wall' else 0 for x in range(1,COLS-1)] for y in range(1,ROWS-1)]
    mats=[]
    a=interior
    mats.append(a)
    mats.append([row[::-1] for row in a])
    mats.append(a[::-1])
    mats.append([row[::-1] for row in a[::-1]])
    return min(''.join(map(str,itertools.chain.from_iterable(m))) for m in mats)

def hamming(sig1,sig2):return sum(a!=b for a,b in zip(sig1,sig2))/len(sig1)

# ---------- mechanics / solver ----------

def entity_map(entities, kind=None):
    return {(e['x'],e['y']):e for e in entities if kind is None or e['kind']==kind}

def encode_state(s):
    return (s['p'],tuple(sorted(s['crates'])),s['door_open'],s['shards'],s['key_collected'],s['keys'],s['broken'])

def solve(level,max_states=240000):
    g=level['grid'];ents=level['entities']
    p0=next((e['x'],e['y']) for e in ents if e['kind']=='player')
    shards=[(e['x'],e['y']) for e in ents if e['kind']=='shard'];shard_index={p:i for i,p in enumerate(shards)}
    keypos=next(((e['x'],e['y']) for e in ents if e['kind']=='key'),None)
    doorpos=next(((e['x'],e['y']) for e in ents if e['kind']=='door'),None)
    platepos=next(((e['x'],e['y']) for e in ents if e['kind']=='plate'),None)
    gatepos=next(((e['x'],e['y']) for e in ents if e['kind']=='gate'),None)
    exitpos=next((e['x'],e['y']) for e in ents if e['kind']=='exit')
    crates0=frozenset((e['x'],e['y']) for e in ents if e['kind']=='crate')
    fragiles=[(x,y) for y,row in enumerate(g) for x,t in enumerate(row) if t=='fragile'];frag_idx={p:i for i,p in enumerate(fragiles)}
    tpA=next(((x,y) for y,row in enumerate(g) for x,t in enumerate(row) if t=='teleportA'),None)
    tpB=next(((x,y) for y,row in enumerate(g) for x,t in enumerate(row) if t=='teleportB'),None)
    fullmask=(1<<len(shards))-1
    start={'p':p0,'crates':crates0,'door_open':doorpos is None,'shards':0,'key_collected':keypos is None,'keys':0,'broken':0}
    if p0 in shard_index:start['shards']|=1<<shard_index[p0]
    if keypos==p0:start['keys']=1;start['key_collected']=True
    def tile(p):return g[p[1]][p[0]]
    def gate_open(st):return platepos is not None and (platepos==st['p'] or platepos in st['crates'])
    def blocked(st,p,ignore_crate=None):
      x,y=p
      if not (0<x<COLS-1 and 0<y<ROWS-1):return True
      if tile(p)=='wall':return True
      if p in frag_idx and st['broken']&(1<<frag_idx[p]):return True
      if gatepos==p and not gate_open(st):return True
      if doorpos==p and not st['door_open']:return True
      if p in st['crates'] and p!=ignore_crate:return True
      return False
    def collect(st):
      p=st['p'];ns=dict(st)
      if p in shard_index:ns['shards']|=1<<shard_index[p]
      if keypos==p and not ns['key_collected']:
        ns['key_collected']=True;ns['keys']+=1
      return ns
    def leave_fragile(st,p):
      if p in frag_idx:
        ns=dict(st);ns['broken']|=1<<frag_idx[p];return ns
      return st
    def auto_resolve(st,dx,dy,depth=0):
      if depth>24:return None
      p=st['p'];kind=tile(p)
      if kind in ('hazard','spikes'):return None
      if kind in ('teleportA','teleportB'):
        target=tpB if kind=='teleportA' else tpA
        if target and not blocked(st,target):
          st=leave_fragile(st,p);st=dict(st);st['p']=target;st=collect(st)
          # do not bounce immediately; continue target tile behavior only if not teleport
          if tile(target) not in ('teleportA','teleportB'):
            return auto_resolve(st,dx,dy,depth+1)
        return st
      auto=None
      if kind=='ice':auto=(dx,dy)
      elif kind=='conveyorRight':auto=(1,0)
      elif kind=='conveyorLeft':auto=(-1,0)
      elif kind=='conveyorUp':auto=(0,-1)
      elif kind=='conveyorDown':auto=(0,1)
      if auto and auto!=(0,0):
        nx=(p[0]+auto[0],p[1]+auto[1])
        if not blocked(st,nx):
          st=leave_fragile(st,p);st=dict(st);st['p']=nx;st=collect(st)
          return auto_resolve(st,*auto,depth+1)
      return st
    def step(st,dx,dy):
      p=st['p'];n=(p[0]+dx,p[1]+dy);ns=dict(st)
      if not (0<n[0]<COLS-1 and 0<n[1]<ROWS-1) or tile(n)=='wall':return None
      if n in frag_idx and ns['broken']&(1<<frag_idx[n]):return None
      if gatepos==n and not gate_open(ns):return None
      if doorpos==n and not ns['door_open']:
        if ns['keys']<=0:return None
        ns['keys']-=1;ns['door_open']=True
      if n in ns['crates']:
        b=(n[0]+dx,n[1]+dy)
        if blocked(ns,b,ignore_crate=n) or b in shards or b==keypos or b==exitpos or b==gatepos or b==doorpos:return None
        crates=set(ns['crates']);crates.remove(n);crates.add(b);ns['crates']=frozenset(crates)
      ns=leave_fragile(ns,p);ns=dict(ns);ns['p']=n;ns=collect(ns)
      ns=auto_resolve(ns,dx,dy)
      if ns is None:return None
      if tile(ns['p']) in ('hazard','spikes'):return None
      return ns
    q=collections.deque([start]);prev={encode_state(start):(None,None)};states={encode_state(start):start}
    goalkey=None
    while q:
      st=q.popleft();k=encode_state(st)
      if st['p']==exitpos and st['shards']==fullmask:
        goalkey=k;break
      if len(prev)>max_states:return None,len(prev)
      for dx,dy,ch in DIRS:
        ns=step(st,dx,dy)
        if ns is None:continue
        nk=encode_state(ns)
        if nk not in prev:
          prev[nk]=(k,ch);states[nk]=ns;q.append(ns)
    if goalkey is None:return None,len(prev)
    moves=[];k=goalkey
    while prev[k][0] is not None:
      pk,ch=prev[k];moves.append(ch);k=pk
    return ''.join(reversed(moves)),len(prev)

# ---------- level assembly ----------

def choose_points(g,rnd,chapter,stage):
    cells=floor_cells(g);deg={p:len(neigh(g,p)) for p in cells}
    starts=[p for p in cells if deg[p]<=2] or cells
    a=rnd.choice(starts)
    d=distances(g,a);maxd=max(d.values())
    # Tutorial rooms use a compact subset of the topology; later rooms stretch across it.
    q=min(.92,.34+stage*.055+chapter*.035)
    target=max(5,round(maxd*q))
    exits=[p for p,v in d.items() if p!=a and abs(v-target)<=2]
    b=rnd.choice(exits or [max(d,key=d.get)])
    candidates=[p for p in cells if p not in (a,b) and 3<=d.get(p,0)<=max(target+5,8)]
    chosen=[]
    for _ in range(3):
      best=None;score=-1
      for p in candidates:
        if p in chosen:continue
        ds=[distances(g,q0).get(p,0) for q0 in [a,b]+chosen]
        # Early rooms prefer readable nearby branches; later rooms prefer deep dead ends.
        dead_bonus=(1+chapter*.18+stage*.1) if deg[p]==1 else 0
        range_penalty=max(0,d[p]-(target+2))*.8
        score0=min(ds)+dead_bonus-range_penalty+rnd.random()*.2
        if score0>score:score=score0;best=p
      if best is None:return None
      chosen.append(best)
    return a,b,chosen,maxd

def component_without(g,cut,start):
    return connected_component(g,start) if cut is None else _component_blocked(g,start,{cut})
def _component_blocked(g,start,blocked):
    q=collections.deque([start]);seen={start}
    while q:
      x,y=q.popleft()
      for dx,dy,_ in DIRS:
        n=(x+dx,y+dy)
        if n in blocked or n in seen or not (0<n[0]<COLS-1 and 0<n[1]<ROWS-1) or g[n[1]][n[0]]=='wall':continue
        seen.add(n);q.append(n)
    return seen

def choose_articulation(g,start,targets,rnd,min_start=8,min_far=8,exclude=set()):
    arts=list(articulation_points(g)-set(exclude));rnd.shuffle(arts)
    scored=[]
    for a in arts:
      c=_component_blocked(g,start,{a});far=[t for t in targets if t not in c and t!=a]
      if len(c)>=min_start and far:
        other=len(floor_cells(g))-len(c)-1
        if other>=min_far:scored.append((min(len(c),other)+rnd.random(),a,c))
    if not scored:return None,None
    _,a,c=max(scored);return a,c

def carve_push_alcove(g,allowed,rnd,occupied):
    options=[]
    for p in list(allowed):
      x,y=p
      for dx,dy,_ in DIRS:
        line=[(x-dx,y-dy),(x,y),(x+dx,y+dy)] # approach, crate, plate
        if all(0<px<COLS-1 and 0<py<ROWS-1 for px,py in line) and all(q not in occupied for q in line):
          options.append((line,dx,dy))
    rnd.shuffle(options)
    for line,dx,dy in options:
      for x,y in line:g[y][x]='floor'
      # ensure approach can connect to allowed area
      if any(n in allowed for n in neigh(g,line[0])) or line[0] in allowed:
        return line[1],line[2],line[0]
    return None

def straight_segments(g,min_len=3):
    out=[]
    for y in range(1,ROWS-1):
      run=[]
      for x in range(1,COLS):
        if x<COLS-1 and g[y][x]!='wall':run.append((x,y))
        else:
          if len(run)>=min_len:out.append(run[:])
          run=[]
    for x in range(1,COLS-1):
      run=[]
      for y in range(1,ROWS):
        if y<ROWS-1 and g[y][x]!='wall':run.append((x,y))
        else:
          if len(run)>=min_len:out.append(run[:])
          run=[]
    return out

def add_mechanics(g,entities,chapter,stage,rnd,start,exitp,shards):
    features=[];occupied={(e['x'],e['y']) for e in entities};targets=shards+[exitp]
    # doors from chapter 1 onward, selectively in later combination worlds
    need_key = chapter==1 or (chapter>=8 and stage in (0,2,5,7,8,9)) or (chapter==9 and stage>=2)
    need_gate = chapter==2 or chapter==7 or (chapter>=8 and stage in (1,3,5,6,8,9))
    need_tp = chapter==4 or chapter==6 or (chapter>=8 and stage in (4,6,7,8,9))
    # place gate deeper first, then door earlier
    cuts=[]
    if need_gate:
      gate,comp=choose_articulation(g,start,targets,rnd,8,8,occupied)
      if gate:
        entities.append({'kind':'gate','x':gate[0],'y':gate[1]});occupied.add(gate);cuts.append(gate)
        push=carve_push_alcove(g,comp,rnd,occupied)
        if push:
          crate,plate,approach=push
          entities.append({'kind':'crate','x':crate[0],'y':crate[1]});entities.append({'kind':'plate','x':plate[0],'y':plate[1]});occupied|={crate,plate};features+=['crate','gate']
        else:
          entities.pop();occupied.remove(gate)
    if need_key:
      door,comp=choose_articulation(g,start,targets,rnd,6,8,occupied|set(cuts))
      if door:
        candidates=[p for p in comp if p not in occupied and len(neigh(g,p))<=2 and distances(g,start).get(p,0)>=3]
        if candidates:
          key=max(candidates,key=lambda p:distances(g,start).get(p,0)+rnd.random())
          entities.append({'kind':'door','x':door[0],'y':door[1]});entities.append({'kind':'key','x':key[0],'y':key[1]});occupied|={door,key};features.append('key')
    # Teleporter replaces an articulation bridge. Skip occupied / entities.
    if need_tp:
      cut,comp=choose_articulation(g,start,targets,rnd,8,8,occupied|set(cuts))
      if cut:
        ns=neigh(g,cut)
        if len(ns)>=2:
          side1=[n for n in ns if n in comp];side2=[n for n in ns if n not in comp]
          if side1 and side2:
            a=rnd.choice(side1);b=rnd.choice(side2)
            g[cut[1]][cut[0]]='wall';g[a[1]][a[0]]='teleportA';g[b[1]][b[0]]='teleportB';features.append('teleport');occupied|={a,b,cut}
    # themed motion tiles
    segs=[s for s in straight_segments(g,4) if not any(p in occupied for p in s)]
    rnd.shuffle(segs)
    if chapter==2 or (chapter>=8 and stage%3==0):
      for seg in segs[:1]:
        core=seg[1:-1][:min(5,len(seg)-2)]
        for x,y in core:g[y][x]='ice'
        if core:features.append('ice')
    if chapter in (3,7) or (chapter>=8 and stage%3==1):
      if segs:
        seg=segs[0];core=seg[1:-1][:min(5,len(seg)-2)]
        horizontal=len({y for x,y in seg})==1
        kind=('conveyorRight' if horizontal else 'conveyorDown')
        if rnd.random()<.5:kind=('conveyorLeft' if horizontal else 'conveyorUp')
        for x,y in core:g[y][x]=kind
        if core:features.append('conveyor')
    if chapter==5 or (chapter>=8 and stage%3==2):
      # fragile bridge on a non-start articulation corridor
      art,comp=choose_articulation(g,start,targets,rnd,7,7,occupied)
      if art:
        g[art[1]][art[0]]='fragile';features.append('fragile')
    # hazards are placed in open chambers, never on critical entities.
    hazard_count=max(0,chapter-1)+(stage//4)
    if chapter==0:hazard_count=max(0,stage-5)
    candidates=[p for p in floor_cells(g) if p not in occupied and p not in (start,exitp) and p not in shards and len(neigh(g,p))>=3]
    rnd.shuffle(candidates)
    kind='hazard' if chapter in (1,3,6,7,8,9) else 'spikes'
    for p in candidates[:min(hazard_count,8)]:g[p[1]][p[0]]=kind
    if candidates[:min(hazard_count,8)]:features.append(kind)
    return features

def intended_enemy_types(chapter):
    return [
      ['scarab','crawler','turret','mimic','slime'],
      ['scarab','slime','crawler','mimic','ghost'],
      ['hopper','crawler','turret','mimic','ghost'],
      ['scarab','turret','crawler','mimic','drone'],
      ['drone','turret','ghost','mimic','slime'],
      ['mimic','ghost','scarab','turret','slime'],
      ['ghost','drone','hopper','turret','mimic'],
      ['crawler','slime','hopper','turret','mimic'],
      ['scarab','crawler','slime','hopper','turret','ghost','mimic','drone'],
      ['scarab','crawler','slime','hopper','turret','ghost','mimic','drone']
    ][chapter]

def replay_with_enemies(level,solution):
    # lightweight simulation aligned with runtime rules, enough to prove stored route safe.
    g=[r[:] for r in level['grid']];ents=[dict(e) for e in level['entities']]
    player=next(e for e in ents if e['kind']=='player');keys=0;turns=0
    tpA=next(((x,y) for y,row in enumerate(g) for x,t in enumerate(row) if t=='teleportA'),None)
    tpB=next(((x,y) for y,row in enumerate(g) for x,t in enumerate(row) if t=='teleportB'),None)
    def at(x,y,kind=None):return next((e for e in ents if e['x']==x and e['y']==y and (kind is None or e['kind']==kind)),None)
    def allat(x,y):return [e for e in ents if e['x']==x and e['y']==y]
    def gate_open():
      plates=[e for e in ents if e['kind']=='plate']
      return any(any(o['kind'] in ('crate','player') and o['x']==p['x'] and o['y']==p['y'] for o in ents) for p in plates)
    def blocked(x,y,e=None,ghost=False):
      if not (0<x<COLS-1 and 0<y<ROWS-1):return True
      if not ghost and g[y][x] in ('wall','broken'):return True
      for o in allat(x,y):
        if o is e:continue
        if o['kind'] in ('door','crate'):return True
        if o['kind']=='gate' and not gate_open():return True
        if o['kind']=='enemy' and e and e.get('kind')=='enemy':return True
      return False
    def move_obj(e,x,y):e['x']=x;e['y']=y
    def collect():
      nonlocal keys
      for e in list(allat(player['x'],player['y'])):
        if e['kind']=='shard':ents.remove(e)
        elif e['kind']=='key':ents.remove(e);keys+=1
    def resolve(dx,dy,depth=0):
      if depth>24:return True
      kind=g[player['y']][player['x']]
      if kind in ('hazard','spikes','broken'):return False
      if kind in ('teleportA','teleportB'):
        target=tpB if kind=='teleportA' else tpA
        if target and not blocked(*target,player):move_obj(player,*target);collect()
        return g[player['y']][player['x']] not in ('hazard','spikes','broken')
      auto=None
      if kind=='ice':auto=(dx,dy)
      elif kind=='conveyorRight':auto=(1,0)
      elif kind=='conveyorLeft':auto=(-1,0)
      elif kind=='conveyorUp':auto=(0,-1)
      elif kind=='conveyorDown':auto=(0,1)
      if auto:
        nx,ny=player['x']+auto[0],player['y']+auto[1]
        if not blocked(nx,ny,player) and not at(nx,ny,'enemy') and not at(nx,ny,'crate'):
          ox,oy=player['x'],player['y'];move_obj(player,nx,ny)
          if g[oy][ox]=='fragile':g[oy][ox]='broken'
          collect();return resolve(*auto,depth+1)
      return True
    def enemy_can(e,x,y,ghost=False):
      if blocked(x,y,e,ghost):return False
      return not any(o is not e and o['kind'] in ('enemy','crate','door') for o in allat(x,y))
    def chase(e,ghost=False):
      dx=(player['x']>e['x'])-(player['x']<e['x']);dy=(player['y']>e['y'])-(player['y']<e['y'])
      opts=[(dx,0),(0,dy)] if abs(player['x']-e['x'])>=abs(player['y']-e['y']) else [(0,dy),(dx,0)]
      for mx,my in opts:
        if (mx or my) and enemy_can(e,e['x']+mx,e['y']+my,ghost):move_obj(e,e['x']+mx,e['y']+my);return
    def clear_line(x1,y1,x2,y2):
      dx=(x2>x1)-(x2<x1);dy=(y2>y1)-(y2<y1);x,y=x1+dx,y1+dy
      while (x,y)!=(x2,y2):
        if g[y][x] in ('wall','broken') or any(e['kind'] in ('crate','door') or (e['kind']=='gate' and not gate_open()) for e in allat(x,y)):return False
        x+=dx;y+=dy
      return True
    for ch in solution:
      dx,dy={'R':(1,0),'L':(-1,0),'D':(0,1),'U':(0,-1)}[ch]
      ox,oy=player['x'],player['y'];nx,ny=ox+dx,oy+dy
      if g[ny][nx] in ('wall','broken'):return False
      gate=at(nx,ny,'gate')
      if gate and not gate_open():return False
      door=at(nx,ny,'door')
      if door:
        if keys<=0:return False
        keys-=1;ents.remove(door)
      crate=at(nx,ny,'crate')
      if crate:
        bx,by=nx+dx,ny+dy
        if blocked(bx,by,crate) or any(e['kind'] in ('shard','key','exit','gate','door','enemy','crate') for e in allat(bx,by)):return False
        move_obj(crate,bx,by)
      if at(nx,ny,'enemy'):return False
      move_obj(player,nx,ny)
      if g[oy][ox]=='fragile':g[oy][ox]='broken'
      collect()
      if not resolve(dx,dy):return False
      # enemies
      turn=turns+1
      for e in [e for e in ents if e['kind']=='enemy']:
        typ=e['type']
        if typ=='turret':continue
        if typ=='scarab':
          nx=e['x']+e.get('dir',1)
          if not enemy_can(e,nx,e['y']):e['dir']=-e.get('dir',1);nx=e['x']+e['dir']
          if enemy_can(e,nx,e['y']):move_obj(e,nx,e['y'])
        elif typ=='crawler':
          ny=e['y']+e.get('dir',1)
          if not enemy_can(e,e['x'],ny):e['dir']=-e.get('dir',1);ny=e['y']+e['dir']
          if enemy_can(e,e['x'],ny):move_obj(e,e['x'],ny)
        elif typ=='slime':
          if (turn+e.get('phase',0))%2==0:chase(e)
        elif typ=='hopper':
          if (turn+e.get('phase',0))%2==0:
            for _ in range(2):
              nx=e['x']+e.get('dir',1)
              if not enemy_can(e,nx,e['y']):e['dir']=-e.get('dir',1);nx=e['x']+e['dir']
              if enemy_can(e,nx,e['y']):move_obj(e,nx,e['y'])
        elif typ=='ghost':
          if (turn+e.get('phase',0))%2==0:chase(e,True)
        elif typ=='mimic':
          if abs(e['x']-player['x'])+abs(e['y']-player['y'])<=5:chase(e)
        elif typ=='drone':
          dirs=[(1,0),(0,1),(-1,0),(0,-1)];d=(e.get('phase',0)+turn)%4
          for i in range(4):
            mx,my=dirs[(d+i)%4]
            if enemy_can(e,e['x']+mx,e['y']+my):move_obj(e,e['x']+mx,e['y']+my);e['phase']=(d+i)%4;break
        if (e['x'],e['y'])==(player['x'],player['y']):return False
      turns+=1
      for e in [e for e in ents if e['kind']=='enemy' and e['type']=='turret']:
        if (turns+e.get('phase',0))%3!=0:continue
        if e['x']==player['x'] and clear_line(e['x'],e['y'],player['x'],player['y']):return False
        if e['y']==player['y'] and clear_line(e['x'],e['y'],player['x'],player['y']):return False
      if g[player['y']][player['x']] in ('hazard','spikes','broken'):return False
    return not any(e['kind']=='shard' for e in ents) and at(player['x'],player['y'],'exit') is not None

def add_safe_enemies(level,solution,chapter,stage,rnd):
    if chapter==0 and stage<2:return
    target=min(4, (stage+chapter)//3)
    if target<=0:return
    pool=list(intended_enemy_types(chapter)); rnd.shuffle(pool)
    base=[dict(e) for e in level['entities']]
    reserved={(e['x'],e['y']) for e in base}
    candidates=[p for p in floor_cells(level['grid']) if p not in reserved and level['grid'][p[1]][p[0]] not in ('hazard','spikes','teleportA','teleportB','ice')]
    rnd.shuffle(candidates)
    added=0
    for p in candidates:
      if added>=target:break
      for typ in pool:
        for phase in range(3):
          for direction in (1,-1):
            enemy={'kind':'enemy','type':typ,'x':p[0],'y':p[1],'dir':direction,'phase':phase}
            level['entities'].append(enemy)
            if replay_with_enemies(level,solution):
              added+=1;reserved.add(p);break
            level['entities'].pop()
          if added and level['entities'][-1].get('x')==p[0] and level['entities'][-1].get('y')==p[1]:break
        if added and level['entities'][-1].get('x')==p[0] and level['entities'][-1].get('y')==p[1]:break
      if len(level['entities'])>len(base)+added:
        raise RuntimeError('enemy append accounting')

def design_note(chapter,stage,features):
    lead=[
      'Route reading through asymmetrical chambers', 'A split loop with competing Spark branches', 'A lock placed on the room’s central articulation',
      'A persistent pressure solution controlling the far wing', 'Timing around a moving patrol lane', 'A long-form route with a deceptive shortcut',
      'Three-way navigation with a forced return decision', 'A commitment puzzle built around irreversible terrain',
      'A dense synthesis room with intersecting dependencies', 'A chapter exam combining every learned rule'
    ][stage]
    if features:return lead+'; focus: '+', '.join(features)+'.'
    return lead+'.'

def build_candidate(index,attempt):
    chapter=index//10;stage=index%10;seed=0x51A7E + index*10007 + attempt*7919
    gen=GENERATORS[(index*3+chapter+attempt)%len(GENERATORS)]
    g=normalize_connected(gen(seed))
    if g is None:return None
    rnd=random.Random(seed^0xBEEF)
    picked=choose_points(g,rnd,chapter,stage)
    if not picked:return None
    start,exitp,shards,diam=picked
    if diam<14:return None
    entities=[{'kind':'player','x':start[0],'y':start[1]},{'kind':'exit','x':exitp[0],'y':exitp[1]}]
    for i,p in enumerate(shards):entities.append({'kind':'shard','x':p[0],'y':p[1],'variant':(i+chapter)%3})
    features=add_mechanics(g,entities,chapter,stage,rnd,start,exitp,shards)
    level={'index':index,'number':index+1,'chapter':chapter,'stage':stage,'name':STAGE_NAMES[chapter][stage],
           'grid':g,'entities':entities,'features':features}
    required={0:set(),1:{'key'},2:{'crate','gate','ice'},3:{'conveyor'},4:{'teleport'},5:{'fragile'},6:{'teleport'},7:{'crate','gate','conveyor'},8:set(),9:set()}[chapter]
    if stage==0 and chapter in (4,5,6): required=set()  # one readable introduction before the signature rule is forced
    if not required.issubset(set(features)):return None
    solution,states=solve(level)
    if not solution:return None
    # Enforce an authored difficulty envelope instead of accepting arbitrary maze length.
    min_len=10+chapter*2+stage*2
    max_len=26+chapter*7+stage*4
    if not (min_len<=len(solution)<=max_len):return None
    level['solution']=solution;level['optimalTurns']=len(solution);level['par']=max(len(solution),round(len(solution)*1.08))
    level['complexity']=states;level['designNote']=design_note(chapter,stage,features)
    add_safe_enemies(level,solution,chapter,stage,rnd)
    if not replay_with_enemies(level,solution):return None
    return level

def generate_all():
    levels=[];sigs=[]
    for i in range(100):
      accepted=None
      for attempt in range(1200):
        level=build_candidate(i,attempt)
        if not level:continue
        sig=canonical_wall_signature(level['grid'])
        # No exact/mirrored duplicate, and no near duplicate. Tutorial gets a slightly looser threshold.
        threshold=.12 if i<10 else .16
        if any(hamming(sig,s)<threshold for s in sigs):continue
        accepted=level;sigs.append(sig);break
      if not accepted:
        raise RuntimeError(f'failed level {i+1}')
      levels.append(accepted)
      print(f"{i+1:03d} {accepted['name']:<24} opt={accepted['optimalTurns']:<3} states={accepted['complexity']:<6} features={','.join(accepted['features'])}")
    return levels,sigs

def ascii_grid(level):
    # compact runtime grid rows, not human map symbols; entities remain separate.
    code={'wall':'#','floor':'.','hazard':'~','spikes':'^','ice':'i','conveyorRight':'>','conveyorLeft':'<','conveyorUp':'u','conveyorDown':'d','fragile':'f','teleportA':'a','teleportB':'b'}
    return [''.join(code[t] for t in row) for row in level['grid']]

def write_js(levels,out):
    compact=[]
    for l in levels:
      compact.append({k:l[k] for k in ('number','chapter','stage','name','par','optimalTurns','complexity','features','designNote','solution')})
      compact[-1]['map']=ascii_grid(l)
      compact[-1]['entities']=l['entities']
    text='// Generated once as explicit authored room data. Runtime never mutates this source.\nexport const ROOM_DATA = '+json.dumps(compact,separators=(',',':'))+';\n'
    Path(out).write_text(text)

if __name__=='__main__':
    levels,sigs=generate_all()
    out=Path(__file__).parents[1]/'src'/'room-data.js'
    write_js(levels,out)
    metrics={
      'rooms':len(levels),
      'uniqueWallTopologies':len(set(sigs)),
      'minPairwiseWallDistance':min(hamming(a,b) for i,a in enumerate(sigs) for b in sigs[i+1:]),
      'optimalTurns':{'min':min(l['optimalTurns'] for l in levels),'max':max(l['optimalTurns'] for l in levels),'avg':sum(l['optimalTurns'] for l in levels)/len(levels)},
      'solverStates':{'min':min(l['complexity'] for l in levels),'max':max(l['complexity'] for l in levels),'avg':sum(l['complexity'] for l in levels)/len(levels)}
    }
    (Path(__file__).parents[1]/'docs'/'CAMPAIGN_METRICS.json').write_text(json.dumps(metrics,indent=2))
    print(json.dumps(metrics,indent=2))
