import assert from 'node:assert/strict';
import {LEVELS,WORLDS,GRID_W,GRID_H,TILE} from '../src/levels.js';
const K=p=>`${p.x},${p.y}`; const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
function reachable(l){const q=[l.start],seen=new Set([K(l.start)]);while(q.length){const p=q.shift();for(const[dX,dY]of dirs){const x=p.x+dX,y=p.y+dY;if(x<0||y<0||x>=GRID_W||y>=GRID_H||seen.has(`${x},${y}`))continue;const t=l.tiles[y][x];if([TILE.WALL,TILE.WATER,TILE.PIT].includes(t))continue;seen.add(`${x},${y}`);q.push({x,y});}}return seen;}
assert.equal(WORLDS.length,10);assert.equal(LEVELS.length,100);assert.equal(new Set(LEVELS.map(l=>l.name)).size,100);
for(const l of LEVELS){assert.equal(l.tiles.length,GRID_H);l.tiles.forEach(r=>assert.equal(r.length,GRID_W));assert.equal(l.sparks.length,3);assert.ok(l.par>20);const seen=reachable(l);for(const p of [l.exit,...l.sparks,...l.keys])assert.ok(seen.has(K(p)),`level ${l.id}: objective unreachable`);const all=[l.start,l.exit,...l.sparks,...l.keys,...l.crates,...l.enemies];const occ=new Set();for(const p of all){assert.ok(p.x>0&&p.y>0&&p.x<GRID_W-1&&p.y<GRID_H-1);assert.notEqual(l.tiles[p.y][p.x],TILE.WALL);assert.ok(!occ.has(K(p)),`level ${l.id}: overlap ${K(p)}`);occ.add(K(p));}}
const enemies=new Set(LEVELS.flatMap(l=>l.enemies.map(e=>e.type)));for(const e of ['scarab','crawler','slime','hopper','turret','ghost','mimic','drone'])assert.ok(enemies.has(e));
console.log(`Validated ${LEVELS.length} rooms, ${WORLDS.length} worlds, and ${enemies.size} enemy families.`);
