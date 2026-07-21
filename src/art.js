export const COLORS = {
  ink:'#080b19', cream:'#fff1c2', gold:'#f5be3f', cyan:'#48dcff', coral:'#ff5b69', violet:'#9b5eff', mint:'#5ae191', white:'#ffffff', muted:'#a9b7d8'
};

let ART_ASSETS = {};
const THEME_INDEX = Object.freeze({gear:0,garden:1,ice:2,foundry:3,storm:4,library:5,moon:6,aquarium:7,citadel:8,prism:9});
const ENEMY_ROW = Object.freeze({scarab:0,crawler:1,slime:2,hopper:3,turret:4,drone:5,mimic:6,ghost:7});

export function bindArtAssets(assets={}) { ART_ASSETS = assets; }
function ready(image){ return !!image?.complete && image.naturalWidth > 0; }
function atlasFrame(ctx,image,index,cols,cellW,cellH,x,y,w,h,flip=false,alpha=1){
  if(!ready(image)) throw new Error('Required production atlas is unavailable.');
  const sx=(index%cols)*cellW, sy=Math.floor(index/cols)*cellH;
  ctx.save(); ctx.globalAlpha*=alpha;
  if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(image,sx,sy,cellW,cellH,0,0,w,h);}
  else ctx.drawImage(image,sx,sy,cellW,cellH,x,y,w,h);
  ctx.restore(); return true;
}

export function rr(ctx,x,y,w,h,r){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.roundRect(x,y,w,h,q);}
export function fillStroke(ctx,fill,stroke=COLORS.ink,line=3){ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
export function text(ctx,value,x,y,size,color='#fff',align='left',weight=800,font='ui-rounded, Trebuchet MS, system-ui'){ctx.save();ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.restore();}
export function shadowText(ctx,value,x,y,size,color='#fff',align='center',weight=900){ctx.save();ctx.font=`${weight} ${size}px ui-rounded, Trebuchet MS, system-ui`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*.12);ctx.strokeStyle=COLORS.ink;ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.restore();}
export function fittedText(ctx,value,x,y,maxWidth,size,color='#fff',align='left',weight=800,minSize=10){
  let fitted=size;ctx.save();
  while(fitted>minSize){ctx.font=`${weight} ${fitted}px ui-rounded, Trebuchet MS, system-ui`;if(ctx.measureText(String(value)).width<=maxWidth)break;fitted-=1;}
  ctx.restore();text(ctx,value,x,y,fitted,color,align,weight);return fitted;
}
export function divider(ctx,x,y,w,color='rgba(255,255,255,.18)'){
  ctx.save();const g=ctx.createLinearGradient(x,y,x+w,y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.16,color);g.addColorStop(.84,color);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x,y,w,1);ctx.restore();
}
export function pill(ctx,x,y,w,h,label,accent=COLORS.cyan,opts={}){
  ctx.save();rr(ctx,x,y,w,h,h/2);ctx.fillStyle=opts.fill??'rgba(9,14,38,.78)';ctx.fill();ctx.strokeStyle=opts.stroke??accent;ctx.globalAlpha=.92;ctx.lineWidth=opts.line??2;ctx.stroke();ctx.globalAlpha=1;fittedText(ctx,label,x+w/2,y+h/2,w-20,opts.size??12,opts.color??COLORS.cream,'center',opts.weight??900,9);ctx.restore();
}
export function statCard(ctx,x,y,w,h,label,value,accent=COLORS.cyan,detail=''){
  ctx.save();rr(ctx,x,y,w,h,15);ctx.fillStyle='rgba(8,13,34,.78)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=accent;rr(ctx,x,y,5,h,3);ctx.fill();text(ctx,label,x+17,y+17,10,'rgba(255,255,255,.58)','left',900);fittedText(ctx,String(value),x+17,y+42,w-34,22,COLORS.cream,'left',1000,14);if(detail)fittedText(ctx,detail,x+w-14,y+h-14,w*.5,10,accent,'right',900,8);ctx.restore();
}

export function panel(ctx,x,y,w,h,fill='rgba(20,28,64,.92)',stroke='rgba(255,255,255,.18)',r=22){
  ctx.save();ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=24;ctx.shadowOffsetY=10;
  atlasFrame(ctx,ART_ASSETS.uiAtlas,0,4,320,160,x,y,w,h);
  ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.30;ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  rr(ctx,x+.75,y+.75,w-1.5,h-1.5,r);ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
  rr(ctx,x+7,y+7,w-14,h-14,Math.max(8,r-7));ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.stroke();
  const gloss=ctx.createLinearGradient(0,y,0,y+Math.min(100,h));gloss.addColorStop(0,'rgba(255,255,255,.10)');gloss.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gloss;rr(ctx,x+8,y+8,w-16,Math.min(86,h-16),Math.max(8,r-8));ctx.fill();
  ctx.restore();
}

export function drawBackdrop(ctx,theme,t,state='game'){
  const idx=THEME_INDEX[theme.theme]??0;
  const image=ART_ASSETS.backdrops?.[idx];
  if(!ready(image)) throw new Error(`Required chapter backdrop ${idx+1} is unavailable.`);
  ctx.drawImage(image,0,0,1280,720);
  ctx.save();
  const accent=theme.accent||COLORS.cyan;
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<28;i++){
    const x=(i*173+t*(i%2?8:-7)+idx*41)%1420-70;
    const y=48+(i*79+idx*29)%620;
    ctx.globalAlpha=.11+(i%4)*.025;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x,y,2+(i%3),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  if(state==='title'){
    const g=ctx.createLinearGradient(0,0,0,720);g.addColorStop(0,'rgba(4,7,20,.05)');g.addColorStop(1,'rgba(4,7,20,.55)');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
  }
}

export function drawTile(ctx,kind,x,y,s,theme,t){
  const idx=THEME_INDEX[theme.theme]??0;
  atlasFrame(ctx,ART_ASSETS.tileSprites,(kind==='wall'?10:0)+idx,10,128,128,x,y,s,s);
  if(kind==='wall') return;
  const map={spikes:15,ice:9,fragile:13,broken:14,teleportA:11,teleportB:12};
  if(map[kind]!=null){
    ctx.save();
    if(kind==='teleportA'||kind==='teleportB'){ctx.translate(x+s/2,y+s/2);ctx.rotate((kind==='teleportA'?1:-1)*Math.sin(t)*.08);atlasFrame(ctx,ART_ASSETS.objectSprites,map[kind],5,160,160,-s*.58,-s*.58,s*1.16,s*1.16);}
    else atlasFrame(ctx,ART_ASSETS.objectSprites,map[kind],5,160,160,x-s*.08,y-s*.08,s*1.16,s*1.16);
    ctx.restore();return;
  }
  if(kind.startsWith('conveyor')){
    ctx.save();ctx.translate(x+s/2,y+s/2);const d=kind.replace('conveyor','').toLowerCase();if(d==='down')ctx.rotate(Math.PI/2);if(d==='left')ctx.rotate(Math.PI);if(d==='up')ctx.rotate(-Math.PI/2);atlasFrame(ctx,ART_ASSETS.objectSprites,8,5,160,160,-s*.58,-s*.58,s*1.16,s*1.16);ctx.restore();return;
  }
  if(kind==='hazard'){
    const f=6;ctx.save();ctx.globalCompositeOperation='screen';atlasFrame(ctx,ART_ASSETS.vfxSprites,f,4,160,160,x-s*.15,y-s*.15,s*1.3,s*1.3,false,.86);ctx.restore();
  }
}

export function drawHero(ctx,x,y,s,t,dir={x:1,y:0},mood='ready'){
  const special=mood==='heroic'||mood==='victory';
  const defeated=mood==='defeat';
  const hurt=mood==='hurt';
  const moving=mood==='moving';
  const frame=special?18+(Math.floor(t*3)%4):defeated?23:hurt?22:moving?6+(Math.floor(t*10)%6):(Math.floor(t*4)%6);
  ctx.save();ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
  atlasFrame(ctx,ART_ASSETS.heroSprites,frame,6,160,160,x-s*.18,y-s*.22,s*1.36,s*1.36,dir.x<0);
  ctx.restore();
}

export function drawEnemy(ctx,e,x,y,s,t){
  const row=ENEMY_ROW[e.type]??0;const frame=Math.floor(t*(e.type==='turret'?3:7)+(e.phase??0))%4;const index=row*4+frame;const flip=(e.dir??1)<0;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
  atlasFrame(ctx,ART_ASSETS.enemySprites,index,4,160,160,x-s*.2,y-s*.2,s*1.4,s*1.4,flip);
  ctx.restore();
}

export function drawEntity(ctx,e,x,y,s,t,theme,active=true){
  if(e.kind==='player') return drawHero(ctx,x,y,s,t,e.dirVec||e.dir||{x:1,y:0},e.motion?'moving':e.mood);
  if(e.kind==='enemy') return drawEnemy(ctx,e,x,y,s,t);
  if(e.kind==='shard'){
    const frame=(e.variant??0)%4,pulse=1+Math.sin(t*5+(e.variant??0))*.06;ctx.save();ctx.translate(x+s/2,y+s/2);ctx.rotate(Math.sin(t*.8+(e.variant??0))*.12);ctx.shadowColor=theme.accent;ctx.shadowBlur=18;atlasFrame(ctx,ART_ASSETS.collectibleSprites,frame,4,160,160,-s*.52*pulse,-s*.52*pulse,s*1.04*pulse,s*1.04*pulse);ctx.restore();return;
  }
  if(e.kind==='key'){atlasFrame(ctx,ART_ASSETS.collectibleSprites,4+(e.variant??0)%4,4,160,160,x-s*.12,y-s*.12,s*1.24,s*1.24);return;}
  const themeIndex=THEME_INDEX[theme.theme]??0;
  const map={crate:themeIndex%2,plate:active?17:5,gate:6,door:7,exit:active?3:10};
  const idx=map[e.kind];
  if(idx!=null){ctx.save();if(e.kind==='exit'&&!active)ctx.globalAlpha=.48;if(e.kind==='plate'&&active){ctx.shadowColor=COLORS.gold;ctx.shadowBlur=16;}atlasFrame(ctx,ART_ASSETS.objectSprites,idx,5,160,160,x-s*.13,y-s*.13,s*1.26,s*1.26);ctx.restore();}
}

export function drawButton(ctx,b,hover=false,pressed=false){
  const disabled=!!b.disabled;const active=hover&&!disabled;const lift=pressed?1:active?-3:0;
  ctx.save();ctx.translate(0,lift);ctx.globalAlpha=disabled?.48:1;ctx.shadowColor=disabled?'transparent':'rgba(0,0,0,.40)';ctx.shadowBlur=active?22:16;ctx.shadowOffsetY=pressed?4:8;
  atlasFrame(ctx,ART_ASSETS.uiAtlas,active?3:2,4,320,160,b.x,b.y,b.w,b.h);
  if(b.fill){const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);g.addColorStop(0,b.fill);g.addColorStop(1,b.fill2??b.fill);ctx.globalCompositeOperation='source-atop';ctx.globalAlpha*=active?.58:.42;ctx.fillStyle=g;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=disabled?.48:1;}
  if(b.focused&&!disabled){ctx.shadowColor=b.accent??COLORS.cyan;ctx.shadowBlur=12;ctx.strokeStyle=b.accent??COLORS.cyan;ctx.lineWidth=3;rr(ctx,b.x-4,b.y-4,b.w+8,b.h+8,19);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1;rr(ctx,b.x-1,b.y-1,b.w+2,b.h+2,17);ctx.stroke();}
  fittedText(ctx,b.label,b.x+b.w/2,b.y+b.h/2+1,b.w-24,b.size||24,disabled?'#7f879f':active?COLORS.ink:'#fff','center',900,10);ctx.restore();
}

export function drawLogo(ctx,x,y,scale=1){
  if(!ready(ART_ASSETS.logo))throw new Error('Required production logo is unavailable.');const w=560*scale,h=202*scale;ctx.save();ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=18;ctx.drawImage(ART_ASSETS.logo,x-w/2,y-h/2,w,h);ctx.restore();
}

export function drawKeyArt(ctx,t,theme){if(!ready(ART_ASSETS.keyArt))throw new Error('Required production key art is unavailable.');ctx.drawImage(ART_ASSETS.keyArt,0,0,1600,900,0,0,1280,720);}

export function drawComicPanel(ctx,x,y,w,h,index,t){
  const image=ART_ASSETS[`comic${index+1}`];if(!ready(image))throw new Error(`Required comic panel ${index+1} is unavailable.`);ctx.save();rr(ctx,x,y,w,h,12);ctx.clip();ctx.drawImage(image,0,0,1280,500,x,y,w,h);ctx.restore();ctx.strokeStyle=COLORS.ink;ctx.lineWidth=6;rr(ctx,x,y,w,h,12);ctx.stroke();
}
