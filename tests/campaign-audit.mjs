import assert from 'node:assert/strict';
import { buildLevel, COLS, ROWS, LEVELS, CHAPTERS } from '../src/levels.js';

const DIRS = [[1,0,'R'],[-1,0,'L'],[0,1,'D'],[0,-1,'U']];
const MOVE = {R:[1,0],L:[-1,0],D:[0,1],U:[0,-1]};
const clone = value => JSON.parse(JSON.stringify(value));
const posKey = (x,y) => `${x},${y}`;

function canonicalWallSignature(level) {
  const rows = level.grid.slice(1,-1).map(row => row.slice(1,-1).map(tile => tile === 'wall' ? '1' : '0').join(''));
  const variants = [
    rows,
    rows.map(row => [...row].reverse().join('')),
    [...rows].reverse(),
    [...rows].reverse().map(row => [...row].reverse().join('')),
  ];
  return variants.map(v => v.join('')).sort()[0];
}

function hamming(a,b) {
  let different = 0;
  for (let i=0;i<a.length;i++) if (a[i] !== b[i]) different++;
  return different / a.length;
}

function criticalSignature(level) {
  const rows = level.grid.map(row => row.map(tile => tile === 'wall' ? '#' : tile === 'floor' ? '.' : tile[0]));
  const code = {player:'P',exit:'E',shard:'S',key:'K',door:'D',crate:'C',plate:'O',gate:'G',enemy:'X'};
  for (const e of level.entities) rows[e.y][e.x] = code[e.kind] ?? '?';
  return rows.map(row => row.join('')).join('\n');
}

function puzzleModel(level) {
  const shards = level.entities.filter(e => e.kind === 'shard').map(e => [e.x,e.y]);
  return {
    grid: level.grid,
    start: level.entities.find(e => e.kind === 'player'),
    exit: level.entities.find(e => e.kind === 'exit'),
    shards,
    shardIndex: new Map(shards.map((p,i) => [posKey(...p), i])),
    key: level.entities.find(e => e.kind === 'key') ?? null,
    door: level.entities.find(e => e.kind === 'door') ?? null,
    plate: level.entities.find(e => e.kind === 'plate') ?? null,
    gate: level.entities.find(e => e.kind === 'gate') ?? null,
    crates: level.entities.filter(e => e.kind === 'crate').map(e => [e.x,e.y]),
    fragiles: level.grid.flatMap((row,y) => row.map((tile,x) => tile === 'fragile' ? [x,y] : null).filter(Boolean)),
    teleportA: findTile(level.grid,'teleportA'),
    teleportB: findTile(level.grid,'teleportB'),
  };
}

function findTile(grid, kind) {
  for (let y=0;y<grid.length;y++) for (let x=0;x<grid[y].length;x++) if (grid[y][x] === kind) return [x,y];
  return null;
}

function solvePuzzle(level, maxStates = 160000) {
  const m = puzzleModel(level);
  const fragileIndex = new Map(m.fragiles.map((p,i) => [posKey(...p),i]));
  const fullMask = (1 << m.shards.length) - 1;
  const start = {
    p:[m.start.x,m.start.y], crates:m.crates.map(p => [...p]), doorOpen:!m.door,
    shards:0, keyCollected:!m.key, keys:0, broken:0,
  };
  collect(start,m);
  const encode = s => `${s.p.join(',')}|${s.crates.map(p=>p.join(',')).sort().join(';')}|${s.doorOpen?1:0}|${s.shards}|${s.keyCollected?1:0}|${s.keys}|${s.broken}`;
  const gateOpen = s => !!m.plate && (same(s.p,[m.plate.x,m.plate.y]) || s.crates.some(c => same(c,[m.plate.x,m.plate.y])));
  const brokenAt = (s,p) => fragileIndex.has(posKey(...p)) && (s.broken & (1 << fragileIndex.get(posKey(...p))));
  const blocked = (s,p,ignoreCrate=null) => {
    const [x,y]=p;
    if (x<=0||y<=0||x>=COLS-1||y>=ROWS-1||m.grid[y][x]==='wall'||brokenAt(s,p)) return true;
    if (m.gate && same(p,[m.gate.x,m.gate.y]) && !gateOpen(s)) return true;
    if (m.door && same(p,[m.door.x,m.door.y]) && !s.doorOpen) return true;
    return s.crates.some(c => same(c,p) && (!ignoreCrate || !same(c,ignoreCrate)));
  };
  const leave = (s,p) => {
    const i=fragileIndex.get(posKey(...p));
    if (i == null) return s;
    return {...s,broken:s.broken | (1 << i)};
  };
  const autoResolve = (state,dx,dy,depth=0) => {
    if (depth>24) return null;
    let s=state; const [x,y]=s.p; const kind=m.grid[y][x];
    if (kind==='hazard'||kind==='spikes') return null;
    if (kind==='teleportA'||kind==='teleportB') {
      const target=kind==='teleportA'?m.teleportB:m.teleportA;
      if (target && !blocked(s,target)) {
        s=leave(s,s.p); s={...s,p:[...target]}; collect(s,m);
      }
      return s;
    }
    let auto=null;
    if (kind==='ice') auto=[dx,dy];
    if (kind==='conveyorRight') auto=[1,0];
    if (kind==='conveyorLeft') auto=[-1,0];
    if (kind==='conveyorUp') auto=[0,-1];
    if (kind==='conveyorDown') auto=[0,1];
    if (auto && (auto[0]||auto[1])) {
      const next=[x+auto[0],y+auto[1]];
      if (!blocked(s,next)) {
        s=leave(s,s.p); s={...s,p:next}; collect(s,m);
        return autoResolve(s,auto[0],auto[1],depth+1);
      }
    }
    return s;
  };
  const step = (state,dx,dy) => {
    let s={...state,p:[...state.p],crates:state.crates.map(p=>[...p])};
    const next=[s.p[0]+dx,s.p[1]+dy];
    if (next[0]<=0||next[1]<=0||next[0]>=COLS-1||next[1]>=ROWS-1||m.grid[next[1]][next[0]]==='wall'||brokenAt(s,next)) return null;
    if (m.gate && same(next,[m.gate.x,m.gate.y]) && !gateOpen(s)) return null;
    if (m.door && same(next,[m.door.x,m.door.y]) && !s.doorOpen) {
      if (s.keys<=0) return null;
      s.keys--; s.doorOpen=true;
    }
    const crateIndex=s.crates.findIndex(c=>same(c,next));
    if (crateIndex>=0) {
      const beyond=[next[0]+dx,next[1]+dy];
      if (blocked(s,beyond,next)) return null;
      if (m.shards.some(p=>same(p,beyond)) || (m.key&&same(beyond,[m.key.x,m.key.y])) || same(beyond,[m.exit.x,m.exit.y]) || (m.gate&&same(beyond,[m.gate.x,m.gate.y])) || (m.door&&same(beyond,[m.door.x,m.door.y]))) return null;
      s.crates[crateIndex]=beyond;
    }
    s=leave(s,s.p); s={...s,p:next}; collect(s,m);
    return autoResolve(s,dx,dy);
  };

  const startKey=encode(start), queue=[start], prev=new Map([[startKey,[null,null]]]);
  for (let qi=0;qi<queue.length;qi++) {
    const s=queue[qi], key=encode(s);
    if (same(s.p,[m.exit.x,m.exit.y]) && s.shards===fullMask) {
      const moves=[]; let k=key;
      while (prev.get(k)[0] != null) { const [pk,ch]=prev.get(k); moves.push(ch); k=pk; }
      return {solution:moves.reverse().join(''),states:prev.size};
    }
    if (prev.size>maxStates) throw new Error(`room ${level.number}: solver exceeded ${maxStates} states`);
    for (const [dx,dy,ch] of DIRS) {
      const ns=step(s,dx,dy); if (!ns) continue;
      const nk=encode(ns);
      if (!prev.has(nk)) { prev.set(nk,[key,ch]); queue.push(ns); }
    }
  }
  return null;
}

function collect(state,m) {
  const key=posKey(...state.p);
  const shard=m.shardIndex.get(key);
  if (shard != null) state.shards |= 1 << shard;
  if (m.key && same(state.p,[m.key.x,m.key.y]) && !state.keyCollected) { state.keyCollected=true; state.keys++; }
}
function same(a,b){ return a?.[0]===b?.[0] && a?.[1]===b?.[1]; }

function replayFull(level, solution) {
  const grid=clone(level.grid), entities=clone(level.entities);
  const player=entities.find(e=>e.kind==='player'); let keys=0, turns=0;
  const tpA=findTile(grid,'teleportA'), tpB=findTile(grid,'teleportB');
  const at=(x,y,kind=null)=>entities.find(e=>e.x===x&&e.y===y&&(!kind||e.kind===kind));
  const allAt=(x,y)=>entities.filter(e=>e.x===x&&e.y===y);
  const remove=e=>{const i=entities.indexOf(e);if(i>=0)entities.splice(i,1);};
  const gateOpen=()=>entities.some(p=>p.kind==='plate'&&entities.some(e=>['crate','player'].includes(e.kind)&&e.x===p.x&&e.y===p.y));
  const blocked=(x,y,e=null,ghost=false)=>{
    if(x<=0||y<=0||x>=COLS-1||y>=ROWS-1)return true;
    if(!ghost&&['wall','broken'].includes(grid[y][x]))return true;
    return allAt(x,y).some(o=>o!==e&&(o.kind==='door'||o.kind==='crate'||(o.kind==='gate'&&!gateOpen())||(o.kind==='enemy'&&e?.kind==='enemy')));
  };
  const collectHere=()=>{for(const e of [...allAt(player.x,player.y)]){if(e.kind==='shard')remove(e);else if(e.kind==='key'){remove(e);keys++;}}};
  const leave=(x,y)=>{if(grid[y][x]==='fragile')grid[y][x]='broken';};
  const resolve=(dx,dy,depth=0)=>{
    if(depth>24)return false;
    const kind=grid[player.y][player.x];
    if(['hazard','spikes','broken'].includes(kind))return false;
    if(kind==='teleportA'||kind==='teleportB'){
      const target=kind==='teleportA'?tpB:tpA;
      if(target&&!blocked(target[0],target[1],player)){leave(player.x,player.y);player.x=target[0];player.y=target[1];collectHere();}
      return !['hazard','spikes','broken'].includes(grid[player.y][player.x]);
    }
    let auto=null;
    if(kind==='ice')auto=[dx,dy];
    if(kind==='conveyorRight')auto=[1,0];
    if(kind==='conveyorLeft')auto=[-1,0];
    if(kind==='conveyorUp')auto=[0,-1];
    if(kind==='conveyorDown')auto=[0,1];
    if(auto){const nx=player.x+auto[0],ny=player.y+auto[1];if(!blocked(nx,ny,player)&&!at(nx,ny,'enemy')&&!at(nx,ny,'crate')){leave(player.x,player.y);player.x=nx;player.y=ny;collectHere();return resolve(auto[0],auto[1],depth+1);}}
    return true;
  };
  const enemyCan=(e,x,y,ghost=false)=>!blocked(x,y,e,ghost)&&!allAt(x,y).some(o=>o!==e&&['enemy','crate','door'].includes(o.kind));
  const chase=(e,ghost=false)=>{const dx=Math.sign(player.x-e.x),dy=Math.sign(player.y-e.y);const opts=Math.abs(player.x-e.x)>=Math.abs(player.y-e.y)?[[dx,0],[0,dy]]:[[0,dy],[dx,0]];for(const[mx,my]of opts)if((mx||my)&&enemyCan(e,e.x+mx,e.y+my,ghost)){e.x+=mx;e.y+=my;return;}};
  const clearLine=(x1,y1,x2,y2)=>{const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);let x=x1+dx,y=y1+dy;while(x!==x2||y!==y2){if(['wall','broken'].includes(grid[y][x])||allAt(x,y).some(e=>e.kind==='crate'||e.kind==='door'||(e.kind==='gate'&&!gateOpen())))return false;x+=dx;y+=dy;}return true;};

  for(const ch of solution){
    const [dx,dy]=MOVE[ch]??[]; assert.ok(dx!=null,`room ${level.number}: invalid solution token ${ch}`);
    const nx=player.x+dx,ny=player.y+dy;
    if(['wall','broken'].includes(grid[ny]?.[nx]))return false;
    if(at(nx,ny,'gate')&&!gateOpen())return false;
    const door=at(nx,ny,'door');if(door){if(keys<=0)return false;keys--;remove(door);}
    const crate=at(nx,ny,'crate');if(crate){const bx=nx+dx,by=ny+dy;if(blocked(bx,by,crate)||allAt(bx,by).some(e=>['shard','key','exit','gate','door','enemy','crate'].includes(e.kind)))return false;crate.x=bx;crate.y=by;}
    if(at(nx,ny,'enemy'))return false;
    leave(player.x,player.y);player.x=nx;player.y=ny;collectHere();if(!resolve(dx,dy))return false;
    const turn=turns+1;
    for(const e of entities.filter(e=>e.kind==='enemy')){
      if(e.type==='turret')continue;
      if(e.type==='scarab'){let tx=e.x+(e.dir||1);if(!enemyCan(e,tx,e.y)){e.dir=-(e.dir||1);tx=e.x+e.dir;}if(enemyCan(e,tx,e.y))e.x=tx;}
      else if(e.type==='crawler'){let ty=e.y+(e.dir||1);if(!enemyCan(e,e.x,ty)){e.dir=-(e.dir||1);ty=e.y+e.dir;}if(enemyCan(e,e.x,ty))e.y=ty;}
      else if(e.type==='slime'){if((turn+(e.phase||0))%2===0)chase(e);}
      else if(e.type==='hopper'){if((turn+(e.phase||0))%2===0)for(let i=0;i<2;i++){let tx=e.x+(e.dir||1);if(!enemyCan(e,tx,e.y)){e.dir=-(e.dir||1);tx=e.x+e.dir;}if(enemyCan(e,tx,e.y))e.x=tx;}}
      else if(e.type==='ghost'){if((turn+(e.phase||0))%2===0)chase(e,true);}
      else if(e.type==='mimic'){if(Math.abs(e.x-player.x)+Math.abs(e.y-player.y)<=5)chase(e);}
      else if(e.type==='drone'){const dirs=[[1,0],[0,1],[-1,0],[0,-1]];const d=((e.phase||0)+turn)%4;for(let i=0;i<4;i++){const[mx,my]=dirs[(d+i)%4];if(enemyCan(e,e.x+mx,e.y+my)){e.x+=mx;e.y+=my;e.phase=(d+i)%4;break;}}}
      if(e.x===player.x&&e.y===player.y)return false;
    }
    turns++;
    for(const e of entities.filter(e=>e.kind==='enemy'&&e.type==='turret')){
      if((turns+(e.phase||0))%3!==0)continue;
      if(e.x===player.x&&clearLine(e.x,e.y,player.x,player.y))return false;
      if(e.y===player.y&&clearLine(e.x,e.y,player.x,player.y))return false;
    }
    if(['hazard','spikes','broken'].includes(grid[player.y][player.x]))return false;
  }
  return !entities.some(e=>e.kind==='shard') && !!at(player.x,player.y,'exit');
}

assert.equal(LEVELS.length,100,'campaign must contain exactly 100 rooms');
assert.equal(CHAPTERS.length,10,'campaign must contain ten chapters');
assert.equal(new Set(LEVELS.map(l=>l.name)).size,100,'room names must be unique');

const wallSignatures=[], criticalSignatures=[], solutions=new Set(), enemyCounts=new Map(), featureCounts=new Map();
const chapterTurns=Array.from({length:10},()=>[]);
for(let index=0;index<100;index++){
  const level=buildLevel(index);
  assert.equal(level.grid.length,ROWS,`room ${level.number}: row count`);
  assert.ok(level.grid.every(row=>row.length===COLS),`room ${level.number}: column count`);
  assert.equal(level.entities.filter(e=>e.kind==='player').length,1,`room ${level.number}: player`);
  assert.equal(level.entities.filter(e=>e.kind==='exit').length,1,`room ${level.number}: exit`);
  assert.equal(level.entities.filter(e=>e.kind==='shard').length,3,`room ${level.number}: shards`);
  assert.ok(level.designNote.includes(level.name),`room ${level.number}: unique design note`);
  assert.ok(level.intendedSolution.length===level.optimalTurns,`room ${level.number}: solution/par metadata`);
  const occupied=new Map();
  for(const e of level.entities){
    assert.ok(e.x>0&&e.y>0&&e.x<COLS-1&&e.y<ROWS-1,`room ${level.number}: ${e.kind} bounds`);
    assert.notEqual(level.grid[e.y][e.x],'wall',`room ${level.number}: ${e.kind} embedded in wall`);
    const k=posKey(e.x,e.y);occupied.set(k,[...(occupied.get(k)??[]),e.kind]);
    if(e.kind==='enemy')enemyCounts.set(e.type,(enemyCounts.get(e.type)??0)+1);
  }
  for(const [p,kinds] of occupied){const legal=kinds.every(k=>['player','crate','plate'].includes(k));assert.ok(kinds.length===1||legal,`room ${level.number}: overlap ${p} ${kinds}`);}
  for(const f of level.features)featureCounts.set(f,(featureCounts.get(f)??0)+1);
  wallSignatures.push(canonicalWallSignature(level));criticalSignatures.push(criticalSignature(level));solutions.add(level.intendedSolution);chapterTurns[level.chapter].push(level.optimalTurns);
  const solved=solvePuzzle(level);
  assert.ok(solved,`room ${level.number}: mechanically solvable`);
  assert.equal(solved.solution.length,level.optimalTurns,`room ${level.number}: stored optimum`);
  assert.ok(replayFull(level,level.intendedSolution),`room ${level.number}: verified route survives full enemy simulation`);
}
assert.equal(new Set(wallSignatures).size,100,'all wall topologies must be unique, including mirrored duplicates');
assert.equal(new Set(criticalSignatures).size,100,'all critical object layouts must be unique');
assert.equal(solutions.size,100,'all intended solution routes must be unique');
let nearest=1;
for(let i=0;i<wallSignatures.length;i++)for(let j=i+1;j<wallSignatures.length;j++)nearest=Math.min(nearest,hamming(wallSignatures[i],wallSignatures[j]));
assert.ok(nearest>=.16,`nearest wall topology is too similar: ${(nearest*100).toFixed(1)}% cell difference`);
for(const type of ['scarab','crawler','slime','hopper','turret','ghost','mimic','drone'])assert.ok((enemyCounts.get(type)??0)>=8,`${type} needs meaningful campaign representation`);
for(const feature of ['key','crate','gate','ice','conveyor','teleport','fragile'])assert.ok((featureCounts.get(feature)??0)>=10,`${feature} needs at least ten authored rooms`);
const averages=chapterTurns.map(values=>values.reduce((a,b)=>a+b,0)/values.length);
assert.ok(averages[0]<42&&averages[1]<44,'opening chapters should remain approachable');
assert.ok(averages.slice(6).every(v=>v>50),'late chapters should sustain advanced route length');
assert.ok(LEVELS.slice(80).filter(l=>l.features.length>=4).length>=4,'final chapters need multi-system synthesis rooms');

console.log(`✓ 100 explicit rooms; 100 wall topologies; 100 critical layouts; 100 unique solutions.`);
console.log(`✓ Minimum pairwise topology difference: ${(nearest*100).toFixed(1)}%.`);
console.log(`✓ Optimal route range: ${Math.min(...LEVELS.map(l=>l.optimalTurns))}–${Math.max(...LEVELS.map(l=>l.optimalTurns))} turns.`);
console.log(`✓ Full stored routes replay safely against all eight deterministic enemy families.`);
