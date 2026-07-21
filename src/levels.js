export const GRID_W = 13;
export const GRID_H = 9;

export const TILE = Object.freeze({
  FLOOR: 0, WALL: 1, EXIT: 2, DOOR: 3, PLATE: 4, GATE: 5,
  ICE: 6, SPIKE: 7, CONVEYOR_R: 8, CONVEYOR_L: 9,
  FRAGILE: 10, PIT: 11, TELEPORT_A: 12, TELEPORT_B: 13,
  WATER: 14, BRIDGE: 15
});

const palettes = [
  ['#10152d','#2b355e','#505e89','#ffd65c','#ff6d82'],
  ['#10281f','#31563c','#5f8a58','#f6d866','#ff7c73'],
  ['#10283c','#3a6684','#8fc9df','#dff9ff','#ff7895'],
  ['#2b1419','#65302e','#9d5236','#ffd56a','#ff5c56'],
  ['#111a35','#303f78','#5d72b2','#73f0ff','#ff65b0'],
  ['#1d1634','#4a3b65','#806a92','#f7d889','#b6d9ff'],
  ['#17152f','#37366e','#686bd0','#dbe3ff','#ff79c6'],
  ['#0b2734','#1e5a68','#3e8f9d','#8ff3e9','#ffcf6a'],
  ['#170f22','#3b2444','#6d365f','#e06c83','#ffc85f'],
  ['#15152d','#343669','#666ed0','#f9e96f','#ff66a8']
];

const worldData = [
  ['Clockwork Foyer','The museum wakes','Read patrols, collect Sparks, reach the lift.',108,[0,2,4,7,9]],
  ['Mosslight Conservatory','Keys grow on silver vines','Find the Sunkey before crossing sealed doors.',112,[0,2,3,5,7]],
  ['Glacier Gallery','Every push keeps moving','Push Prism crates onto pressure plates.',116,[0,2,5,7,9]],
  ['Ember Foundry','Heat makes haste dangerous','Use ice lanes and time the forge spikes.',120,[0,3,5,7,10]],
  ['Storm Laboratory','The floor has opinions','Ride conveyors between turret volleys.',124,[0,2,5,8,10]],
  ['Infinite Library','The past falls away behind you','Fragile pages collapse after one step.',104,[0,2,3,7,9]],
  ['Moonlit Orrery','Distance bends around starlight','Link teleport coils and outfox lunar hoppers.',96,[0,2,5,7,10]],
  ['Sunken Aquarium','Currents carry friend and foe','Use bridges and currents to cross the deep.',100,[0,2,4,7,9]],
  ['Obsidian Citadel','Baron Null stacks every trick','Combine locks, gates, hazards, and hostile patterns.',128,[0,1,3,6,8]],
  ['Prism Core','Restore the Heart','Master the whole vocabulary. Light wins through clarity.',132,[0,2,4,7,9]]
];

export const WORLDS = worldData.map((w,i)=>({
  id:i+1,name:w[0],tagline:w[1],brief:w[2],color:palettes[i][3],danger:palettes[i][4],palette:palettes[i],
  music:{tempo:w[3],root:48+i,scale:w[4]}
}));

const names = [
 ['First Light','Brass Footsteps','The Long Tick','Three Bright Things','Scarab Parade','Pendulum Alley','Lift Etiquette','Clockface Cross','The Waking Wing','Curator’s Test'],
 ['Green Key Morning','Vine-Locked','Fernway Fork','Sunkey Picnic','Orchid Door','Moss Maze','Glasshouse Loop','Root and Route','The Keeper’s Arbor','Blooming Lock'],
 ['Cold Push','Blue Momentum','Plate Practice','Frosted Freight','Crate Ballet','Mirror Ice','Two-Ton Snowflake','Gallery Glide','Pressure Below Zero','The Crystal Shove'],
 ['Warm Welcome','Cinder Step','Slip Past Sparks','Forge Rhythm','Heatwave Hall','Ice in the Furnace','Anvil Avenue','Red-Hot Shortcut','Bellows and Bravery','Heart of the Kiln'],
 ['Current Affairs','Belt and Bolt','Pink Lightning','Moving Target','Static Sprint','Coil Corridor','Thunder Conveyor','Drone Zone','Voltage Vault','Eye of the Lab'],
 ['One-Way Chapter','Quiet Stacks','Footnote Falling','Ghostwriter','Shelf Life','Index of Peril','The Missing Page','Mirror Reader','Last Copy','Infinite Checkout'],
 ['Near is Far','Twin Moons','Orbit Hop','Starlight Shortcut','Lunar Relay','Gravity’s Joke','Comet Crossing','Orrery Eight','Eclipse Route','The Silver Distance'],
 ['First Current','Glass Tunnel','Tide Table','Bridge Below','Jelly Drift','Deep End','Coral Circuit','Pressure Bubble','Abyssal Arcade','The Golden Current'],
 ['Black Gate','Null Patrol','Red Key Rising','Citadel Circuit','Every Trick Once','Shadow Copy','Tower of Teeth','The Baron’s Lock','Obsidian Gauntlet','Door to the Core'],
 ['Spectrum One','Sevenfold Step','Prism Relay','Light Against Null','Core Memory','Chromatic Chase','The Last Lock','Heart Chamber','Baron Null','Morning Returns']
];

const enemyByWorld = [
 ['scarab','crawler'],['slime','scarab'],['crawler','hopper'],['hopper','scarab'],['turret','drone'],
 ['ghost','mimic'],['hopper','ghost'],['slime','drone'],['turret','mimic','ghost'],['drone','turret','ghost','mimic']
];

function seeded(n){ let s=n>>>0; return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296); }
function key(p){return `${p.x},${p.y}`;}
function baseGrid(){
  const g=Array.from({length:GRID_H},()=>Array(GRID_W).fill(TILE.FLOOR));
  for(let x=0;x<GRID_W;x++){g[0][x]=g[GRID_H-1][x]=TILE.WALL;}
  for(let y=0;y<GRID_H;y++){g[y][0]=g[y][GRID_W-1]=TILE.WALL;}
  return g;
}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function carvePattern(g,seed){
  const r=seeded(seed);
  const cols=shuffle([3,5,7,9],r).slice(0,2+(seed%2));
  for(const x of cols){
    const gap=1+Math.floor(r()*7);
    for(let y=1;y<GRID_H-1;y++) if(y!==gap && y!==Math.min(7,gap+1)) g[y][x]=TILE.WALL;
  }
  return g;
}
function openRoute(g,start,exit){
  let x=start.x,y=start.y; g[y][x]=TILE.FLOOR;
  while(x!==exit.x){x+=Math.sign(exit.x-x);g[y][x]=TILE.FLOOR;}
  while(y!==exit.y){y+=Math.sign(exit.y-y);g[y][x]=TILE.FLOOR;}
}
function floorCells(g){const out=[];for(let y=1;y<GRID_H-1;y++)for(let x=1;x<GRID_W-1;x++)if(g[y][x]===TILE.FLOOR)out.push({x,y});return out;}
function pickCells(g,r,count,blocked){const cells=shuffle(floorCells(g).filter(p=>!blocked.has(key(p))),r);return cells.slice(0,count);}

function applyMechanics(level,world,local,r,blocked){
  const g=level.tiles, y=level.start.y;
  const place=(tile,n=1)=>{for(const p of pickCells(g,r,n,blocked)){g[p.y][p.x]=tile;blocked.add(key(p));}};
  if(world===1){g[y][6]=TILE.DOOR; level.keys=[{x:3,y}]; blocked.add(`3,${y}`);}
  if(world===2){g[y][6]=TILE.PLATE; g[y][9]=TILE.GATE; g[y][4]=TILE.FLOOR; level.crates=[{x:4,y}]; blocked.add(`4,${y}`); blocked.add(`6,${y}`);}
  if(world===3){for(const x of [4,5,6])g[y][x]=TILE.ICE;place(TILE.SPIKE,1+Math.floor(local/3));}
  if(world===4){
    for(const x of [4,5,6]) g[y][x]=TILE.CONVEYOR_R;
    if(local%2){const sideY=y<=4?Math.min(7,y+2):Math.max(1,y-2);for(const x of [7,8])if(g[sideY][x]===TILE.FLOOR)g[sideY][x]=TILE.CONVEYOR_L;}
  }
  if(world===5){for(const x of [4,5,6])g[y][x]=TILE.FRAGILE;}
  if(world===6){const a={x:3,y},b={x:8,y};g[a.y][a.x]=TILE.TELEPORT_A;g[b.y][b.x]=TILE.TELEPORT_B;blocked.add(key(a));blocked.add(key(b));}
  if(world===7){place(TILE.WATER,4+local%3);place(TILE.BRIDGE,2);}
  if(world===8){g[y][6]=TILE.DOOR;level.keys=[{x:3,y}];blocked.add(`3,${y}`);if(local>4)place(TILE.FRAGILE,2);if(local>7)place(TILE.PIT,1);if(local>6){g[y][8]=TILE.PLATE;g[y][9]=TILE.GATE;g[y][5]=TILE.FLOOR;level.crates=[{x:5,y}];blocked.add(`5,${y}`);}}
  if(world===9){
    if(local%2===0)for(const x of [4,5])g[y][x]=TILE.ICE; else for(const x of [4,5])g[y][x]=TILE.CONVEYOR_R;
    place(TILE.SPIKE,1+local%2);if(local>=5)place(TILE.PIT,1);if(local>=3){g[y][3]=TILE.TELEPORT_A;g[y][8]=TILE.TELEPORT_B;blocked.add(`3,${y}`);blocked.add(`8,${y}`);}
    if(local>=6){g[y][6]=TILE.DOOR;level.keys=[{x:2,y}];blocked.add(`2,${y}`);} if(local>=8)place(TILE.FRAGILE,2);
  }
}

function makeLevel(id){
  const world=Math.floor((id-1)/10), local=(id-1)%10, r=seeded(id*7919+17);
  const g=carvePattern(baseGrid(),id*31);
  const start={x:1,y:1+(id%7)}, exit={x:11,y:1+(id%7)};
  openRoute(g,start,exit); g[exit.y][exit.x]=TILE.EXIT;
  const blocked=new Set([key(start),key(exit)]);
  const level={id,world:world+1,chapter:WORLDS[world].name,name:names[world][local],par:28+world*3+local*2,start,exit,tiles:g,
    sparks:[],keys:[],crates:[],enemies:[],hint:'Collect all three Sparks, then enter the glowing lift.',route:[]};
  applyMechanics(level,world,local,r,blocked);
  const preferred=[{x:2,y:start.y},{x:7,y:start.y},{x:10,y:start.y}].filter(p=>!blocked.has(key(p))&&g[p.y][p.x]!==TILE.WALL); level.sparks=[...preferred,...pickCells(g,r,3-preferred.length,blocked)].slice(0,3); level.sparks.forEach(p=>blocked.add(key(p)));
  const roster=enemyByWorld[world]; const count=local<3?1:local<7?2:Math.min(4,roster.length);
  for(let i=0;i<count;i++){
    const p=pickCells(g,r,1,blocked)[0]; if(!p)break; blocked.add(key(p));
    level.enemies.push({type:roster[(local+i)%roster.length],x:p.x,y:p.y,dir:(i+local)%4,phase:i%2});
  }
  level.route=[start,...level.sparks,exit];
  if(world===1)level.hint='The Sunkey opens the sealed door. Order matters.';
  if(world===2)level.hint='Push the Prism crate onto the plate; pull is impossible.';
  if(world===3)level.hint='Ice carries you until the next solid tile.';
  if(world===4)level.hint='Conveyors move after your step. Turrets fire every third turn.';
  if(world===5)level.hint='Fragile tiles collapse after you leave them.';
  if(world===6)level.hint='Cyan and magenta coils are paired.';
  if(world===7)level.hint='Water is lethal; bridges are safe.';
  if(world===8)level.hint='Solve one dependency at a time. Undo is part of the plan.';
  if(world===9)level.hint='Every gallery taught a rule. Combine them calmly.';
  return level;
}

export const LEVELS = Array.from({length:100},(_,i)=>makeLevel(i+1));
export const getLevel = id => LEVELS[Math.max(0,Math.min(99,id-1))];
